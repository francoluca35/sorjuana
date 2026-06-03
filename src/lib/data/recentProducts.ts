import { createClient } from '@/lib/supabase/server';
import {
	normalizeProductRow,
	parseCategoryPathSegments,
	type ProductRow,
} from '@/lib/data/productCatalog';

export type { ProductRow } from '@/lib/data/productCatalog';

const PANEL_SELECT =
	'id,name,category,price,compare_at_price,image_url,created_at,kind,stock,cost,base_price,transfer_price,final_transfer_price,cash_discount_percent,transfer_discount_percent,tax_applies,tax_percent,description,color,product_code,image_urls,video_url,min_order_qty,max_order_qty,size_inventory,is_hidden';

const PANEL_SELECT_LEGACY =
	'id,name,category,price,compare_at_price,image_url,created_at,kind,stock,cost,base_price,tax_applies,tax_percent,description,color,product_code,image_urls,video_url,min_order_qty,max_order_qty,size_inventory,is_hidden';

const PANEL_SELECT_NO_HIDDEN =
	'id,name,category,price,compare_at_price,image_url,created_at,kind,stock,cost,base_price,transfer_price,final_transfer_price,cash_discount_percent,transfer_discount_percent,tax_applies,tax_percent,description,color,product_code,image_urls,video_url,min_order_qty,max_order_qty,size_inventory';

const PANEL_SELECT_LEGACY_NO_HIDDEN =
	'id,name,category,price,compare_at_price,image_url,created_at,kind,stock,cost,base_price,tax_applies,tax_percent,description,color,product_code,image_urls,video_url,min_order_qty,max_order_qty,size_inventory';

function missingColorColumn(message: string): boolean {
	return (
		message.includes('column products.color does not exist') ||
		message.includes('column "color" does not exist') ||
		message.includes("Could not find the 'color' column of 'products' in the schema cache")
	);
}

function missingNewPriceColumns(message: string): boolean {
	return (
		message.includes('column products.transfer_price does not exist') ||
		message.includes('column "transfer_price" does not exist') ||
		message.includes("Could not find the 'transfer_price' column of 'products' in the schema cache") ||
		message.includes('column products.final_transfer_price does not exist') ||
		message.includes('column "final_transfer_price" does not exist') ||
		message.includes("Could not find the 'final_transfer_price' column of 'products' in the schema cache")
	);
}

function missingDiscountSnapshotColumns(message: string): boolean {
	return (
		message.includes('column products.cash_discount_percent does not exist') ||
		message.includes('column "cash_discount_percent" does not exist') ||
		message.includes("Could not find the 'cash_discount_percent' column of 'products' in the schema cache") ||
		message.includes('column products.transfer_discount_percent does not exist') ||
		message.includes('column "transfer_discount_percent" does not exist') ||
		message.includes("Could not find the 'transfer_discount_percent' column of 'products' in the schema cache")
	);
}

function missingHiddenColumn(message: string): boolean {
	return (
		message.includes('column products.is_hidden does not exist') ||
		message.includes('column "is_hidden" does not exist') ||
		message.includes("Could not find the 'is_hidden' column of 'products' in the schema cache")
	);
}

function stripHiddenFromSelect(selectStr: string): string {
	return selectStr.replace(',is_hidden', '');
}

function selectHasHiddenColumn(selectStr: string): boolean {
	return selectStr.includes('is_hidden');
}

type StorefrontQueryOptions = {
	/** Panel admin: incluye productos ocultos */
	includeHidden?: boolean;
};

function applyStorefrontVisibility<T extends { eq: (col: string, val: boolean) => T }>(
	query: T,
	selectStr: string,
	options?: StorefrontQueryOptions,
): T {
	if (options?.includeHidden || !selectHasHiddenColumn(selectStr)) return query;
	return query.eq('is_hidden', false);
}

/** Resuelve la lista de columnas compatible con el esquema actual (migraciones progresivas). */
async function resolvePanelSelectString(): Promise<string | null> {
	const supabase = await createClient();
	const probe = (selectStr: string) =>
		supabase.from('products').select(selectStr).order('created_at', { ascending: false }).limit(1);

	let { error } = await probe(PANEL_SELECT);
	if (!error) return PANEL_SELECT;

	if (missingColorColumn(error.message)) {
		const withoutColor = PANEL_SELECT.replace(',color', '');
		const { error: e2 } = await probe(withoutColor);
		if (!e2) return withoutColor;
		error = e2;
	}

	if (missingNewPriceColumns(error.message)) {
		const { error: e3 } = await probe(PANEL_SELECT_LEGACY);
		if (!e3) return PANEL_SELECT_LEGACY;
		if (missingColorColumn(e3.message)) {
			const withoutColor = PANEL_SELECT_LEGACY.replace(',color', '');
			const { error: e4 } = await probe(withoutColor);
			if (!e4) return withoutColor;
			console.error('[resolvePanelSelectString]', e4.message);
			return null;
		}
		console.error('[resolvePanelSelectString]', e3.message);
		return null;
	}

	if (missingDiscountSnapshotColumns(error.message)) {
		const withoutSnapshots = PANEL_SELECT.replace(',cash_discount_percent,transfer_discount_percent', '');
		const { error: e5 } = await probe(withoutSnapshots);
		if (!e5) return withoutSnapshots;
		error = e5;
	}

	if (missingHiddenColumn(error.message)) {
		const withoutHidden = stripHiddenFromSelect(PANEL_SELECT);
		const { error: e6 } = await probe(withoutHidden);
		if (!e6) return withoutHidden;
		if (missingColorColumn(e6.message)) {
			const withoutBoth = stripHiddenFromSelect(PANEL_SELECT).replace(',color', '');
			const { error: e7 } = await probe(withoutBoth);
			if (!e7) return withoutBoth;
		}
		if (missingNewPriceColumns(e6.message)) {
			const legacyNoHidden = PANEL_SELECT_LEGACY_NO_HIDDEN;
			const { error: e8 } = await probe(legacyNoHidden);
			if (!e8) return legacyNoHidden;
		}
		error = e6;
	}

	console.error('[resolvePanelSelectString]', error.message);
	return null;
}

function mapRows(data: unknown[] | null): ProductRow[] {
	return (data ?? []).map((raw) => normalizeProductRow(raw as unknown as Record<string, unknown>));
}

const STOREFRONT_CATALOG_FILTERED_CAP = 2500;

/** Slug seguro para filtros PostgREST (`category.eq.…`, `ilike`, etc.). */
function sanitizeCategorySlugParam(raw: string | undefined): string | null {
	if (!raw?.trim()) return null;
	const s = raw.trim().toLowerCase();
	if (!/^[a-z0-9_-]{1,64}$/.test(s)) return null;
	return s;
}

async function fetchShopParentSlugSet(
	supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
	const { data, error } = await supabase.from('shop_categories').select('slug');
	if (error || !data?.length) return new Set();
	const out = new Set<string>();
	for (const row of data as { slug?: string }[]) {
		const sl = String(row.slug ?? '')
			.trim()
			.toLowerCase();
		if (sl) out.add(sl);
	}
	return out;
}

async function fetchShopSubcategorySlugSet(
	supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
	const { data, error } = await supabase.from('shop_subcategories').select('slug');
	if (error || !data?.length) return new Set();
	const out = new Set<string>();
	for (const row of data as { slug?: string }[]) {
		const sl = String(row.slug ?? '')
			.trim()
			.toLowerCase();
		if (sl) out.add(sl);
	}
	return out;
}

/** Misma semántica que el catálogo cliente: slug en cualquier segmento bajo la línea o categoría única. */
function categoryPathMatchesTipoSlug(category: string | null | undefined, tipoSlug: string): boolean {
	const parts = parseCategoryPathSegments(category);
	if (!tipoSlug || parts.length === 0) return false;
	if (parts.length === 1) return parts[0] === tipoSlug;
	return parts.slice(1).some((seg) => seg === tipoSlug);
}

const SUBSLUG_SCAN_PAGE = 800;
const SUBSLUG_SCAN_MAX_ROWS = 50_000;

/**
 * Evita `.or()` con varios `ilike` y `%` (PostgREST a veces devuelve error o 0 filas).
 * Pagina `products` y filtra en memoria por segmentos de ruta.
 */
async function fetchProductsMatchingSubslugPaginated(
	selectStr: string,
	tipoSlug: string,
	options?: StorefrontQueryOptions,
): Promise<ProductRow[]> {
	const supabase = await createClient();
	const out: ProductRow[] = [];
	let from = 0;
	for (;;) {
		if (from >= SUBSLUG_SCAN_MAX_ROWS) break;
		let query = supabase
			.from('products')
			.select(selectStr)
			.order('created_at', { ascending: false })
			.range(from, from + SUBSLUG_SCAN_PAGE - 1);
		query = applyStorefrontVisibility(query, selectStr, options);
		const { data, error } = await query;
		if (error) {
			console.error('[fetchProductsMatchingSubslugPaginated]', error.message);
			break;
		}
		const chunk = mapRows(data);
		if (chunk.length === 0) break;
		for (const row of chunk) {
			if (categoryPathMatchesTipoSlug(row.category, tipoSlug)) out.push(row);
		}
		if (chunk.length < SUBSLUG_SCAN_PAGE) break;
		from += SUBSLUG_SCAN_PAGE;
	}
	return out;
}

/**
 * Catálogo público: sin query devuelve los últimos 500; con `filter` y/o `categoria`
 * consulta en base a rutas `products.category` (p. ej. `italiano/pantalones`) para no
 * depender de que los pantalones estén entre los N más recientes.
 */
export async function fetchStorefrontCatalogRows(params: {
	categoria?: string;
	filter?: string;
}): Promise<ProductRow[]> {
	const c = sanitizeCategorySlugParam(params.categoria);
	const f = sanitizeCategorySlugParam(params.filter);
	const hasAxis = Boolean(c || f);
	if (!hasAxis) {
		return fetchRecentProducts(500);
	}
	try {
		const selectStr = await resolvePanelSelectString();
		if (!selectStr) return [];
		const supabase = await createClient();
		const parentSet = await fetchShopParentSlugSet(supabase);
		const subSlugSet = await fetchShopSubcategorySlugSet(supabase);

		let lineSlug: string | null = f || null;
		let tipoSlug: string | null = null;

		if (c) {
			if (subSlugSet.has(c)) {
				tipoSlug = c;
			} else if (parentSet.has(c)) {
				if (!lineSlug) lineSlug = c;
			} else {
				tipoSlug = c;
			}
		}

		if (lineSlug && tipoSlug) {
			let query = supabase
				.from('products')
				.select(selectStr)
				.or(`category.eq.${lineSlug}/${tipoSlug},category.ilike.${lineSlug}/${tipoSlug}/%`)
				.order('created_at', { ascending: false })
				.limit(STOREFRONT_CATALOG_FILTERED_CAP);
			query = applyStorefrontVisibility(query, selectStr);
			const { data, error } = await query;
			if (error) {
				console.error('[fetchStorefrontCatalogRows]', error.message);
				return [];
			}
			return mapRows(data);
		}

		if (lineSlug) {
			let query = supabase
				.from('products')
				.select(selectStr)
				.or(`category.eq.${lineSlug},category.ilike.${lineSlug}/%`)
				.order('created_at', { ascending: false })
				.limit(STOREFRONT_CATALOG_FILTERED_CAP);
			query = applyStorefrontVisibility(query, selectStr);
			const { data, error } = await query;
			if (error) {
				console.error('[fetchStorefrontCatalogRows]', error.message);
				return [];
			}
			return mapRows(data);
		}

		if (tipoSlug) {
			return fetchProductsMatchingSubslugPaginated(selectStr, tipoSlug);
		}

		return fetchRecentProducts(500);
	} catch (e) {
		console.error('[fetchStorefrontCatalogRows]', e);
		return [];
	}
}

/**
 * Productos más recientes primero (por `created_at` descendente).
 * Solo importar este módulo desde Server Components o Server Actions (usa `next/headers`).
 */
export async function fetchRecentProducts(
	limit = 12,
	options?: StorefrontQueryOptions,
): Promise<ProductRow[]> {
	try {
		const selectStr = await resolvePanelSelectString();
		if (!selectStr) return [];
		const supabase = await createClient();
		const normalizedLimit = Math.min(Math.max(limit, 1), 500);
		let query = supabase
			.from('products')
			.select(selectStr)
			.order('created_at', { ascending: false })
			.limit(normalizedLimit);
		query = applyStorefrontVisibility(query, selectStr, options);
		const { data, error } = await query;
		if (error) {
			console.error('[fetchRecentProducts]', error.message);
			return [];
		}
		return mapRows(data);
	} catch (e) {
		console.error('[fetchRecentProducts]', e);
		return [];
	}
}

const ALL_PRODUCTS_PAGE = 1000;

/**
 * Catálogo completo para paneles de administración (p. ej. mapa de página «Recién llegados»).
 * Pagina en bloques para superar el límite de filas por consulta.
 */
export async function fetchAllProductsForPanel(): Promise<ProductRow[]> {
	try {
		const selectStr = await resolvePanelSelectString();
		if (!selectStr) return [];
		const supabase = await createClient();
		const all: ProductRow[] = [];
		let from = 0;
		for (;;) {
			let query = supabase
				.from('products')
				.select(selectStr)
				.order('created_at', { ascending: false })
				.range(from, from + ALL_PRODUCTS_PAGE - 1);
			query = applyStorefrontVisibility(query, selectStr, { includeHidden: true });
			const { data, error } = await query;
			if (error) {
				console.error('[fetchAllProductsForPanel]', error.message);
				break;
			}
			const chunk = mapRows(data);
			if (chunk.length === 0) break;
			all.push(...chunk);
			if (chunk.length < ALL_PRODUCTS_PAGE) break;
			from += ALL_PRODUCTS_PAGE;
		}
		return all;
	} catch (e) {
		console.error('[fetchAllProductsForPanel]', e);
		return [];
	}
}

/** Filas por id (p. ej. selección «Recién llegados» que no entró en el lote reciente del SSR). */
export async function fetchProductsByIds(
	ids: string[],
	options?: StorefrontQueryOptions,
): Promise<ProductRow[]> {
	const uniq = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))];
	if (uniq.length === 0) return [];
	try {
		const selectStr = await resolvePanelSelectString();
		if (!selectStr) return [];
		const supabase = await createClient();
		let query = supabase.from('products').select(selectStr).in('id', uniq);
		query = applyStorefrontVisibility(query, selectStr, options);
		const { data, error } = await query;
		if (error) {
			console.error('[fetchProductsByIds]', error.message);
			return [];
		}
		return mapRows(data);
	} catch (e) {
		console.error('[fetchProductsByIds]', e);
		return [];
	}
}

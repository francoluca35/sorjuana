import { createClient } from '@/lib/supabase/server';
import { normalizeProductRow, type ProductRow } from '@/lib/data/productCatalog';

export type { ProductRow } from '@/lib/data/productCatalog';

const PANEL_SELECT =
	'id,name,category,price,compare_at_price,image_url,created_at,kind,stock,cost,base_price,transfer_price,final_transfer_price,tax_applies,tax_percent,description,color,product_code,image_urls,video_url,min_order_qty,max_order_qty,size_inventory';

const PANEL_SELECT_LEGACY =
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

	console.error('[resolvePanelSelectString]', error.message);
	return null;
}

function mapRows(data: unknown[] | null): ProductRow[] {
	return (data ?? []).map((raw) => normalizeProductRow(raw as unknown as Record<string, unknown>));
}

/**
 * Productos más recientes primero (por `created_at` descendente).
 * Solo importar este módulo desde Server Components o Server Actions (usa `next/headers`).
 */
export async function fetchRecentProducts(limit = 12): Promise<ProductRow[]> {
	try {
		const selectStr = await resolvePanelSelectString();
		if (!selectStr) return [];
		const supabase = await createClient();
		const normalizedLimit = Math.min(Math.max(limit, 1), 500);
		const { data, error } = await supabase
			.from('products')
			.select(selectStr)
			.order('created_at', { ascending: false })
			.limit(normalizedLimit);
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
			const { data, error } = await supabase
				.from('products')
				.select(selectStr)
				.order('created_at', { ascending: false })
				.range(from, from + ALL_PRODUCTS_PAGE - 1);
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
export async function fetchProductsByIds(ids: string[]): Promise<ProductRow[]> {
	const uniq = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))];
	if (uniq.length === 0) return [];
	try {
		const selectStr = await resolvePanelSelectString();
		if (!selectStr) return [];
		const supabase = await createClient();
		const { data, error } = await supabase.from('products').select(selectStr).in('id', uniq);
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

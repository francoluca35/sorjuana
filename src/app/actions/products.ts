'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import type { ProductRow } from '@/lib/data/productCatalog';
import {
	fetchAllProductsForPanel,
	fetchProductsByIds,
	fetchRecentProducts,
	fetchStorefrontCatalogPage,
	STOREFRONT_CATALOG_PAGE_SIZE,
} from '@/lib/data/recentProducts';
import { BEST_SELLERS_MAX } from '@/lib/bestSellersSelection';
import { RECENT_ARRIVALS_MAX } from '@/lib/recentArrivalsSelection';
import * as XLSX from 'xlsx';
import {
	normalizeSizeInventoryForDb,
	sumSizeInventoryQty,
	type SizeInventoryRow,
} from '@/lib/data/productSizes';
import {
	ensureShopCategoryPathForImport,
	revalidateShopCategoryPaths,
} from '@/app/actions/shopCategories';
import { MAX_PRODUCT_GALLERY_IMAGES } from '@/lib/productMediaLimits';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function filterValidProductIds(ids: string[]): string[] {
	return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))].filter((id) => UUID_RE.test(id));
}

async function requireAuthenticatedPanelUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { ok: false as const, message: 'Iniciá sesión para continuar.' };
	}
	return { ok: true as const, supabase, user };
}

function filterStoredProductIds(raw: unknown, max: number, exclude: Set<string>): string[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
		.map((x) => x.trim())
		.filter((id) => !exclude.has(id))
		.slice(0, max);
}

async function removeProductIdsFromSiteHomeConfig(removedIds: string[]): Promise<void> {
	if (removedIds.length === 0) return;
	const exclude = new Set(removedIds);
	let supabase;
	try {
		supabase = createServiceRoleClient();
	} catch {
		const auth = await requireAuthenticatedPanelUser();
		if (!auth.ok) return;
		supabase = auth.supabase;
	}

	const { data } = await supabase
		.from('site_home_config')
		.select('best_sellers_product_ids, recent_arrivals_product_ids')
		.eq('id', 1)
		.maybeSingle();
	if (!data) return;

	const best = filterStoredProductIds(data.best_sellers_product_ids, BEST_SELLERS_MAX, exclude);
	const recent = filterStoredProductIds(data.recent_arrivals_product_ids, RECENT_ARRIVALS_MAX, exclude);

	await supabase
		.from('site_home_config')
		.update({
			best_sellers_product_ids: best,
			recent_arrivals_product_ids: recent,
			updated_at: new Date().toISOString(),
		})
		.eq('id', 1);
}

async function deleteProductsFromDatabase(
	ids: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; message: string }> {
	const validIds = filterValidProductIds(ids);
	if (validIds.length === 0) {
		return { ok: false, message: 'ID de producto inválido.' };
	}

	const auth = await requireAuthenticatedPanelUser();
	if (!auth.ok) return auth;

	let deletedRows: { id: string }[] | null = null;
	let lastError: string | null = null;

	const userDelete = await auth.supabase.from('products').delete().in('id', validIds).select('id');
	if (!userDelete.error && userDelete.data?.length) {
		deletedRows = userDelete.data as { id: string }[];
	} else {
		if (userDelete.error) lastError = userDelete.error.message;
		try {
			const service = createServiceRoleClient();
			const serviceDelete = await service.from('products').delete().in('id', validIds).select('id');
			if (serviceDelete.error) {
				lastError = serviceDelete.error.message;
			} else if (serviceDelete.data?.length) {
				deletedRows = serviceDelete.data as { id: string }[];
			}
		} catch {
			lastError =
				lastError ??
				'No se pudo eliminar en la base. Verificá SUPABASE_SERVICE_ROLE_KEY y permisos RLS.';
		}
	}

	if (!deletedRows?.length) {
		return {
			ok: false,
			message:
				lastError ??
				'No se eliminó ningún producto. Puede que ya no exista o que falten permisos en Supabase.',
		};
	}

	await removeProductIdsFromSiteHomeConfig(deletedRows.map((row) => row.id));

	revalidatePath('/');
	revalidatePath('/catalogo');
	revalidatePath('/app/productos');
	revalidatePath('/app/mapa-pagina');

	return { ok: true, deleted: deletedRows.length };
}

function hasMissingPriceColumnsError(message: string): boolean {
	return (
		message.includes('column products.transfer_price does not exist') ||
		message.includes('column "transfer_price" does not exist') ||
		message.includes("Could not find the 'transfer_price' column of 'products' in the schema cache") ||
		message.includes('column products.final_transfer_price does not exist') ||
		message.includes('column "final_transfer_price" does not exist') ||
		message.includes("Could not find the 'final_transfer_price' column of 'products' in the schema cache")
	);
}

function hasMissingComboItemsColumnError(message: string): boolean {
	return (
		message.includes('column products.combo_items does not exist') ||
		message.includes('column "combo_items" does not exist') ||
		message.includes("Could not find the 'combo_items' column of 'products' in the schema cache")
	);
}

function hasMissingColorColumnError(message: string): boolean {
	return (
		message.includes('column products.color does not exist') ||
		message.includes('column "color" does not exist') ||
		message.includes("Could not find the 'color' column of 'products' in the schema cache")
	);
}

function hasMissingDiscountSnapshotColumnsError(message: string): boolean {
	return (
		message.includes('column products.cash_discount_percent does not exist') ||
		message.includes('column "cash_discount_percent" does not exist') ||
		message.includes("Could not find the 'cash_discount_percent' column of 'products' in the schema cache") ||
		message.includes('column products.transfer_discount_percent does not exist') ||
		message.includes('column "transfer_discount_percent" does not exist') ||
		message.includes("Could not find the 'transfer_discount_percent' column of 'products' in the schema cache")
	);
}

function clampPercent(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(100, n));
}

function roundMoney(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.round(n));
}

function computePricesFromGarmentCost(garmentCost: number, cashPct: number, transferPct: number) {
	const base = Math.max(0, garmentCost);
	const cash = roundMoney(base * (1 - clampPercent(cashPct) / 100));
	const transfer = roundMoney(base * (1 - clampPercent(transferPct) / 100));
	const card = roundMoney(base);
	return { cash, transfer, card };
}

/** Si llegan overrides (p. ej. redondeo manual en el panel), reemplazan el cálculo por %. */
function resolveSalePrices(
	garmentCost: number,
	cashPct: number,
	transferPct: number,
	overrides: { cash?: number; transfer?: number; card?: number },
) {
	const priced = computePricesFromGarmentCost(garmentCost, cashPct, transferPct);
	const cash =
		overrides.cash !== undefined && Number.isFinite(overrides.cash) && overrides.cash >= 0
			? roundMoney(overrides.cash)
			: priced.cash;
	const transfer =
		overrides.transfer !== undefined && Number.isFinite(overrides.transfer) && overrides.transfer >= 0
			? roundMoney(overrides.transfer)
			: priced.transfer;
	const card =
		overrides.card !== undefined && Number.isFinite(overrides.card) && overrides.card >= 0
			? roundMoney(overrides.card)
			: priced.card;
	return { cash, transfer, card };
}

function normalizeHeader(value: unknown): string {
	if (value == null) return '';
	return String(value)
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]/g, '');
}

function parseMoneyLike(value: unknown): number {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? Math.max(0, value) : 0;
	}
	let text = String(value ?? '')
		.trim()
		.replace(/\s/g, '')
		.replace(/[$€£]/g, '');
	if (!text) return 0;

	/** `59,900` (miles US) — si no tratamos la coma, parseFloat da 59. */
	if (text.includes(',')) {
		const lastComma = text.lastIndexOf(',');
		const afterComma = text.slice(lastComma + 1);
		if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
			/** Decimal EU: 59,90 o 1.234,56 */
			if (text.includes('.')) {
				if (lastComma > text.lastIndexOf('.')) {
					text = text.replace(/\./g, '').replace(',', '.');
				} else {
					text = text.replace(/,/g, '');
				}
			} else {
				const parts = text.split(',');
				if (parts.length === 2) {
					text = `${parts[0]!.replace(/\D/g, '')}.${parts[1]}`;
				}
			}
		} else {
			/** Miles con coma: 59,900 / 1,234,567 */
			text = text.replace(/,/g, '');
		}
	}

	if (text.includes('.')) {
		const parts = text.split('.');
		const last = parts[parts.length - 1]!;
		if (parts.length === 2 && last.length <= 2 && /^\d+$/.test(last)) {
			/** Decimal inglés: 10.50, 59.90 — no unir */
		} else {
			/** Miles AR: 59.900 o 1.234.567 */
			text = parts.join('');
		}
	}

	const n = Number.parseFloat(text);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseQty(value: unknown): number {
	if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
	const n = Number.parseInt(String(value ?? '').trim(), 10);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function inferKindFromEstado(estadoRaw: unknown): 'producto' | 'combo' | 'ofertas' {
	const estado = String(estadoRaw ?? '').trim().toLowerCase();
	if (estado.includes('combo')) return 'combo';
	if (estado.includes('oferta')) return 'ofertas';
	return 'producto';
}

export async function importProductsFromExcelAction(
	formData: FormData,
): Promise<{ ok: true; inserted: number; skipped: number } | { ok: false; message: string }> {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: userErr,
		} = await supabase.auth.getUser();
		if (userErr || !user) {
			return { ok: false, message: 'Iniciá sesión para importar productos.' };
		}

		const file = formData.get('file');
		if (!(file instanceof File)) {
			return { ok: false, message: 'Adjuntá un archivo Excel válido.' };
		}
		const bytes = await file.arrayBuffer();
		const workbook = XLSX.read(bytes, { type: 'array' });
		const firstSheetName = workbook.SheetNames[0];
		if (!firstSheetName) {
			return { ok: false, message: 'El archivo no tiene hojas para importar.' };
		}
		const ws = workbook.Sheets[firstSheetName];
		const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
			header: 1,
			defval: '',
			raw: false,
		});
		if (rows.length < 2) {
			return { ok: false, message: 'El archivo no tiene filas de datos.' };
		}

		const headerRow = rows[0] ?? [];
		const indexByField: Record<string, number> = {};
		for (let i = 0; i < headerRow.length; i++) {
			const normalized = normalizeHeader(headerRow[i]);
			/** NAC/IMP u otras columnas ignoradas (no mapear). */
			if (normalized === 'nacimp') continue;
			if (normalized === 'codigo' || normalized === 'cod') indexByField.codigo = i;
			if (normalized === 'categoria' || normalized === 'category') indexByField.categoria = i;
			if (normalized === 'talle' || normalized === 'talla' || normalized === 'size') indexByField.talle = i;
			if (normalized === 'precio' || normalized === 'price') indexByField.precio = i;
			if (normalized === 'estado' || normalized === 'status') indexByField.estado = i;
			if (
				normalized === 'cantidad' ||
				normalized === 'stock' ||
				normalized === 'cantidadstock' ||
				normalized === 'qty'
			) {
				indexByField.cantidad = i;
			}
			if (normalized === 'color') indexByField.color = i;
			if (normalized === 'subcategoria' || normalized === 'subcategory') indexByField.subcategoria = i;
			if (
				normalized === 'nombreproducto' ||
				normalized === 'nombre' ||
				normalized === 'name' ||
				normalized === 'producto'
			) {
				indexByField.nombre = i;
			}
		}

		/** Planilla tipo: CATEGORIA, SUBCATEGORIA, COLOR, TALLE, PRECIO ($ 59.900), ESTADO, CANTIDAD, NOMBRE. CODIGO opcional. */
		const requiredFields = ['categoria', 'talle', 'precio', 'estado', 'cantidad'] as const;
		for (const field of requiredFields) {
			if (indexByField[field] == null) {
				return { ok: false, message: `Falta la columna obligatoria: ${field}.` };
			}
		}

		const payload: Record<string, unknown>[] = [];
		let skipped = 0;
		const categoryPathCache = new Map<string, string>();

		let cashDiscountPercent = 0;
		let transferDiscountPercent = 0;
		{
			const { data: priceCfg } = await supabase
				.from('price_settings')
				.select('cash_discount_percent, transfer_discount_percent')
				.eq('id', 1)
				.maybeSingle();
			cashDiscountPercent = clampPercent(Number(priceCfg?.cash_discount_percent) || 0);
			transferDiscountPercent = clampPercent(Number(priceCfg?.transfer_discount_percent) || 0);
		}

		async function resolveCategoryPath(catLabel: string, subLabel: string): Promise<string | null> {
			const key = `${catLabel.trim().toLowerCase()}\t${subLabel.trim().toLowerCase()}`;
			const hit = categoryPathCache.get(key);
			if (hit !== undefined) return hit;
			const ensured = await ensureShopCategoryPathForImport(
				catLabel,
				subLabel.trim().length > 0 ? subLabel : null,
			);
			if (!ensured.ok) {
				return null;
			}
			categoryPathCache.set(key, ensured.path);
			return ensured.path;
		}

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i] ?? [];
			let codigo =
				indexByField.codigo != null ? String(row[indexByField.codigo] ?? '').trim() : '';
			const categoria = String(row[indexByField.categoria] ?? '').trim();
			const subcategoria =
				indexByField.subcategoria != null ? String(row[indexByField.subcategoria] ?? '').trim() : '';
			const nombreCol =
				indexByField.nombre != null ? String(row[indexByField.nombre] ?? '').trim() : '';
			const talle = String(row[indexByField.talle] ?? '').trim();
			const precio = parseMoneyLike(row[indexByField.precio]);
			const estado = row[indexByField.estado];
			const cantidad = parseQty(row[indexByField.cantidad]);
			const colorCell =
				indexByField.color != null ? String(row[indexByField.color] ?? '').trim() : '';
			if (!codigo) {
				codigo = `AUTO-${String(i + 1).padStart(4, '0')}`;
			}
			const nombreFinal = nombreCol.trim() || codigo;
			if (!categoria) {
				skipped += 1;
				continue;
			}
			const categoryPath = await resolveCategoryPath(categoria, subcategoria);
			if (categoryPath == null) {
				return {
					ok: false,
					message: `No se pudo resolver categoría/subcategoría para la fila ${i + 1} (${categoria}${subcategoria ? ` / ${subcategoria}` : ''}).`,
				};
			}
			const sizeInventory =
				talle.length > 0
					? [
							{
								size: talle,
								qty: cantidad,
							},
						]
					: [];
			const garmentCost = precio;
			const priced = computePricesFromGarmentCost(garmentCost, cashDiscountPercent, transferDiscountPercent);
			payload.push({
				kind: inferKindFromEstado(estado),
				name: nombreFinal,
				stock: cantidad,
				cost: null,
				base_price: garmentCost,
				transfer_price: priced.transfer,
				price: priced.cash,
				final_transfer_price: priced.card,
				cash_discount_percent: cashDiscountPercent,
				transfer_discount_percent: transferDiscountPercent,
				tax_applies: false,
				tax_percent: null,
				description: null,
				color: colorCell || null,
				product_code: codigo,
				category: categoryPath,
				compare_at_price: null,
				image_url: null,
				image_urls: [],
				video_url: null,
				min_order_qty: null,
				max_order_qty: null,
				size_inventory: sizeInventory,
			});
		}

		if (payload.length === 0) {
			return { ok: false, message: 'No se encontraron filas válidas para importar.' };
		}

		let insertResult = await supabase.from('products').insert(payload);
		if (insertResult.error && hasMissingColorColumnError(insertResult.error.message)) {
			const withoutColor = payload.map((row) => {
				const { color: _c, ...rest } = row;
				return rest;
			});
			insertResult = await supabase.from('products').insert(withoutColor);
		}
		if (insertResult.error && hasMissingDiscountSnapshotColumnsError(insertResult.error.message)) {
			const withoutSnapshots = payload.map((row) => {
				const {
					cash_discount_percent: _cashDisc,
					transfer_discount_percent: _trDisc,
					...rest
				} = row;
				return rest;
			});
			insertResult = await supabase.from('products').insert(withoutSnapshots);
		}
		if (insertResult.error && hasMissingPriceColumnsError(insertResult.error.message)) {
			const legacyPayload = payload.map((row) => {
				const {
					transfer_price: _transfer,
					final_transfer_price: _finalTransfer,
					cash_discount_percent: _cashDisc,
					transfer_discount_percent: _trDisc,
					...rest
				} = row;
				return rest;
			});
			insertResult = await supabase.from('products').insert(legacyPayload);
		}
		if (insertResult.error) {
			return { ok: false, message: insertResult.error.message };
		}

		await revalidateShopCategoryPaths();
		revalidatePath('/app/productos');
		revalidatePath('/app/cargar-producto');
		revalidatePath('/catalogo');
		return { ok: true, inserted: payload.length, skipped };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error inesperado al importar.';
		return { ok: false, message: msg };
	}
}

export async function fetchRecentProductsAction(limit = 100): Promise<ProductRow[]> {
	return fetchRecentProducts(limit);
}

/** Lista completa del catálogo para paneles admin (p. ej. mapa de página Recién llegados). */
export async function fetchAllProductsForPanelAction(): Promise<ProductRow[]> {
	return fetchAllProductsForPanel();
}

/** Para la home: completar la selección guardada con productos que no vienen en el lote reciente. */
export async function fetchProductsByIdsAction(
	ids: string[],
	options?: { includeHidden?: boolean },
): Promise<ProductRow[]> {
	return fetchProductsByIds(ids, { includeHidden: options?.includeHidden ?? false });
}

export async function fetchStorefrontCatalogPageAction(
	offset: number,
	limit: number = STOREFRONT_CATALOG_PAGE_SIZE,
): Promise<{ rows: ProductRow[]; hasMore: boolean }> {
	const rows = await fetchStorefrontCatalogPage(offset, limit);
	return { rows, hasMore: rows.length >= limit };
}

export type InsertProductInput = {
	kind: 'producto' | 'combo' | 'ofertas';
	name: string;
	stock: number;
	cost: number;
	/** Costo de prenda (base comercial). */
	garmentCost: number;
	cashDiscountPercent: number;
	transferDiscountPercent: number;
	taxApplies: boolean;
	taxPercent: number | null;
	description: string | null;
	color: string | null;
	productCode: string | null;
	category: string | null;
	minOrderQty: number | null;
	maxOrderQty: number | null;
	imageUrls: string[];
	videoUrl: string | null;
	compareAtPrice: number | null;
	sizeInventory: SizeInventoryRow[];
	comboItems?: { productId: string; qty: number; unitPrice: number; name: string }[];
	/** Efectivo, transferencia y tarjeta publicados; si faltan, se calculan desde costo de prenda. */
	cashPrice?: number;
	transferPrice?: number;
	cardPrice?: number;
};

export async function insertProductAction(
	input: InsertProductInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: userErr,
		} = await supabase.auth.getUser();
		if (userErr || !user) {
			return { ok: false, message: 'Iniciá sesión para guardar productos.' };
		}

		const name = input.name.trim();
		if (!name) {
			return { ok: false, message: 'El nombre es obligatorio.' };
		}

		const imageUrls = input.imageUrls.filter(Boolean).slice(0, MAX_PRODUCT_GALLERY_IMAGES);
		const garmentCost = Math.max(0, input.garmentCost);
		const cashDisc = clampPercent(input.cashDiscountPercent);
		const transferDisc = clampPercent(input.transferDiscountPercent);
		const salePrices = resolveSalePrices(garmentCost, cashDisc, transferDisc, {
			cash: input.cashPrice,
			transfer: input.transferPrice,
			card: input.cardPrice,
		});
		const sizesNorm = normalizeSizeInventoryForDb(input.sizeInventory ?? []);
		const stock =
			sizesNorm.length > 0
				? sumSizeInventoryQty(sizesNorm)
				: Math.max(0, Math.floor(input.stock));

		const row = {
			kind: input.kind,
			name,
			stock,
			cost: input.cost >= 0 ? input.cost : null,
			base_price: garmentCost,
			transfer_price: salePrices.transfer,
			price: salePrices.cash,
			final_transfer_price: salePrices.card,
			cash_discount_percent: cashDisc,
			transfer_discount_percent: transferDisc,
			tax_applies: input.taxApplies,
			tax_percent: input.taxApplies && input.taxPercent != null ? Math.max(0, input.taxPercent) : null,
			description: input.description?.trim() || null,
			color: input.color?.trim() || null,
			product_code: input.productCode?.trim() || null,
			category: input.category?.trim() || null,
			compare_at_price: input.compareAtPrice != null && input.compareAtPrice >= 0 ? input.compareAtPrice : null,
			image_url: imageUrls[0] ?? null,
			image_urls: imageUrls,
			video_url: input.videoUrl?.trim() || null,
			min_order_qty: input.minOrderQty,
			max_order_qty: input.maxOrderQty,
			size_inventory: sizesNorm.length > 0 ? sizesNorm : [],
			combo_items: (input.comboItems ?? []).map((x) => ({
				product_id: x.productId,
				qty: Math.max(1, Math.floor(x.qty)),
				unit_price: Math.max(0, x.unitPrice),
				name: x.name.trim(),
			})),
		};

		let result = await supabase.from('products').insert(row);
		if (result.error && hasMissingDiscountSnapshotColumnsError(result.error.message)) {
			const { cash_discount_percent: _c, transfer_discount_percent: _t, ...withoutSnapshots } = row;
			result = await supabase.from('products').insert(withoutSnapshots);
		}
		if (result.error && hasMissingPriceColumnsError(result.error.message)) {
			const {
				transfer_price: _transfer,
				final_transfer_price: _finalTransfer,
				cash_discount_percent: _c,
				transfer_discount_percent: _t,
				...legacyRow
			} = row;
			result = await supabase.from('products').insert(legacyRow);
		}
		if (result.error && hasMissingComboItemsColumnError(result.error.message)) {
			const { combo_items: _comboItems, ...legacyRow } = row;
			result = await supabase.from('products').insert(legacyRow);
		}
		if (result.error && hasMissingColorColumnError(result.error.message)) {
			const { color: _color, ...legacyRow } = row;
			result = await supabase.from('products').insert(legacyRow);
		}
		if (result.error) {
			return { ok: false, message: result.error.message };
		}
		revalidatePath('/');
		revalidatePath('/app/productos');
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error inesperado al guardar.';
		return { ok: false, message: msg };
	}
}

export type UpdateProductPatch = {
	name: string;
	/** Costo de prenda (base comercial). */
	garment_cost: number;
	cash_discount_percent: number;
	transfer_discount_percent: number;
	compare_at_price: number | null;
	category: string | null;
	description: string;
	color: string;
	stock: number;
	cost: number;
	size_inventory: SizeInventoryRow[];
	/** Hasta 5 URLs de galería; la primera es la imagen principal (`image_url`). */
	image_urls: string[];
	video_url: string | null;
	/** Efectivo, transferencia y tarjeta; si faltan, se recalculan desde costo de prenda. */
	cashPrice?: number;
	transferPrice?: number;
	cardPrice?: number;
};

export async function updateProductAction(
	id: string,
	patch: UpdateProductPatch,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const supabase = await createClient();
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { ok: false, message: 'Iniciá sesión para actualizar productos.' };
	}

	const sizesNorm = normalizeSizeInventoryForDb(patch.size_inventory ?? []);
	const stock =
		sizesNorm.length > 0 ? sumSizeInventoryQty(sizesNorm) : Math.max(0, Math.floor(patch.stock));
	const imageUrls = (patch.image_urls ?? []).filter(Boolean).slice(0, MAX_PRODUCT_GALLERY_IMAGES);

	const garmentCost = Math.max(0, patch.garment_cost);
	const cashDisc = clampPercent(patch.cash_discount_percent);
	const transferDisc = clampPercent(patch.transfer_discount_percent);
	const salePrices = resolveSalePrices(garmentCost, cashDisc, transferDisc, {
		cash: patch.cashPrice,
		transfer: patch.transferPrice,
		card: patch.cardPrice,
	});

	/**
	 * Las server actions pueden omitir claves `undefined` al serializar. Si `color` no viene en el patch,
	 * no debemos mandar `color: null` o se borra el valor guardado.
	 */
	const fullUpdate: Record<string, unknown> = {
		name: patch.name.trim(),
		base_price: garmentCost,
		transfer_price: salePrices.transfer,
		price: salePrices.cash,
		final_transfer_price: salePrices.card,
		cash_discount_percent: cashDisc,
		transfer_discount_percent: transferDisc,
		tax_applies: false,
		tax_percent: null,
		compare_at_price:
			patch.compare_at_price != null && patch.compare_at_price >= 0 ? patch.compare_at_price : null,
		category: patch.category?.trim() || null,
		description: patch.description.trim() || null,
		stock,
		cost: patch.cost >= 0 ? patch.cost : null,
		size_inventory: sizesNorm.length > 0 ? sizesNorm : [],
		image_url: imageUrls[0] ?? null,
		image_urls: imageUrls,
	};
	if (Object.prototype.hasOwnProperty.call(patch, 'color')) {
		fullUpdate.color = typeof patch.color === 'string' ? patch.color.trim() || null : null;
	}
	if (Object.prototype.hasOwnProperty.call(patch, 'video_url')) {
		const v = patch.video_url;
		fullUpdate.video_url = typeof v === 'string' ? v.trim() || null : null;
	}

	let updateResult = await supabase
		.from('products')
		.update(fullUpdate)
		.eq('id', id);

	if (updateResult.error && hasMissingDiscountSnapshotColumnsError(updateResult.error.message)) {
		const { cash_discount_percent: _c, transfer_discount_percent: _t, ...withoutSnapshots } = fullUpdate;
		updateResult = await supabase.from('products').update(withoutSnapshots).eq('id', id);
	}
	if (updateResult.error && hasMissingPriceColumnsError(updateResult.error.message)) {
		const {
			transfer_price: _transfer,
			final_transfer_price: _finalTransfer,
			cash_discount_percent: _c,
			transfer_discount_percent: _t,
			...legacyUpdate
		} = fullUpdate;
		updateResult = await supabase.from('products').update(legacyUpdate).eq('id', id);
	}
	if (updateResult.error && hasMissingColorColumnError(updateResult.error.message)) {
		return {
			ok: false,
			message:
				'No se pudo guardar el color: falta la columna `color` en la tabla products. Ejecutá la migración en Supabase (p. ej. 20260416200000_products_color.sql) y recargá el esquema.',
		};
	}

	if (updateResult.error) {
		return { ok: false, message: updateResult.error.message };
	}
	revalidatePath('/');
	revalidatePath('/app/productos');
	return { ok: true };
}

export async function deleteProductAction(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
	const result = await deleteProductsFromDatabase([id]);
	if (!result.ok) return result;
	return { ok: true };
}

export async function deleteProductsBulkAction(
	ids: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; message: string }> {
	return deleteProductsFromDatabase(ids);
}

export async function setProductsHiddenAction(
	ids: string[],
	hidden: boolean,
): Promise<{ ok: true; updated: number } | { ok: false; message: string }> {
	const uniq = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
	if (uniq.length === 0) {
		return { ok: false, message: 'No hay productos seleccionados.' };
	}
	const supabase = await createClient();
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { ok: false, message: 'Iniciá sesión para ocultar o mostrar productos.' };
	}

	let result = await supabase.from('products').update({ is_hidden: hidden }).in('id', uniq);
	if (result.error?.message?.includes('column products.is_hidden does not exist')) {
		return {
			ok: false,
			message:
				'Falta la columna `is_hidden` en products. Ejecutá la migración `20260603120000_products_is_hidden.sql` en Supabase.',
		};
	}
	if (result.error) {
		return { ok: false, message: result.error.message };
	}

	revalidatePath('/');
	revalidatePath('/catalogo');
	revalidatePath('/app/productos');
	revalidatePath('/app/mapa-pagina');
	return { ok: true, updated: uniq.length };
}

'use server';

import { revalidatePath } from 'next/cache';
import { requireSessionUser } from '@/lib/firebase/auth-server';
import { getPriceSettingsDoc, removeProductIdsFromSiteHomeConfig } from '@/lib/firebase/config';
import {
	deleteProductDocs,
	fetchAllProductsForPanel,
	fetchProductsByIds,
	fetchRecentProducts,
	fetchStorefrontCatalogPage,
	insertProductDoc,
	insertProductsBatch,
	upsertProductsBatchWithIds,
	setProductsHidden,
	STOREFRONT_CATALOG_PAGE_SIZE,
	updateProductDoc,
} from '@/lib/firebase/products';
import type { ProductRow } from '@/lib/data/productCatalog';
import {
	groupExcelRows,
	mapExcelHeaders,
	parseExcelDataRows,
	validateExcelHeaders,
} from '@/lib/productExcelImport';
import {
	isCatalogExportFormat,
	mapCatalogExportHeaders,
	parseCatalogExportRows,
	splitCategoryPath,
} from '@/lib/productCsvImport';
import {
	normalizeSizeInventoryForDb,
	sumSizeInventoryQty,
	type SizeInventoryRow,
} from '@/lib/data/productSizes';
import {
	ensureShopCategoryPathForImport,
	revalidateShopCategoryPaths,
} from '@/app/actions/shopCategories';
import { deleteProductMediaFromCloudinary, collectProductMediaUrls } from '@/lib/cloudinary/deleteMedia';
import * as XLSX from 'xlsx';

import { MAX_PRODUCT_GALLERY_IMAGES } from '@/lib/productMediaLimits';

const FIRESTORE_ID_RE = /^[^\s/]+$/;

function filterValidProductIds(ids: string[]): string[] {
	return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))].filter(
		(id) => !id.startsWith('tmp-') && id.length > 0 && id.length <= 1500 && FIRESTORE_ID_RE.test(id),
	);
}

async function requireAuthenticatedPanelUser() {
	const user = await requireSessionUser();
	if ('error' in user) {
		return { ok: false as const, message: user.error };
	}
	return { ok: true as const, user };
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

	try {
		const products = await fetchProductsByIds(validIds, { includeHidden: true });
		if (products.length === 0) {
			return { ok: false, message: 'No se encontró ningún producto con ese ID.' };
		}

		const mediaUrls = collectProductMediaUrls(products);
		const mediaResult = await deleteProductMediaFromCloudinary(mediaUrls);

		const deletedIds = await deleteProductDocs(products.map((p) => p.id));
		if (deletedIds.length === 0) {
			return { ok: false, message: 'No se eliminó ningún producto.' };
		}

		await removeProductIdsFromSiteHomeConfig(deletedIds);

		revalidatePath('/');
		revalidatePath('/catalogo');
		revalidatePath('/app/productos');
		revalidatePath('/app/mapa-pagina');

		if (mediaResult.failed > 0) {
			console.warn('[deleteProductsFromDatabase] Cloudinary partial failure', mediaResult);
		}

		return { ok: true, deleted: deletedIds.length };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'No se pudo eliminar en la base.';
		return { ok: false, message: msg };
	}
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

export async function importProductsFromExcelAction(
	formData: FormData,
): Promise<
	| { ok: true; inserted: number; skipped: number; format: 'manual' | 'catalog-export' }
	| { ok: false; message: string }
> {
	try {
		const user = await requireSessionUser();
		if ('error' in user) {
			return { ok: false, message: user.error };
		}

		const file = formData.get('file');
		if (!(file instanceof File)) {
			return { ok: false, message: 'Adjuntá un archivo Excel o CSV válido.' };
		}

		const fileName = file.name.toLowerCase();
		const bytes = await file.arrayBuffer();
		const workbook = XLSX.read(bytes, {
			type: 'array',
			cellDates: false,
			raw: false,
		});
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

		if (isCatalogExportFormat(headerRow) || fileName.endsWith('.csv')) {
			if (!isCatalogExportFormat(headerRow)) {
				return {
					ok: false,
					message:
						'El CSV no tiene el formato de exportación de catálogo (columnas name, base_price, product_code).',
				};
			}

			const indexByField = mapCatalogExportHeaders(headerRow);
			const { parsed, skipped, errors } = parseCatalogExportRows(rows, indexByField);
			if (errors.length > 0) {
				return { ok: false, message: errors.slice(0, 5).join(' ') };
			}
			if (parsed.length === 0) {
				return { ok: false, message: 'No se encontraron productos válidos en el CSV.' };
			}

			const categoryPathCache = new Map<string, string>();

			async function resolveCategoryPathFromExport(path: string): Promise<string | null> {
				const trimmed = path.trim();
				if (!trimmed) return null;
				const hit = categoryPathCache.get(trimmed.toLowerCase());
				if (hit !== undefined) return hit;

				const { category, subcategory } = splitCategoryPath(trimmed);
				if (!category) return null;

				const ensured = await ensureShopCategoryPathForImport(category, subcategory);
				if (!ensured.ok) return null;
				categoryPathCache.set(trimmed.toLowerCase(), ensured.path);
				return ensured.path;
			}

			const payload: { id: string; data: Record<string, unknown> }[] = [];

			for (const item of parsed) {
				let category = item.doc.category as string | null;
				if (item.categoryPath) {
					const resolved = await resolveCategoryPathFromExport(item.categoryPath);
					if (resolved == null) {
						return {
							ok: false,
							message: `No se pudo resolver la categoría "${item.categoryPath}" (fila ${item.rowNum}).`,
						};
					}
					category = resolved;
				}

				payload.push({
					id: item.id,
					data: { ...item.doc, category },
				});
			}

			await upsertProductsBatchWithIds(payload);
			await revalidateShopCategoryPaths();
			revalidatePath('/app/productos');
			revalidatePath('/app/cargar-producto');
			revalidatePath('/app/carga-excel');
			revalidatePath('/catalogo');
			return { ok: true, inserted: payload.length, skipped, format: 'catalog-export' };
		}

		const indexByField = mapExcelHeaders(headerRow);
		const headerError = validateExcelHeaders(indexByField);
		if (headerError) {
			return { ok: false, message: headerError };
		}

		const { parsed, skipped, errors } = parseExcelDataRows(rows, indexByField);
		if (errors.length > 0) {
			return { ok: false, message: errors.slice(0, 5).join(' ') };
		}
		if (parsed.length === 0) {
			return { ok: false, message: 'No se encontraron filas válidas para importar.' };
		}

		const grouped = groupExcelRows(parsed);
		const categoryPathCache = new Map<string, string>();

		let cashDiscountPercent = 0;
		let transferDiscountPercent = 0;
		{
			const priceCfg = await getPriceSettingsDoc();
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

		const payload: Record<string, unknown>[] = [];

		for (const product of grouped) {
			const categoryPath = await resolveCategoryPath(product.categoria, product.subcategoria);
			if (categoryPath == null) {
				return {
					ok: false,
					message: `No se pudo resolver categoría/subcategoría (${product.categoria}${product.subcategoria ? ` / ${product.subcategoria}` : ''}) en filas ${product.sourceRows.join(', ')}.`,
				};
			}

			const sizesNorm = normalizeSizeInventoryForDb(product.sizeInventory);
			const stock =
				sizesNorm.length > 0 ? sumSizeInventoryQty(sizesNorm) : Math.max(0, product.stock);
			const garmentCost = product.costoPrenda;
			const priced = computePricesFromGarmentCost(
				garmentCost,
				cashDiscountPercent,
				transferDiscountPercent,
			);

			payload.push({
				kind: product.kind,
				name: product.name,
				stock,
				cost: product.costoInicial > 0 ? product.costoInicial : null,
				base_price: garmentCost,
				transfer_price: priced.transfer,
				price: priced.cash,
				final_transfer_price: priced.card,
				cash_discount_percent: cashDiscountPercent,
				transfer_discount_percent: transferDiscountPercent,
				tax_applies: false,
				tax_percent: null,
				description: product.descripcion || null,
				color: product.colors.length > 0 ? product.colors.join(', ') : null,
				product_code: product.codigo,
				category: categoryPath,
				compare_at_price: null,
				image_url: null,
				image_urls: [],
				video_url: null,
				min_order_qty: null,
				max_order_qty: null,
				size_inventory: sizesNorm,
			});
		}

		await insertProductsBatch(payload);

		await revalidateShopCategoryPaths();
		revalidatePath('/app/productos');
		revalidatePath('/app/cargar-producto');
		revalidatePath('/app/carga-excel');
		revalidatePath('/catalogo');
		return { ok: true, inserted: payload.length, skipped, format: 'manual' };
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
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
	try {
		const user = await requireSessionUser();
		if ('error' in user) {
			return { ok: false, message: user.error };
		}

		const name = input.name.trim();
		if (!name) {
			return { ok: false, message: 'El nombre es obligatorio.' };
		}

		const imageUrls = input.imageUrls.filter(Boolean).slice(0, MAX_PRODUCT_GALLERY_IMAGES);
		for (const url of imageUrls) {
			if (!url.startsWith('https://')) {
				return { ok: false, message: 'Las imágenes deben ser URLs HTTPS de Cloudinary.' };
			}
		}
		if (input.videoUrl?.trim() && !input.videoUrl.trim().startsWith('https://')) {
			return { ok: false, message: 'El video debe ser una URL HTTPS de Cloudinary.' };
		}
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

		const id = crypto.randomUUID();
		await insertProductDoc(id, row);

		revalidatePath('/');
		revalidatePath('/catalogo');
		revalidatePath('/app/productos');
		return { ok: true, id };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error inesperado al guardar.';
		if (msg.includes('FIREBASE') || msg.includes('Firebase') || msg.includes('credential')) {
			return {
				ok: false,
				message: 'No se pudo guardar en Firebase. Revisá FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en .env.local.',
			};
		}
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
	try {
		const user = await requireSessionUser();
		if ('error' in user) {
			return { ok: false, message: user.error };
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

		await updateProductDoc(id, fullUpdate);

		revalidatePath('/');
		revalidatePath('/app/productos');
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error inesperado al actualizar.';
		return { ok: false, message: msg };
	}
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

	const user = await requireSessionUser();
	if ('error' in user) {
		return { ok: false, message: user.error };
	}

	try {
		await setProductsHidden(uniq, hidden);

		revalidatePath('/');
		revalidatePath('/catalogo');
		revalidatePath('/app/productos');
		revalidatePath('/app/mapa-pagina');
		return { ok: true, updated: uniq.length };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'No se pudo actualizar la visibilidad.';
		return { ok: false, message: msg };
	}
}

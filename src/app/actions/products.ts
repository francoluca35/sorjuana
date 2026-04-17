'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ProductRow } from '@/lib/data/productCatalog';
import { fetchRecentProducts } from '@/lib/data/recentProducts';
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
	if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
	let text = String(value ?? '')
		.trim()
		.replace(/\s/g, '')
		.replace(/[$€£]/g, '');
	// Formato tipo 59.900 (miles con punto) o 59.900,50 (decimal con coma)
	const hasCommaDecimal = /,\d{1,2}$/.test(text);
	if (hasCommaDecimal) {
		text = text.replace(/\./g, '').replace(',', '.');
	} else {
		text = text.replace(/\./g, '');
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

		const requiredFields = ['codigo', 'categoria', 'talle', 'precio', 'estado', 'cantidad'] as const;
		for (const field of requiredFields) {
			if (indexByField[field] == null) {
				return { ok: false, message: `Falta la columna obligatoria: ${field}.` };
			}
		}

		const payload: Record<string, unknown>[] = [];
		let skipped = 0;
		const categoryPathCache = new Map<string, string>();

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
			const codigo = String(row[indexByField.codigo] ?? '').trim();
			const categoria = String(row[indexByField.categoria] ?? '').trim();
			const subcategoria =
				indexByField.subcategoria != null ? String(row[indexByField.subcategoria] ?? '').trim() : '';
			const nombreCol =
				indexByField.nombre != null ? String(row[indexByField.nombre] ?? '').trim() : '';
			const nombreFinal = nombreCol || codigo;
			const talle = String(row[indexByField.talle] ?? '').trim();
			const precio = parseMoneyLike(row[indexByField.precio]);
			const estado = row[indexByField.estado];
			const cantidad = parseQty(row[indexByField.cantidad]);
			const colorCell =
				indexByField.color != null ? String(row[indexByField.color] ?? '').trim() : '';
			if (!codigo || !categoria) {
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
			payload.push({
				kind: inferKindFromEstado(estado),
				name: nombreFinal,
				stock: cantidad,
				cost: null,
				base_price: precio,
				price: precio,
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

export type InsertProductInput = {
	kind: 'producto' | 'combo' | 'ofertas';
	name: string;
	stock: number;
	cost: number;
	basePrice: number;
	transferPrice: number;
	price: number;
	finalTransferPrice: number;
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

		const imageUrls = input.imageUrls.filter(Boolean).slice(0, 3);
		const price = Math.max(0, input.price);
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
			base_price: input.basePrice >= 0 ? input.basePrice : null,
			transfer_price: input.transferPrice >= 0 ? input.transferPrice : null,
			price,
			final_transfer_price: input.finalTransferPrice >= 0 ? input.finalTransferPrice : null,
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
		if (result.error && hasMissingPriceColumnsError(result.error.message)) {
			const { transfer_price: _transfer, final_transfer_price: _finalTransfer, ...legacyRow } = row;
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
	price: number;
	base_price: number;
	transfer_price: number;
	final_transfer_price: number;
	tax_applies: boolean;
	tax_percent: number | null;
	compare_at_price: number | null;
	category: string | null;
	description: string;
	color: string;
	stock: number;
	cost: number;
	size_inventory: SizeInventoryRow[];
	/** Hasta 3 URLs; la primera es la imagen principal (`image_url`). */
	image_urls: string[];
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
	const imageUrls = (patch.image_urls ?? []).filter(Boolean).slice(0, 3);

	const fullUpdate = {
		name: patch.name.trim(),
		price: Math.max(0, patch.price),
		base_price: patch.base_price >= 0 ? patch.base_price : null,
		transfer_price: patch.transfer_price >= 0 ? patch.transfer_price : null,
		final_transfer_price: patch.final_transfer_price >= 0 ? patch.final_transfer_price : null,
		tax_applies: patch.tax_applies,
		tax_percent: patch.tax_applies && patch.tax_percent != null ? Math.max(0, patch.tax_percent) : null,
		compare_at_price:
			patch.compare_at_price != null && patch.compare_at_price >= 0 ? patch.compare_at_price : null,
		category: patch.category?.trim() || null,
		description: patch.description.trim() || null,
		color: patch.color?.trim() || null,
		stock,
		cost: patch.cost >= 0 ? patch.cost : null,
		size_inventory: sizesNorm.length > 0 ? sizesNorm : [],
		image_url: imageUrls[0] ?? null,
		image_urls: imageUrls,
	};

	let updateResult = await supabase
		.from('products')
		.update(fullUpdate)
		.eq('id', id);

	if (updateResult.error && hasMissingPriceColumnsError(updateResult.error.message)) {
		const { transfer_price: _transfer, final_transfer_price: _finalTransfer, ...legacyUpdate } = fullUpdate;
		updateResult = await supabase.from('products').update(legacyUpdate).eq('id', id);
	}
	if (updateResult.error && hasMissingColorColumnError(updateResult.error.message)) {
		const { color: _color, ...legacyUpdate } = fullUpdate;
		updateResult = await supabase.from('products').update(legacyUpdate).eq('id', id);
	}

	if (updateResult.error) {
		return { ok: false, message: updateResult.error.message };
	}
	revalidatePath('/');
	revalidatePath('/app/productos');
	return { ok: true };
}

export async function deleteProductAction(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
	const supabase = await createClient();
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { ok: false, message: 'Iniciá sesión para eliminar productos.' };
	}

	const { error } = await supabase.from('products').delete().eq('id', id);
	if (error) {
		return { ok: false, message: error.message };
	}
	revalidatePath('/');
	revalidatePath('/app/productos');
	return { ok: true };
}

export async function deleteProductsBulkAction(
	ids: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; message: string }> {
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
		return { ok: false, message: 'Iniciá sesión para eliminar productos.' };
	}
	const { error } = await supabase.from('products').delete().in('id', uniq);
	if (error) {
		return { ok: false, message: error.message };
	}
	revalidatePath('/');
	revalidatePath('/app/productos');
	return { ok: true, deleted: uniq.length };
}

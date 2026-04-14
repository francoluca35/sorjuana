'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ProductRow } from '@/lib/data/productCatalog';
import { fetchRecentProducts } from '@/lib/data/recentProducts';
import {
	normalizeSizeInventoryForDb,
	sumSizeInventoryQty,
	type SizeInventoryRow,
} from '@/lib/data/productSizes';

export async function fetchRecentProductsAction(limit = 100): Promise<ProductRow[]> {
	return fetchRecentProducts(limit);
}

export type InsertProductInput = {
	kind: 'producto' | 'combo' | 'ofertas';
	name: string;
	stock: number;
	cost: number;
	basePrice: number;
	price: number;
	taxApplies: boolean;
	taxPercent: number | null;
	description: string | null;
	productCode: string | null;
	category: string | null;
	minOrderQty: number | null;
	maxOrderQty: number | null;
	imageUrls: string[];
	videoUrl: string | null;
	compareAtPrice: number | null;
	sizeInventory: SizeInventoryRow[];
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
			price,
			tax_applies: input.taxApplies,
			tax_percent: input.taxApplies && input.taxPercent != null ? Math.max(0, input.taxPercent) : null,
			description: input.description?.trim() || null,
			product_code: input.productCode?.trim() || null,
			category: input.category?.trim() || null,
			compare_at_price: input.compareAtPrice != null && input.compareAtPrice >= 0 ? input.compareAtPrice : null,
			image_url: imageUrls[0] ?? null,
			image_urls: imageUrls,
			video_url: input.videoUrl?.trim() || null,
			min_order_qty: input.minOrderQty,
			max_order_qty: input.maxOrderQty,
			size_inventory: sizesNorm.length > 0 ? sizesNorm : [],
		};

		const { error } = await supabase.from('products').insert(row);
		if (error) {
			return { ok: false, message: error.message };
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
	compare_at_price: number | null;
	category: string | null;
	description: string;
	stock: number;
	cost: number;
	size_inventory: SizeInventoryRow[];
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

	const { error } = await supabase
		.from('products')
		.update({
			name: patch.name.trim(),
			price: Math.max(0, patch.price),
			compare_at_price:
				patch.compare_at_price != null && patch.compare_at_price >= 0 ? patch.compare_at_price : null,
			category: patch.category?.trim() || null,
			description: patch.description.trim() || null,
			stock,
			cost: patch.cost >= 0 ? patch.cost : null,
			size_inventory: sizesNorm.length > 0 ? sizesNorm : [],
		})
		.eq('id', id);

	if (error) {
		return { ok: false, message: error.message };
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

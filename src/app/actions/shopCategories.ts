'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
	slugifyLabel,
	type ShopCategoryTree,
	type ShopSubcategoryRow,
} from '@/lib/data/shopCategories';

export async function revalidateShopCategoryPaths() {
	revalidatePath('/app/categorias');
	revalidatePath('/');
}

async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	if (error || !user) {
		return { user: null as const, error: 'Iniciá sesión para continuar.' as const };
	}
	return { user, error: null as const };
}

async function uniqueCategorySlug(
	supabase: Awaited<ReturnType<typeof createClient>>,
	base: string,
	excludeId?: string,
): Promise<string> {
	let slug = base;
	let n = 0;
	for (;;) {
		const { data } = await supabase.from('shop_categories').select('id').eq('slug', slug).maybeSingle();
		const row = data as { id: string } | null;
		if (!row) return slug;
		if (excludeId && row.id === excludeId) return slug;
		n += 1;
		slug = `${base}-${n}`;
	}
}

async function uniqueSubcategorySlug(
	supabase: Awaited<ReturnType<typeof createClient>>,
	categoryId: string,
	base: string,
	excludeId?: string,
): Promise<string> {
	let slug = base;
	let n = 0;
	for (;;) {
		const { data } = await supabase
			.from('shop_subcategories')
			.select('id')
			.eq('category_id', categoryId)
			.eq('slug', slug)
			.maybeSingle();
		const row = data as { id: string } | null;
		if (!row) return slug;
		if (excludeId && row.id === excludeId) return slug;
		n += 1;
		slug = `${base}-${n}`;
	}
}

export async function listShopCategoryTreeAction(): Promise<ShopCategoryTree[]> {
	try {
		const supabase = await createClient();
		const { data: cats, error: e1 } = await supabase
			.from('shop_categories')
			.select('*')
			.order('sort_order', { ascending: true })
			.order('name', { ascending: true });
		if (e1) {
			return [];
		}
		if (!cats?.length) {
			return [];
		}
		const { data: subs, error: e2 } = await supabase
			.from('shop_subcategories')
			.select('*')
			.order('sort_order', { ascending: true })
			.order('name', { ascending: true });
		if (e2) {
			return (cats as ShopCategoryTree[]).map((c) => ({ ...c, subcategories: [] }));
		}
		const byCat = new Map<string, ShopSubcategoryRow[]>();
		for (const s of subs ?? []) {
			const row = s as ShopSubcategoryRow;
			const list = byCat.get(row.category_id) ?? [];
			list.push(row);
			byCat.set(row.category_id, list);
		}
		return (cats as ShopCategoryTree[]).map((c) => ({
			...c,
			subcategories: byCat.get(c.id) ?? [],
		}));
	} catch {
		return [];
	}
}

export async function createShopCategoryAction(
	name: string,
	slugHint?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const supabase = await createClient();
	const auth = await requireUser(supabase);
	if (!auth.user) {
		return { ok: false, message: auth.error };
	}
	const trimmed = name.trim();
	if (!trimmed) {
		return { ok: false, message: 'El nombre de la categoría es obligatorio.' };
	}
	const base = slugifyLabel((slugHint ?? '').trim() || trimmed);
	const slug = await uniqueCategorySlug(supabase, base);
	const { data: maxRow } = await supabase
		.from('shop_categories')
		.select('sort_order')
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
	const { error } = await supabase.from('shop_categories').insert({
		name: trimmed,
		slug,
		sort_order: nextOrder,
	});
	if (error) {
		return { ok: false, message: error.message };
	}
	await revalidateShopCategoryPaths();
	return { ok: true };
}

export async function updateShopCategoryAction(
	id: string,
	name: string,
	slugHint?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const supabase = await createClient();
	const auth = await requireUser(supabase);
	if (!auth.user) {
		return { ok: false, message: auth.error };
	}
	const trimmed = name.trim();
	if (!trimmed) {
		return { ok: false, message: 'El nombre no puede quedar vacío.' };
	}
	const base = slugifyLabel((slugHint ?? '').trim() || trimmed);
	const slug = await uniqueCategorySlug(supabase, base, id);
	const { error } = await supabase
		.from('shop_categories')
		.update({ name: trimmed, slug, updated_at: new Date().toISOString() })
		.eq('id', id);
	if (error) {
		return { ok: false, message: error.message };
	}
	await revalidateShopCategoryPaths();
	return { ok: true };
}

export async function deleteShopCategoryAction(
	id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const supabase = await createClient();
	const auth = await requireUser(supabase);
	if (!auth.user) {
		return { ok: false, message: auth.error };
	}
	const { error } = await supabase.from('shop_categories').delete().eq('id', id);
	if (error) {
		return { ok: false, message: error.message };
	}
	await revalidateShopCategoryPaths();
	return { ok: true };
}

export async function createShopSubcategoryAction(
	categoryId: string,
	name: string,
	slugHint?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const supabase = await createClient();
	const auth = await requireUser(supabase);
	if (!auth.user) {
		return { ok: false, message: auth.error };
	}
	const trimmed = name.trim();
	if (!trimmed) {
		return { ok: false, message: 'El nombre de la subcategoría es obligatorio.' };
	}
	if (!categoryId) {
		return { ok: false, message: 'Elegí una categoría padre.' };
	}
	const base = slugifyLabel((slugHint ?? '').trim() || trimmed);
	const slug = await uniqueSubcategorySlug(supabase, categoryId, base);
	const { data: maxRow } = await supabase
		.from('shop_subcategories')
		.select('sort_order')
		.eq('category_id', categoryId)
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
	const { error } = await supabase.from('shop_subcategories').insert({
		category_id: categoryId,
		name: trimmed,
		slug,
		sort_order: nextOrder,
	});
	if (error) {
		return { ok: false, message: error.message };
	}
	await revalidateShopCategoryPaths();
	return { ok: true };
}

export async function updateShopSubcategoryAction(
	id: string,
	categoryId: string,
	name: string,
	slugHint?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const supabase = await createClient();
	const auth = await requireUser(supabase);
	if (!auth.user) {
		return { ok: false, message: auth.error };
	}
	const trimmed = name.trim();
	if (!trimmed) {
		return { ok: false, message: 'El nombre no puede quedar vacío.' };
	}
	const base = slugifyLabel((slugHint ?? '').trim() || trimmed);
	const slug = await uniqueSubcategorySlug(supabase, categoryId, base, id);
	const { error } = await supabase
		.from('shop_subcategories')
		.update({ name: trimmed, slug, updated_at: new Date().toISOString() })
		.eq('id', id);
	if (error) {
		return { ok: false, message: error.message };
	}
	await revalidateShopCategoryPaths();
	return { ok: true };
}

export async function deleteShopSubcategoryAction(
	id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const supabase = await createClient();
	const auth = await requireUser(supabase);
	if (!auth.user) {
		return { ok: false, message: auth.error };
	}
	const { error } = await supabase.from('shop_subcategories').delete().eq('id', id);
	if (error) {
		return { ok: false, message: error.message };
	}
	await revalidateShopCategoryPaths();
	return { ok: true };
}

/**
 * Para import masivo: busca por slug/nombre; si no existe categoría o subcategoría, las crea.
 * Devuelve el valor para `products.category`: `slugPadre` o `slugPadre/slugHijo`.
 */
export async function ensureShopCategoryPathForImport(
	categoryName: string,
	subcategoryName: string | null | undefined,
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
	const supabase = await createClient();
	const auth = await requireUser(supabase);
	if (!auth.user) {
		return { ok: false, message: auth.error };
	}

	const catRaw = categoryName.trim();
	if (!catRaw) {
		return { ok: false, message: 'La categoría es obligatoria.' };
	}

	const catSlugBase = slugifyLabel(catRaw);
	let { data: existingCat } = await supabase
		.from('shop_categories')
		.select('id, slug')
		.eq('slug', catSlugBase)
		.maybeSingle();

	if (!existingCat) {
		const { data: byName } = await supabase
			.from('shop_categories')
			.select('id, slug')
			.ilike('name', catRaw)
			.limit(1)
			.maybeSingle();
		if (byName) {
			existingCat = byName as { id: string; slug: string };
		}
	}

	let catId: string;
	let catSlug: string;

	if (existingCat) {
		catId = existingCat.id;
		catSlug = existingCat.slug;
	} else {
		const slug = await uniqueCategorySlug(supabase, catSlugBase);
		const { data: maxRow } = await supabase
			.from('shop_categories')
			.select('sort_order')
			.order('sort_order', { ascending: false })
			.limit(1)
			.maybeSingle();
		const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
		const { data: inserted, error: insErr } = await supabase
			.from('shop_categories')
			.insert({ name: catRaw, slug, sort_order: nextOrder })
			.select('id, slug')
			.single();
		if (insErr) {
			return { ok: false, message: insErr.message };
		}
		catId = inserted.id;
		catSlug = inserted.slug;
	}

	const subRaw = subcategoryName?.trim() ?? '';
	if (!subRaw) {
		return { ok: true, path: catSlug };
	}

	const subSlugBase = slugifyLabel(subRaw);
	let { data: existingSub } = await supabase
		.from('shop_subcategories')
		.select('id, slug')
		.eq('category_id', catId)
		.eq('slug', subSlugBase)
		.maybeSingle();

	if (!existingSub) {
		const { data: byNameSub } = await supabase
			.from('shop_subcategories')
			.select('id, slug')
			.eq('category_id', catId)
			.ilike('name', subRaw)
			.limit(1)
			.maybeSingle();
		if (byNameSub) {
			existingSub = byNameSub as { id: string; slug: string };
		}
	}

	let subSlug: string;
	if (existingSub) {
		subSlug = existingSub.slug;
	} else {
		const slug = await uniqueSubcategorySlug(supabase, catId, subSlugBase);
		const { data: maxRow } = await supabase
			.from('shop_subcategories')
			.select('sort_order')
			.eq('category_id', catId)
			.order('sort_order', { ascending: false })
			.limit(1)
			.maybeSingle();
		const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
		const { data: inserted, error: subErr } = await supabase
			.from('shop_subcategories')
			.insert({
				category_id: catId,
				name: subRaw,
				slug,
				sort_order: nextOrder,
			})
			.select('slug')
			.single();
		if (subErr) {
			return { ok: false, message: subErr.message };
		}
		subSlug = inserted.slug;
	}

	return { ok: true, path: `${catSlug}/${subSlug}` };
}

'use server';

import { revalidatePath } from 'next/cache';
import { requireSessionUser } from '@/lib/firebase/auth-server';
import {
	deleteShopCategory,
	deleteShopSubcategory,
	findCategoryByName,
	findCategoryBySlug,
	findSubcategoryByName,
	findSubcategoryBySlug,
	getMaxCategorySortOrder,
	getMaxSubcategorySortOrder,
	insertShopCategory,
	insertShopSubcategory,
	listShopCategoryTree,
	updateShopCategory,
	updateShopSubcategory,
} from '@/lib/firebase/categories';
import { slugifyLabel, type ShopCategoryTree } from '@/lib/data/shopCategories';

function firebaseErrorMessage(e: unknown, fallback: string): string {
	const msg = e instanceof Error ? e.message : fallback;
	if (msg.includes('credential') || msg.includes('FIREBASE')) {
		return 'No se pudo conectar con Firebase. Revisá FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en .env.local.';
	}
	return msg || fallback;
}

export async function revalidateShopCategoryPaths() {
	revalidatePath('/app/categorias');
	revalidatePath('/app/cargar-producto');
	revalidatePath('/app/productos');
	revalidatePath('/catalogo');
	revalidatePath('/');
}

async function requireUser() {
	const user = await requireSessionUser();
	if ('error' in user) return { user: null, error: user.error };
	return { user, error: null };
}

async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
	let slug = base;
	let n = 0;
	for (;;) {
		const row = await findCategoryBySlug(slug);
		if (!row) return slug;
		if (excludeId && row.id === excludeId) return slug;
		n += 1;
		slug = `${base}-${n}`;
	}
}

async function uniqueSubcategorySlug(
	categoryId: string,
	base: string,
	excludeId?: string,
): Promise<string> {
	let slug = base;
	let n = 0;
	for (;;) {
		const row = await findSubcategoryBySlug(categoryId, slug);
		if (!row) return slug;
		if (excludeId && row.id === excludeId) return slug;
		n += 1;
		slug = `${base}-${n}`;
	}
}

export async function listShopCategoryTreeAction(): Promise<ShopCategoryTree[]> {
	try {
		return await listShopCategoryTree();
	} catch (e) {
		console.error('[listShopCategoryTreeAction]', e);
		throw new Error(firebaseErrorMessage(e, 'No se pudieron cargar las categorías.'));
	}
}

export async function createShopCategoryAction(
	name: string,
	slugHint?: string | null,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
	const auth = await requireUser();
	if (!auth.user) return { ok: false, message: auth.error };

	const trimmed = name.trim();
	if (!trimmed) return { ok: false, message: 'El nombre de la categoría es obligatorio.' };

	try {
		const base = slugifyLabel((slugHint ?? '').trim() || trimmed);
		const slug = await uniqueCategorySlug(base);
		const nextOrder = (await getMaxCategorySortOrder()) + 1;
		const now = new Date().toISOString();

		const id = await insertShopCategory({
			name: trimmed,
			slug,
			sort_order: nextOrder,
			created_at: now,
			updated_at: now,
		});

		await revalidateShopCategoryPaths();
		return { ok: true, id };
	} catch (e) {
		return { ok: false, message: firebaseErrorMessage(e, 'No se pudo crear la categoría.') };
	}
}

export async function updateShopCategoryAction(
	id: string,
	name: string,
	slugHint?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const auth = await requireUser();
	if (!auth.user) return { ok: false, message: auth.error };

	const trimmed = name.trim();
	if (!trimmed) return { ok: false, message: 'El nombre no puede quedar vacío.' };

	try {
		const base = slugifyLabel((slugHint ?? '').trim() || trimmed);
		const slug = await uniqueCategorySlug(base, id);
		await updateShopCategory(id, { name: trimmed, slug, updated_at: new Date().toISOString() });
		await revalidateShopCategoryPaths();
		return { ok: true };
	} catch (e) {
		return { ok: false, message: firebaseErrorMessage(e, 'No se pudo actualizar la categoría.') };
	}
}

export async function deleteShopCategoryAction(
	id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const auth = await requireUser();
	if (!auth.user) return { ok: false, message: auth.error };

	try {
		await deleteShopCategory(id);
		await revalidateShopCategoryPaths();
		return { ok: true };
	} catch (e) {
		return { ok: false, message: firebaseErrorMessage(e, 'No se pudo eliminar la categoría.') };
	}
}

export async function createShopSubcategoryAction(
	categoryId: string,
	name: string,
	slugHint?: string | null,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
	const auth = await requireUser();
	if (!auth.user) return { ok: false, message: auth.error };

	const trimmed = name.trim();
	if (!trimmed) return { ok: false, message: 'El nombre de la subcategoría es obligatorio.' };
	if (!categoryId) return { ok: false, message: 'Elegí una categoría padre.' };

	try {
		const base = slugifyLabel((slugHint ?? '').trim() || trimmed);
		const slug = await uniqueSubcategorySlug(categoryId, base);
		const nextOrder = (await getMaxSubcategorySortOrder(categoryId)) + 1;
		const now = new Date().toISOString();

		const id = await insertShopSubcategory({
			category_id: categoryId,
			name: trimmed,
			slug,
			sort_order: nextOrder,
			created_at: now,
			updated_at: now,
		});

		await revalidateShopCategoryPaths();
		return { ok: true, id };
	} catch (e) {
		return { ok: false, message: firebaseErrorMessage(e, 'No se pudo crear la subcategoría.') };
	}
}

export async function updateShopSubcategoryAction(
	id: string,
	categoryId: string,
	name: string,
	slugHint?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const auth = await requireUser();
	if (!auth.user) return { ok: false, message: auth.error };

	const trimmed = name.trim();
	if (!trimmed) return { ok: false, message: 'El nombre no puede quedar vacío.' };

	try {
		const base = slugifyLabel((slugHint ?? '').trim() || trimmed);
		const slug = await uniqueSubcategorySlug(categoryId, base, id);
		await updateShopSubcategory(id, { name: trimmed, slug, updated_at: new Date().toISOString() });
		await revalidateShopCategoryPaths();
		return { ok: true };
	} catch (e) {
		return { ok: false, message: firebaseErrorMessage(e, 'No se pudo actualizar la subcategoría.') };
	}
}

export async function deleteShopSubcategoryAction(
	id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const auth = await requireUser();
	if (!auth.user) return { ok: false, message: auth.error };

	try {
		await deleteShopSubcategory(id);
		await revalidateShopCategoryPaths();
		return { ok: true };
	} catch (e) {
		return { ok: false, message: firebaseErrorMessage(e, 'No se pudo eliminar la subcategoría.') };
	}
}

export async function ensureShopCategoryPathForImport(
	categoryName: string,
	subcategoryName: string | null | undefined,
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
	const auth = await requireUser();
	if (!auth.user) return { ok: false, message: auth.error };

	const catRaw = categoryName.trim();
	if (!catRaw) return { ok: false, message: 'La categoría es obligatoria.' };

	try {
		const catSlugBase = slugifyLabel(catRaw);
		let existingCat = await findCategoryBySlug(catSlugBase);
		if (!existingCat) {
			existingCat = await findCategoryByName(catRaw);
		}

		let catId: string;
		let catSlug: string;

		if (existingCat) {
			catId = existingCat.id;
			catSlug = String(existingCat.slug);
		} else {
			const slug = await uniqueCategorySlug(catSlugBase);
			const nextOrder = (await getMaxCategorySortOrder()) + 1;
			const now = new Date().toISOString();
			catId = await insertShopCategory({
				name: catRaw,
				slug,
				sort_order: nextOrder,
				created_at: now,
				updated_at: now,
			});
			catSlug = slug;
		}

		const subRaw = subcategoryName?.trim() ?? '';
		if (!subRaw) return { ok: true, path: catSlug };

		const subSlugBase = slugifyLabel(subRaw);
		let existingSub = await findSubcategoryBySlug(catId, subSlugBase);
		if (!existingSub) {
			existingSub = await findSubcategoryByName(catId, subRaw);
		}

		let subSlug: string;
		if (existingSub) {
			subSlug = String(existingSub.slug);
		} else {
			subSlug = await uniqueSubcategorySlug(catId, subSlugBase);
			const nextOrder = (await getMaxSubcategorySortOrder(catId)) + 1;
			const now = new Date().toISOString();
			await insertShopSubcategory({
				category_id: catId,
				name: subRaw,
				slug: subSlug,
				sort_order: nextOrder,
				created_at: now,
				updated_at: now,
			});
		}

		return { ok: true, path: `${catSlug}/${subSlug}` };
	} catch (e) {
		return { ok: false, message: firebaseErrorMessage(e, 'No se pudo resolver la categoría.') };
	}
}

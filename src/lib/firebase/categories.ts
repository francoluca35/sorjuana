import { COLLECTIONS, getAdminDb } from '@/lib/firebase/admin';
import type { ShopCategoryTree, ShopSubcategoryRow } from '@/lib/data/shopCategories';

function sortByOrderThenName<T extends { sort_order?: number; name?: string }>(rows: T[]): T[] {
	return [...rows].sort((a, b) => {
		const orderDiff = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
		if (orderDiff !== 0) return orderDiff;
		return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es');
	});
}

export async function listShopCategoryTree(): Promise<ShopCategoryTree[]> {
	const db = getAdminDb();
	const [catsSnap, subsSnap] = await Promise.all([
		db.collection(COLLECTIONS.shopCategories).get(),
		db.collection(COLLECTIONS.shopSubcategories).get(),
	]);

	const subsByCat = new Map<string, ShopSubcategoryRow[]>();
	for (const doc of subsSnap.docs) {
		const row = { id: doc.id, ...doc.data() } as ShopSubcategoryRow;
		const list = subsByCat.get(row.category_id) ?? [];
		list.push(row);
		subsByCat.set(row.category_id, list);
	}

	const cats = sortByOrderThenName(
		catsSnap.docs.map((doc) => ({
			id: doc.id,
			...(doc.data() as Omit<ShopCategoryTree, 'id' | 'subcategories'>),
		})),
	);

	return cats.map((c) => ({
		...c,
		subcategories: sortByOrderThenName(subsByCat.get(c.id) ?? []),
	}));
}

export async function findCategoryBySlug(slug: string): Promise<{ id: string; slug?: string; name?: string } | null> {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.shopCategories)
		.where('slug', '==', slug)
		.limit(1)
		.get();
	if (snap.empty) return null;
	const doc = snap.docs[0]!;
	return { id: doc.id, ...doc.data() };
}

export async function findSubcategoryBySlug(
	categoryId: string,
	slug: string,
): Promise<{ id: string; slug?: string; name?: string } | null> {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.shopSubcategories)
		.where('category_id', '==', categoryId)
		.where('slug', '==', slug)
		.limit(1)
		.get();
	if (snap.empty) return null;
	const doc = snap.docs[0]!;
	return { id: doc.id, ...doc.data() };
}

export async function insertShopCategory(row: Record<string, unknown>): Promise<string> {
	const ref = getAdminDb().collection(COLLECTIONS.shopCategories).doc();
	await ref.set(row);
	return ref.id;
}

export async function updateShopCategory(id: string, patch: Record<string, unknown>): Promise<void> {
	await getAdminDb().collection(COLLECTIONS.shopCategories).doc(id).update(patch);
}

export async function deleteShopCategory(id: string): Promise<void> {
	const db = getAdminDb();
	const subs = await db.collection(COLLECTIONS.shopSubcategories).where('category_id', '==', id).get();
	const batch = db.batch();
	for (const doc of subs.docs) batch.delete(doc.ref);
	batch.delete(db.collection(COLLECTIONS.shopCategories).doc(id));
	await batch.commit();
}

export async function insertShopSubcategory(row: Record<string, unknown>): Promise<string> {
	const ref = getAdminDb().collection(COLLECTIONS.shopSubcategories).doc();
	await ref.set(row);
	return ref.id;
}

export async function updateShopSubcategory(id: string, patch: Record<string, unknown>): Promise<void> {
	await getAdminDb().collection(COLLECTIONS.shopSubcategories).doc(id).update(patch);
}

export async function deleteShopSubcategory(id: string): Promise<void> {
	await getAdminDb().collection(COLLECTIONS.shopSubcategories).doc(id).delete();
}

export async function getMaxCategorySortOrder(): Promise<number> {
	const snap = await getAdminDb().collection(COLLECTIONS.shopCategories).get();
	let max = 0;
	for (const doc of snap.docs) {
		max = Math.max(max, Number(doc.data().sort_order) || 0);
	}
	return max;
}

export async function getMaxSubcategorySortOrder(categoryId: string): Promise<number> {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.shopSubcategories)
		.where('category_id', '==', categoryId)
		.get();
	let max = 0;
	for (const doc of snap.docs) {
		max = Math.max(max, Number(doc.data().sort_order) || 0);
	}
	return max;
}

export async function findCategoryByName(name: string): Promise<{ id: string; slug?: string; name?: string } | null> {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.shopCategories)
		.where('name', '==', name)
		.limit(1)
		.get();
	if (snap.empty) return null;
	const doc = snap.docs[0]!;
	return { id: doc.id, ...doc.data() };
}

export async function findSubcategoryByName(
	categoryId: string,
	name: string,
): Promise<{ id: string; slug?: string; name?: string } | null> {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.shopSubcategories)
		.where('category_id', '==', categoryId)
		.where('name', '==', name)
		.limit(1)
		.get();
	if (snap.empty) return null;
	const doc = snap.docs[0]!;
	return { id: doc.id, ...doc.data() };
}

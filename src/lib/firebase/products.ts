import { FieldPath } from 'firebase-admin/firestore';
import { COLLECTIONS, getAdminDb } from '@/lib/firebase/admin';
import { normalizeProductRow, type ProductRow } from '@/lib/data/productCatalog';

export const STOREFRONT_CATALOG_PAGE_SIZE = 150;

const STOREFRONT_CATALOG_FILTERED_CAP = 2500;
const ALL_PRODUCTS_PAGE = 1000;
const SUBSLUG_SCAN_PAGE = 800;
const SUBSLUG_SCAN_MAX_ROWS = 50_000;

function mapDoc(id: string, data: FirebaseFirestore.DocumentData): ProductRow {
	return normalizeProductRow({ id, ...data });
}

function applyHiddenFilter(rows: ProductRow[], includeHidden?: boolean): ProductRow[] {
	if (includeHidden) return rows;
	return rows.filter((r) => !r.is_hidden);
}

export async function fetchProductsOrdered(
	limit: number,
	options?: { offset?: number; includeHidden?: boolean },
): Promise<ProductRow[]> {
	try {
		const db = getAdminDb();
		const safeLimit = Math.min(Math.max(limit, 1), 300);
		const offset = Math.max(0, Math.floor(options?.offset ?? 0));

		const query = db
			.collection(COLLECTIONS.products)
			.orderBy('created_at', 'desc')
			.offset(offset)
			.limit(safeLimit + (options?.includeHidden ? 0 : 50));

		const snap = await query.get();
		let rows = snap.docs.map((d) => mapDoc(d.id, d.data()));
		rows = applyHiddenFilter(rows, options?.includeHidden);
		return rows.slice(0, safeLimit);
	} catch (e) {
		console.error('[fetchProductsOrdered]', e);
		return [];
	}
}

export async function fetchRecentProducts(
	limit = 12,
	options?: { includeHidden?: boolean },
): Promise<ProductRow[]> {
	return fetchProductsOrdered(Math.min(Math.max(limit, 1), 500), {
		includeHidden: options?.includeHidden,
	});
}

export async function fetchStorefrontCatalogPage(
	offset: number,
	limit: number = STOREFRONT_CATALOG_PAGE_SIZE,
): Promise<ProductRow[]> {
	return fetchProductsOrdered(limit, { offset });
}

export async function fetchAllProductsForPanel(): Promise<ProductRow[]> {
	const db = getAdminDb();
	const all: ProductRow[] = [];
	let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

	for (;;) {
		let query = db.collection(COLLECTIONS.products).orderBy('created_at', 'desc').limit(ALL_PRODUCTS_PAGE);
		if (lastDoc) query = query.startAfter(lastDoc);
		const snap = await query.get();
		if (snap.empty) break;
		all.push(...snap.docs.map((d) => mapDoc(d.id, d.data())));
		if (snap.size < ALL_PRODUCTS_PAGE) break;
		lastDoc = snap.docs[snap.docs.length - 1];
	}
	return all;
}

export async function fetchProductsByIds(
	ids: string[],
	options?: { includeHidden?: boolean },
): Promise<ProductRow[]> {
	const uniq = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))];
	if (uniq.length === 0) return [];

	const db = getAdminDb();
	const out: ProductRow[] = [];

	for (let i = 0; i < uniq.length; i += 30) {
		const batch = uniq.slice(i, i + 30);
		const snap = await db.collection(COLLECTIONS.products).where(FieldPath.documentId(), 'in', batch).get();
		out.push(...snap.docs.map((d) => mapDoc(d.id, d.data())));
	}

	return applyHiddenFilter(out, options?.includeHidden);
}

export async function fetchLatestProductCreatedAt(): Promise<string | null> {
	const db = getAdminDb();
	const snap = await db.collection(COLLECTIONS.products).orderBy('created_at', 'desc').limit(1).get();
	if (snap.empty) return null;
	const data = snap.docs[0]!.data();
	return typeof data.created_at === 'string' ? data.created_at : null;
}

async function fetchShopSlugSet(collection: string): Promise<Set<string>> {
	const db = getAdminDb();
	const snap = await db.collection(collection).select('slug').get();
	const out = new Set<string>();
	for (const doc of snap.docs) {
		const sl = String(doc.data().slug ?? '')
			.trim()
			.toLowerCase();
		if (sl) out.add(sl);
	}
	return out;
}

function sanitizeCategorySlugParam(raw: string | undefined): string | null {
	if (!raw?.trim()) return null;
	const s = raw.trim().toLowerCase();
	if (!/^[a-z0-9_-]{1,64}$/.test(s)) return null;
	return s;
}

function parseCategoryPathSegments(category: string | null | undefined): string[] {
	if (!category?.trim()) return [];
	return category
		.split('/')
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
}

function categoryPathMatchesTipoSlug(category: string | null | undefined, tipoSlug: string): boolean {
	const parts = parseCategoryPathSegments(category);
	if (!tipoSlug || parts.length === 0) return false;
	if (parts.length === 1) return parts[0] === tipoSlug;
	return parts.slice(1).some((seg) => seg === tipoSlug);
}

function categoryMatchesLineAndTipo(category: string | null | undefined, lineSlug: string, tipoSlug: string): boolean {
	const cat = (category ?? '').trim().toLowerCase();
	if (!cat) return false;
	return cat === `${lineSlug}/${tipoSlug}` || cat.startsWith(`${lineSlug}/${tipoSlug}/`);
}

function categoryMatchesLine(category: string | null | undefined, lineSlug: string): boolean {
	const cat = (category ?? '').trim().toLowerCase();
	if (!cat) return false;
	return cat === lineSlug || cat.startsWith(`${lineSlug}/`);
}

async function fetchAllVisibleProducts(limit = STOREFRONT_CATALOG_FILTERED_CAP): Promise<ProductRow[]> {
	const db = getAdminDb();
	const snap = await db
		.collection(COLLECTIONS.products)
		.orderBy('created_at', 'desc')
		.limit(limit)
		.get();
	return applyHiddenFilter(snap.docs.map((d) => mapDoc(d.id, d.data())));
}

export async function fetchStorefrontCatalogRows(params: {
	categoria?: string;
	filter?: string;
}): Promise<ProductRow[]> {
	const c = sanitizeCategorySlugParam(params.categoria);
	const f = sanitizeCategorySlugParam(params.filter);
	if (!c && !f) {
		return fetchStorefrontCatalogPage(0, STOREFRONT_CATALOG_PAGE_SIZE);
	}

	const parentSet = await fetchShopSlugSet(COLLECTIONS.shopCategories);
	const subSlugSet = await fetchShopSlugSet(COLLECTIONS.shopSubcategories);

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

	const all = await fetchAllVisibleProducts();

	if (lineSlug && tipoSlug) {
		return all.filter((r) => categoryMatchesLineAndTipo(r.category, lineSlug!, tipoSlug!));
	}
	if (lineSlug) {
		return all.filter((r) => categoryMatchesLine(r.category, lineSlug!));
	}
	if (tipoSlug) {
		return all.filter((r) => categoryPathMatchesTipoSlug(r.category, tipoSlug!));
	}

	return fetchStorefrontCatalogPage(0, STOREFRONT_CATALOG_PAGE_SIZE);
}

export async function insertProductDoc(id: string, row: Record<string, unknown>): Promise<void> {
	const db = getAdminDb();
	const now = new Date().toISOString();
	await db
		.collection(COLLECTIONS.products)
		.doc(id)
		.set({
			...row,
			is_hidden: row.is_hidden ?? false,
			created_at: now,
			updated_at: now,
		});
}

export async function updateProductDoc(id: string, patch: Record<string, unknown>): Promise<void> {
	await getAdminDb()
		.collection(COLLECTIONS.products)
		.doc(id)
		.update({
			...patch,
			updated_at: new Date().toISOString(),
		});
}

export async function insertProductsBatch(rows: Record<string, unknown>[]): Promise<number> {
	const db = getAdminDb();
	const batch = db.batch();
	const now = new Date().toISOString();
	for (const row of rows) {
		const id = crypto.randomUUID();
		const ref = db.collection(COLLECTIONS.products).doc(id);
		batch.set(ref, { ...row, is_hidden: row.is_hidden ?? false, created_at: now, updated_at: now });
	}
	await batch.commit();
	return rows.length;
}

export async function upsertProductsBatchWithIds(
	rows: { id: string; data: Record<string, unknown> }[],
): Promise<number> {
	if (rows.length === 0) return 0;

	const db = getAdminDb();
	const now = new Date().toISOString();
	const chunkSize = 400;

	for (let offset = 0; offset < rows.length; offset += chunkSize) {
		const chunk = rows.slice(offset, offset + chunkSize);
		const batch = db.batch();
		for (const row of chunk) {
			const ref = db.collection(COLLECTIONS.products).doc(row.id);
			batch.set(
				ref,
				{
					...row.data,
					is_hidden: row.data.is_hidden ?? false,
					created_at: row.data.created_at ?? now,
					updated_at: now,
				},
				{ merge: false },
			);
		}
		await batch.commit();
	}

	return rows.length;
}

export async function deleteProductDocs(ids: string[]): Promise<string[]> {
	const db = getAdminDb();
	const deleted: string[] = [];
	const batch = db.batch();

	for (const id of ids) {
		const ref = db.collection(COLLECTIONS.products).doc(id);
		const snap = await ref.get();
		if (!snap.exists) continue;
		batch.delete(ref);
		deleted.push(id);
	}

	if (deleted.length > 0) await batch.commit();
	return deleted;
}

export async function setProductsHidden(ids: string[], hidden: boolean): Promise<void> {
	const db = getAdminDb();
	const batch = db.batch();
	for (const id of ids) {
		batch.update(db.collection(COLLECTIONS.products).doc(id), { is_hidden: hidden });
	}
	await batch.commit();
}

export async function fetchAllProductsForPricing(): Promise<{ id: string; base_price: number | null }[]> {
	const db = getAdminDb();
	const out: { id: string; base_price: number | null }[] = [];
	let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

	for (;;) {
		let query = db.collection(COLLECTIONS.products).orderBy('created_at', 'desc').limit(500);
		if (lastDoc) query = query.startAfter(lastDoc);
		const snap = await query.get();
		if (snap.empty) break;
		for (const doc of snap.docs) {
			const data = doc.data();
			out.push({ id: doc.id, base_price: data.base_price ?? null });
		}
		if (snap.size < 500) break;
		lastDoc = snap.docs[snap.docs.length - 1];
	}
	return out;
}

export async function fetchProductsStockAndCost(): Promise<
	{
		id: string;
		stock: number;
		cost: number | null;
		base_price: number | null;
		name: string;
		category: string | null;
		price: number;
		transfer_price: number | null;
		final_transfer_price: number | null;
	}[]
> {
	const snap = await getAdminDb().collection(COLLECTIONS.products).get();
	return snap.docs.map((d) => {
		const data = d.data();
		return {
			id: d.id,
			stock: Number(data.stock) || 0,
			cost: data.cost ?? null,
			base_price: data.base_price ?? null,
			name: String(data.name ?? ''),
			category: data.category ?? null,
			price: Number(data.price) || 0,
			transfer_price: data.transfer_price ?? null,
			final_transfer_price: data.final_transfer_price ?? null,
		};
	});
}

export async function fetchProductsStockOnly(): Promise<{ stock: number }[]> {
	const snap = await getAdminDb().collection(COLLECTIONS.products).select('stock').get();
	return snap.docs.map((d) => ({ stock: Number(d.data().stock) || 0 }));
}

export async function fetchProductsCategoryMedia(limit = 500): Promise<
	{ category: string | null; image_url: string | null; image_urls: string[] }[]
> {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.products)
		.orderBy('created_at', 'desc')
		.limit(limit)
		.get();
	return snap.docs
		.map((d) => d.data())
		.filter((d) => d.category)
		.map((d) => ({
			category: d.category ?? null,
			image_url: d.image_url ?? null,
			image_urls: Array.isArray(d.image_urls) ? d.image_urls : [],
		}));
}

export { SUBSLUG_SCAN_MAX_ROWS, SUBSLUG_SCAN_PAGE };

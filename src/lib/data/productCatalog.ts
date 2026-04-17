/** Tipos y helpers del catálogo sin dependencias de servidor (seguro para Client Components). */

import { parseSizeInventoryFromDb, type SizeInventoryRow } from '@/lib/data/productSizes';

export type { SizeInventoryRow } from '@/lib/data/productSizes';

export type ProductRow = {
	id: string;
	name: string;
	category: string | null;
	price: number;
	compare_at_price: number | null;
	image_url: string | null;
	created_at: string;
	kind: string;
	stock: number;
	cost: number | null;
	base_price: number | null;
	transfer_price: number | null;
	final_transfer_price: number | null;
	tax_applies: boolean;
	tax_percent: number | null;
	description: string | null;
	color: string | null;
	product_code: string | null;
	image_urls: string[];
	video_url: string | null;
	min_order_qty: number | null;
	max_order_qty: number | null;
	/** Talles y cantidades; vacío si solo se usa `stock` legacy */
	size_inventory: SizeInventoryRow[];
};

export type CatalogProduct = {
	id: string;
	code: string;
	name: string;
	/** Etiqueta para listado y filtros */
	category: string;
	/** Valor persistido en `products.category` (slug o texto libre) */
	category_db: string | null;
	stock: number;
	price: number;
	cost: number;
	image: string;
	description: string;
	color: string;
	promoPrice: number | null;
	kind: string;
	base_price: number;
	transfer_price: number;
	final_transfer_price: number;
	tax_applies: boolean;
	tax_percent: number | null;
	gallery_image_urls: string[];
	video_url: string | null;
	min_order_qty: number | null;
	max_order_qty: number | null;
	size_inventory: SizeInventoryRow[];
};

export const PLACEHOLDER_IMG =
	'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&q=70';

const CATEGORY_LABELS: Record<string, string> = {
	remeras: 'Remeras',
	pantalones: 'Pantalones',
	vestidos: 'Vestidos',
	abrigos: 'Abrigos',
	accesorios: 'Accesorios',
};

/** Slugs permitidos en `products.category` (panel admin / `category_db`). */
export const ADMIN_CATEGORY_SLUGS = [
	'remeras',
	'pantalones',
	'vestidos',
	'abrigos',
	'accesorios',
] as const;

export type AdminCategorySlug = (typeof ADMIN_CATEGORY_SLUGS)[number];

export function getAdminCategories(): { slug: AdminCategorySlug; label: string }[] {
	return ADMIN_CATEGORY_SLUGS.map((slug) => ({
		slug,
		label: CATEGORY_LABELS[slug] ?? slug,
	}));
}

export function displayCategoryLabel(raw: string | null | undefined): string {
	if (!raw?.trim()) return 'Sin categoría';
	const key = raw.trim().toLowerCase();
	return CATEGORY_LABELS[key] ?? raw.trim();
}

function toStr(v: unknown): string | null {
	if (v == null) return null;
	const s = String(v).trim();
	return s.length ? s : null;
}

function toNum(v: unknown): number {
	if (v == null || v === '') return 0;
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function toNumNull(v: unknown): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function toBool(v: unknown, defaultVal = false): boolean {
	if (v == null) return defaultVal;
	if (typeof v === 'boolean') return v;
	return Boolean(v);
}

function toStrArray(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

export function normalizeProductRow(raw: Record<string, unknown>): ProductRow {
	const imageUrls = toStrArray(raw.image_urls);
	const imageUrl = toStr(raw.image_url);
	const mergedGallery =
		imageUrls.length > 0
			? imageUrls
			: imageUrl
				? [imageUrl]
				: [];
	return {
		id: String(raw.id ?? ''),
		name: String(raw.name ?? ''),
		category: toStr(raw.category),
		price: toNum(raw.price),
		compare_at_price: toNumNull(raw.compare_at_price),
		image_url: imageUrl,
		created_at: String(raw.created_at ?? ''),
		kind: toStr(raw.kind) ?? 'producto',
		stock: Math.max(0, Math.floor(toNum(raw.stock))),
		cost: toNumNull(raw.cost),
		base_price: toNumNull(raw.base_price),
		transfer_price: toNumNull(raw.transfer_price),
		final_transfer_price: toNumNull(raw.final_transfer_price),
		tax_applies: toBool(raw.tax_applies, false),
		tax_percent: toNumNull(raw.tax_percent),
		description: toStr(raw.description),
		color: toStr(raw.color),
		product_code: toStr(raw.product_code),
		image_urls: mergedGallery,
		video_url: toStr(raw.video_url),
		min_order_qty:
			raw.min_order_qty == null || raw.min_order_qty === ''
				? null
				: Math.max(0, Math.floor(toNum(raw.min_order_qty))),
		max_order_qty:
			raw.max_order_qty == null || raw.max_order_qty === ''
				? null
				: Math.max(0, Math.floor(toNum(raw.max_order_qty))),
		size_inventory: parseSizeInventoryFromDb(raw.size_inventory),
	};
}

export function productRowToCatalogProduct(row: ProductRow): CatalogProduct {
	const urls = row.image_urls?.length ? row.image_urls : row.image_url ? [row.image_url] : [];
	const primary = urls[0] || row.image_url?.trim() || PLACEHOLDER_IMG;
	const dbCat = row.category;
	return {
		id: row.id,
		code: row.product_code?.trim() || '—',
		name: row.name,
		category: displayCategoryLabel(dbCat),
		category_db: dbCat,
		stock: row.stock,
		price: row.price,
		cost: row.cost != null ? row.cost : 0,
		image: primary,
		description: row.description?.trim() ?? '',
		color: row.color?.trim() ?? '',
		promoPrice: row.compare_at_price,
		kind: row.kind || 'producto',
		base_price: row.base_price != null ? row.base_price : 0,
		transfer_price: row.transfer_price != null ? row.transfer_price : 0,
		final_transfer_price: row.final_transfer_price != null ? row.final_transfer_price : 0,
		tax_applies: row.tax_applies,
		tax_percent: row.tax_percent != null ? row.tax_percent : null,
		gallery_image_urls: urls,
		video_url: row.video_url,
		min_order_qty: row.min_order_qty,
		max_order_qty: row.max_order_qty,
		size_inventory: row.size_inventory.length ? [...row.size_inventory] : [],
	};
}

import { getSiteHomeConfigDoc } from '@/lib/firebase/config';
import { fetchProductsCategoryMedia } from '@/lib/firebase/products';
import {
	getDefaultCategorySpotlightRail,
	parseCategorySpotlightRailFromJson,
	type CategorySpotlightRailItem,
} from '@/lib/categorySpotlightRailConfig';

export type CategorySpotlight = CategorySpotlightRailItem;

function pickImage(row: Record<string, unknown>): string | null {
	const urls = row.image_urls;
	if (Array.isArray(urls)) {
		const first = urls.find((x): x is string => typeof x === 'string' && x.trim().length > 0);
		if (first) return first.trim();
	}
	const u = row.image_url;
	if (typeof u === 'string' && u.trim().length > 0) return u.trim();
	return null;
}

function findProductImageForSlug(
	data: { category?: string | null; image_url?: string | null; image_urls?: string[] }[],
	slug: string,
): string | null {
	const needle = slug.trim().toLowerCase();
	if (!needle) return null;
	for (const row of data) {
		const cat = String(row.category ?? '').trim().toLowerCase();
		if (!cat.includes(needle)) continue;
		const img = pickImage(row as Record<string, unknown>);
		if (img) return img;
	}
	return null;
}

export async function fetchCategorySpotlights(): Promise<CategorySpotlight[]> {
	try {
		const [cfgRow, data] = await Promise.all([getSiteHomeConfigDoc(), fetchProductsCategoryMedia()]);

		const published = parseCategorySpotlightRailFromJson(cfgRow?.category_spotlight_rail);
		const usesClientDefaults =
			!published?.length || !published.some((item) => item.slug === 'chic-europeo');
		const base = usesClientDefaults ? getDefaultCategorySpotlightRail() : published;

		if (!data.length) return base;

		return base.map((item) => ({
			...item,
			imageUrl: findProductImageForSlug(data, item.slug) ?? item.imageUrl,
		}));
	} catch {
		return getDefaultCategorySpotlightRail();
	}
}

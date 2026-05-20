import { createClient } from '@/lib/supabase/server';
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

/** Primera imagen de producto cuya ruta `category` contiene el slug de marketing. */
function findProductImageForSlug(
	data: { category?: string }[],
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

/**
 * Imágenes por categoría para el rail: override publicado en `site_home_config`, o primera foto de producto por slug.
 */
export async function fetchCategorySpotlights(): Promise<CategorySpotlight[]> {
	const supabase = await createClient();

	const [{ data: cfgRow }, productsQuery] = await Promise.all([
		supabase.from('site_home_config').select('category_spotlight_rail').eq('id', 1).maybeSingle(),
		supabase.from('products').select('category,image_url,image_urls').not('category', 'is', null).limit(500),
	]);

	const published = parseCategorySpotlightRailFromJson(cfgRow?.category_spotlight_rail);
	const usesClientDefaults =
		!published?.length || !published.some((item) => item.slug === 'chic-europeo');
	const base = usesClientDefaults ? getDefaultCategorySpotlightRail() : published;
	const data = productsQuery.data;
	const error = productsQuery.error;

	if (error || !data?.length) {
		return base;
	}

	return base.map((item) => ({
		...item,
		imageUrl: findProductImageForSlug(data, item.slug) ?? item.imageUrl,
	}));
}

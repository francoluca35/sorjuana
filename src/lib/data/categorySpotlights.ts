import { createClient } from '@/lib/supabase/server';
import type { AdminCategorySlug } from '@/lib/data/productCatalog';
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
	if (published?.length) {
		return published;
	}

	const base = getDefaultCategorySpotlightRail();
	const data = productsQuery.data;
	const error = productsQuery.error;

	if (error || !data?.length) {
		return base;
	}

	const bySlug = new Map<AdminCategorySlug, string>();
	for (const slug of base.map((b) => b.slug as AdminCategorySlug)) {
		const row = data.find(
			(r) =>
				String((r as { category?: string }).category ?? '')
					.trim()
					.toLowerCase() === slug,
		);
		if (row) {
			const img = pickImage(row as Record<string, unknown>);
			if (img) bySlug.set(slug, img);
		}
	}

	return base.map((item) => ({
		...item,
		imageUrl: bySlug.get(item.slug as AdminCategorySlug) ?? item.imageUrl,
	}));
}

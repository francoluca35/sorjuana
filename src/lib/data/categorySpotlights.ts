import { createClient } from '@/lib/supabase/server';
import {
	ADMIN_CATEGORY_SLUGS,
	displayCategoryLabel,
	type AdminCategorySlug,
} from '@/lib/data/productCatalog';

export type CategorySpotlight = {
	slug: AdminCategorySlug;
	label: string;
	imageUrl: string;
};

const FALLBACK_IMAGE: Record<AdminCategorySlug, string> = {
	remeras:
		'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=400&q=80',
	pantalones:
		'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=400&q=80',
	vestidos:
		'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80',
	abrigos:
		'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=400&q=80',
	accesorios:
		'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=400&q=80',
};

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
 * Una imagen por categoría admin: primera coincidencia en `products.category` (slug en minúsculas).
 */
export async function fetchCategorySpotlights(): Promise<CategorySpotlight[]> {
	const base: CategorySpotlight[] = ADMIN_CATEGORY_SLUGS.map((slug) => ({
		slug,
		label: displayCategoryLabel(slug),
		imageUrl: FALLBACK_IMAGE[slug],
	}));

	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from('products')
			.select('category,image_url,image_urls')
			.not('category', 'is', null)
			.limit(500);

		if (error || !data?.length) {
			return base;
		}

		const bySlug = new Map<AdminCategorySlug, string>();
		for (const slug of ADMIN_CATEGORY_SLUGS) {
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
			imageUrl: bySlug.get(item.slug) ?? item.imageUrl,
		}));
	} catch {
		return base;
	}
}

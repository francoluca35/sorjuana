import { getAdminCategories } from '@/lib/data/productCatalog';

export type CategorySpotlightRailItem = {
	slug: string;
	label: string;
	imageUrl: string;
	href: string;
};

const FALLBACK_IMAGE_BY_SLUG: Record<string, string> = {
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

export function defaultHrefForCategorySlug(slug: string): string {
	const s = slug.trim();
	return `/catalogo?categoria=${encodeURIComponent(s)}`;
}

/** Misma base que el rail antes de publicar overrides (etiquetas admin + fotos stock). */
export function getDefaultCategorySpotlightRail(): CategorySpotlightRailItem[] {
	return getAdminCategories().map(({ slug, label }) => ({
		slug,
		label,
		imageUrl:
			FALLBACK_IMAGE_BY_SLUG[slug] ??
			'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=400&q=80',
		href: defaultHrefForCategorySlug(slug),
	}));
}

function normalizeHref(slug: string, raw: unknown): string {
	if (typeof raw === 'string' && raw.trim().length > 0) {
		let h = raw.trim();
		if (!h.startsWith('/') && !h.startsWith('http://') && !h.startsWith('https://')) {
			h = `/${h.replace(/^\//, '')}`;
		}
		return h;
	}
	return defaultHrefForCategorySlug(slug);
}

export function parseCategorySpotlightRailFromJson(data: unknown): CategorySpotlightRailItem[] | null {
	if (!Array.isArray(data) || data.length === 0) return null;
	const out: CategorySpotlightRailItem[] = [];
	const seen = new Set<string>();
	for (const item of data) {
		if (!item || typeof item !== 'object') return null;
		const o = item as Record<string, unknown>;
		const slug = typeof o.slug === 'string' ? o.slug.trim() : '';
		const label = typeof o.label === 'string' ? o.label.trim() : '';
		const imageUrl = typeof o.imageUrl === 'string' ? o.imageUrl.trim() : '';
		if (!slug || !label || !imageUrl) return null;
		if (seen.has(slug)) return null;
		seen.add(slug);
		const href = normalizeHref(slug, o.href);
		out.push({ slug, label, imageUrl, href });
	}
	return out.length ? out : null;
}

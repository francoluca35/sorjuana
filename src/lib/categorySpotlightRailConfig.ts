import { CLIENT_CATEGORY_SPOTLIGHTS } from '@/lib/clientCategoryDefaults';

export type CategorySpotlightRailItem = {
	slug: string;
	label: string;
	imageUrl: string;
	href: string;
};

export function defaultHrefForCategorySlug(slug: string): string {
	const s = slug.trim();
	return `/catalogo?categoria=${encodeURIComponent(s)}`;
}

/** Rail de categorías en círculos (valores por defecto de la clienta). */
export function getDefaultCategorySpotlightRail(): CategorySpotlightRailItem[] {
	return CLIENT_CATEGORY_SPOTLIGHTS.map((item) => ({ ...item }));
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

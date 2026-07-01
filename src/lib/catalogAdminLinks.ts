import type { ShopCategoryTree } from '@/lib/data/shopCategories';

export const CUSTOM_CATALOG_LINK_ID = '__custom';
export const FULL_CATALOG_LINK_ID = '__full';

export type CatalogLinkPick = { id: string; label: string; href: string };

export type SpotlightSubPick = {
	id: string;
	/** Slug persistido en el ítem (debe coincidir con `categoria` en el catálogo). */
	slug: string;
	/** Nombre visible sugerido para el círculo. */
	subName: string;
	label: string;
	href: string;
};

/** Palabras en minúscula y primera letra de cada término en mayúscula (PANTALONES / pantalones → Pantalones). */
function titleCaseWords(s: string): string {
	const t = s.trim().toLowerCase();
	if (!t) return s.trim();
	return t
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(' ');
}

/** Une variantes «Pantalones» / «PANTALONES» / «pantalones» en un solo texto para el select. */
function pickCanonicalSubName(names: Set<string>, slugKey: string): string {
	const candidates = [...names].map((n) => n.trim()).filter(Boolean);
	if (candidates.length === 0) {
		return titleCaseWords(slugKey.replace(/-/g, ' '));
	}
	const byInsensitive = new Map<string, string>();
	for (const c of candidates) {
		const k = c.toLowerCase();
		if (!byInsensitive.has(k)) byInsensitive.set(k, c);
	}
	const merged = [...byInsensitive.values()];
	if (merged.length === 1) return titleCaseWords(merged[0]!);
	merged.sort((a, b) => b.length - a.length);
	return titleCaseWords(merged[0]!);
}

/** Slug de subcategoría en minúsculas → nombres vistos en cualquier línea (para unificar mayúsculas). */
export function collectSubcategoriesBySlugKey(tree: ShopCategoryTree[]): Map<string, Set<string>> {
	const m = new Map<string, Set<string>>();
	for (const cat of tree) {
		for (const sub of cat.subcategories ?? []) {
			const slug = sub.slug.trim().toLowerCase();
			if (!slug) continue;
			let set = m.get(slug);
			if (!set) {
				set = new Set();
				m.set(slug, set);
			}
			const nm = (sub.name ?? '').trim();
			if (nm) set.add(nm);
		}
	}
	return m;
}

const CATALOG_QUERY_KEYS_LOWER_VALUE = new Set(['categoria', 'filter', 'subcategoria']);

export function catalogHref(params: Record<string, string>): string {
	const keys = Object.keys(params).sort();
	const qs = keys
		.map((k) => {
			let v = params[k] ?? '';
			if (CATALOG_QUERY_KEYS_LOWER_VALUE.has(k.toLowerCase())) {
				v = String(v).trim().toLowerCase();
			}
			return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
		})
		.join('&');
	return qs ? `/catalogo?${qs}` : '/catalogo';
}

/** Normaliza query de `/catalogo` para comparar href guardado con opciones del admin. */
export function normalizeCatalogHref(href: string): string {
	const t = href.trim();
	if (!t || /^https?:\/\//i.test(t)) return t;
	let pathQuery = t.startsWith('/') ? t : `/${t}`;
	const q = pathQuery.indexOf('?');
	const path = q >= 0 ? pathQuery.slice(0, q) : pathQuery;
	const search = q >= 0 ? pathQuery.slice(q + 1) : '';
	if (path.replace(/\/$/, '') !== '/catalogo') return t;
	const sp = new URLSearchParams(search);
	const keys = [...new Set(sp.keys())].sort();
	const pairs = keys.map((k) => {
		let v = sp.get(k) ?? '';
		if (CATALOG_QUERY_KEYS_LOWER_VALUE.has(k.toLowerCase())) {
			v = v.trim().toLowerCase();
		}
		return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
	});
	return pairs.length ? `/catalogo?${pairs.join('&')}` : '/catalogo';
}

export function buildCatalogLinkPicks(tree: ShopCategoryTree[]): CatalogLinkPick[] {
	const out: CatalogLinkPick[] = [
		{ id: FULL_CATALOG_LINK_ID, label: 'Catálogo completo (sin filtro)', href: '/catalogo' },
	];

	for (const cat of tree) {
		const slug = cat.slug.trim().toLowerCase();
		if (!slug) continue;
		out.push({
			id: `line:${slug}`,
			label: `Línea · ${cat.name} (${slug})`,
			href: catalogHref({ filter: slug }),
		});
	}

	const bySubSlug = collectSubcategoriesBySlugKey(tree);
	for (const [s, nameSet] of bySubSlug) {
		const subName = pickCanonicalSubName(nameSet, s);
		out.push({
			id: `tipo:${s}`,
			label: `${subName} — todas las categorías`,
			href: catalogHref({ categoria: s }),
		});
	}

	for (const cat of tree) {
		const pslug = cat.slug.trim().toLowerCase();
		if (!pslug) continue;
		for (const sub of cat.subcategories ?? []) {
			const s = sub.slug.trim().toLowerCase();
			if (!s) continue;
			out.push({
				id: `combo:${pslug}:${s}`,
				label: `${cat.name} › ${titleCaseWords((sub.name ?? '').trim() || s)}`,
				href: catalogHref({ filter: pslug, subcategoria: s }),
			});
		}
	}

	return out;
}

/** Una sola entrada por slug de subcategoría (clave en minúsculas; nombres unifican MAYÚSCULAS/minúsculas). */
export function buildUniqueSubcategoryTipoPicks(tree: ShopCategoryTree[]): SpotlightSubPick[] {
	const bySlug = collectSubcategoriesBySlugKey(tree);
	return [...bySlug.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([slug, nameSet]) => {
			const subName = pickCanonicalSubName(nameSet, slug);
			return {
				id: `tipo:${slug}`,
				slug,
				subName,
				label: `${subName} — todas las categorías`,
				href: catalogHref({ categoria: slug }),
			};
		});
}

export function matchPickIdForHref(href: string, picks: CatalogLinkPick[]): string {
	const norm = normalizeCatalogHref(href);
	for (const p of picks) {
		if (normalizeCatalogHref(p.href) === norm) return p.id;
	}
	return CUSTOM_CATALOG_LINK_ID;
}

export function matchSpotlightSubPickId(
	slide: { slug: string; href: string },
	picks: SpotlightSubPick[],
): string {
	const s = slide.slug.trim().toLowerCase();
	const normHref = normalizeCatalogHref(slide.href);
	for (const p of picks) {
		if (p.slug === s && normalizeCatalogHref(p.href) === normHref) return p.id;
	}
	for (const p of picks) {
		if (normalizeCatalogHref(p.href) === normHref) return p.id;
	}
	return CUSTOM_CATALOG_LINK_ID;
}

export type CategorySpotlightPick = {
	id: string;
	slug: string;
	defaultLabel: string;
	label: string;
	href: string;
};

/** Todas las categorías (líneas) y subcategorías del árbol admin para el carrusel de círculos. */
export function buildCategorySpotlightPicks(tree: ShopCategoryTree[]): CategorySpotlightPick[] {
	const out: CategorySpotlightPick[] = [];

	for (const cat of tree) {
		const pslug = cat.slug.trim().toLowerCase();
		if (!pslug) continue;
		const catName = (cat.name ?? '').trim() || pslug;
		out.push({
			id: `line:${pslug}`,
			slug: pslug,
			defaultLabel: catName,
			label: `Categoría · ${catName}`,
			href: catalogHref({ filter: pslug }),
		});

		for (const sub of cat.subcategories ?? []) {
			const s = sub.slug.trim().toLowerCase();
			if (!s) continue;
			const subName = titleCaseWords((sub.name ?? '').trim() || s.replace(/-/g, ' '));
			out.push({
				id: `combo:${pslug}:${s}`,
				slug: `${pslug}-${s}`,
				defaultLabel: subName,
				label: `${catName} › ${subName}`,
				href: catalogHref({ filter: pslug, subcategoria: s }),
			});
		}
	}

	return out;
}

export function matchCategorySpotlightPickId(
	item: { slug: string; href: string },
	picks: CategorySpotlightPick[],
): string {
	const slug = item.slug.trim().toLowerCase();
	const normHref = normalizeCatalogHref(item.href);
	for (const p of picks) {
		if (p.slug === slug && normalizeCatalogHref(p.href) === normHref) return p.id;
	}
	for (const p of picks) {
		if (normalizeCatalogHref(p.href) === normHref) return p.id;
	}
	return CUSTOM_CATALOG_LINK_ID;
}

export const catalogAdminSelectClass =
	'flex h-10 w-full rounded-md border border-[#b8956a]/30 bg-white/90 px-3 text-sm text-[#1a1410] outline-none focus:border-[#b8956a] focus:ring-1 focus:ring-[#b8956a]/35';

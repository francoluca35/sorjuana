/**
 * Categorías de marketing en inicio (círculos + paneles apaisados).
 * Los `slug` se usan en `/catalogo?categoria=…`; deben coincidir con rutas en `products.category` o configurarse en Mapa de página.
 */
export const CLIENT_CATEGORY_SPOTLIGHTS = [
	{
		slug: 'chic-europeo',
		label: 'Chic europeo',
		imageUrl:
			'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80',
		href: '/catalogo?categoria=chic-europeo',
	},
	{
		slug: 'accesorios-premium',
		label: 'Accesorios premium',
		imageUrl:
			'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=400&q=80',
		href: '/catalogo?categoria=accesorios-premium',
	},
	{
		slug: 'looks-urbanos',
		label: 'Looks urbanos',
		imageUrl:
			'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=400&q=80',
		href: '/catalogo?categoria=looks-urbanos',
	},
	{
		slug: 'eventos-celebraciones',
		label: 'Eventos y celebraciones',
		imageUrl:
			'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80',
		href: '/catalogo?categoria=eventos-celebraciones',
	},
	{
		slug: 'carteras-cintos',
		label: 'Carteras y cintos que enamoran',
		imageUrl:
			'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
		href: '/catalogo?categoria=carteras-cintos',
	},
] as const;

const MARKETING_LABEL_BY_SLUG = Object.fromEntries(
	CLIENT_CATEGORY_SPOTLIGHTS.map((c) => [c.slug, c.label]),
) as Record<string, string>;

export function marketingCategoryLabel(slug: string | null | undefined): string | null {
	if (!slug?.trim()) return null;
	return MARKETING_LABEL_BY_SLUG[slug.trim().toLowerCase()] ?? null;
}

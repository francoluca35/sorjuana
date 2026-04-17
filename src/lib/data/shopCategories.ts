export type ShopCategoryRow = {
	id: string;
	name: string;
	slug: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type ShopSubcategoryRow = {
	id: string;
	category_id: string;
	name: string;
	slug: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type ShopCategoryTree = ShopCategoryRow & {
	subcategories: ShopSubcategoryRow[];
};

/** Slug URL-seguro a partir del nombre visible. */
export function slugifyLabel(input: string): string {
	const base = input
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return base.length > 0 ? base : 'categoria';
}

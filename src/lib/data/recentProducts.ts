import { unstable_noStore as noStore } from 'next/cache';

export { STOREFRONT_CATALOG_PAGE_SIZE } from '@/lib/firebase/products';
export type { ProductRow } from '@/lib/data/productCatalog';

import {
	fetchAllProductsForPanel as fetchAllProductsForPanelFirestore,
	fetchProductsByIds as fetchProductsByIdsFirestore,
	fetchRecentProducts as fetchRecentProductsFirestore,
	fetchStorefrontCatalogPage as fetchStorefrontCatalogPageFirestore,
	fetchStorefrontCatalogRows as fetchStorefrontCatalogRowsFirestore,
} from '@/lib/firebase/products';
import { parseStoredProductIds, mergeProductRowsById } from '@/lib/recentArrivalsSelection';

export async function fetchStorefrontCatalogRows(params: {
	categoria?: string;
	filter?: string;
}): Promise<import('@/lib/data/productCatalog').ProductRow[]> {
	noStore();
	return fetchStorefrontCatalogRowsFirestore(params);
}

export async function fetchStorefrontCatalogPage(
	offset: number,
	limit?: number,
): Promise<import('@/lib/data/productCatalog').ProductRow[]> {
	noStore();
	return fetchStorefrontCatalogPageFirestore(offset, limit);
}

export async function fetchRecentProducts(
	limit = 12,
	options?: { includeHidden?: boolean },
): Promise<import('@/lib/data/productCatalog').ProductRow[]> {
	noStore();
	return fetchRecentProductsFirestore(limit, options);
}

export async function fetchAllProductsForPanel(): Promise<import('@/lib/data/productCatalog').ProductRow[]> {
	noStore();
	return fetchAllProductsForPanelFirestore();
}

export async function fetchProductsByIds(
	ids: string[],
	options?: { includeHidden?: boolean },
): Promise<import('@/lib/data/productCatalog').ProductRow[]> {
	noStore();
	return fetchProductsByIdsFirestore(ids, options);
}

/** Catálogo reciente + productos elegidos en Mapa de página (Recién llegados / Más vendidos). */
export async function fetchHomeCatalogPool(options: {
	recentLimit?: number;
	recentArrivalsIdsJson?: string;
	bestSellersIdsJson?: string;
}): Promise<import('@/lib/data/productCatalog').ProductRow[]> {
	noStore();
	const limit = options.recentLimit ?? 24;
	const recentIds = parseStoredProductIds(options.recentArrivalsIdsJson ?? '');
	const bestIds = parseStoredProductIds(options.bestSellersIdsJson ?? '', 24);
	const pinnedIds = [...new Set([...recentIds, ...bestIds])];

	const [recentRows, pinnedRows] = await Promise.all([
		fetchRecentProductsFirestore(limit),
		pinnedIds.length > 0 ? fetchProductsByIdsFirestore(pinnedIds) : Promise.resolve([]),
	]);

	return mergeProductRowsById(recentRows, pinnedRows);
}

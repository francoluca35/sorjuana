export const BEST_SELLERS_IDS_STORAGE_KEY = 'sj-mas-vendidos-ids-v1';

export const BEST_SELLERS_UPDATED_EVENT = 'sj-mas-vendidos-updated';

export const BEST_SELLERS_MAX = 4;

export {
	parseStoredProductIds,
	serializeProductIds,
	pickProductsByOrderedIds,
} from '@/lib/recentArrivalsSelection';

import type { ProductRow } from '@/lib/data/productCatalog';
import { pickProductsByOrderedIds } from '@/lib/recentArrivalsSelection';

/** Orden manual guardado en Firestore; si no hay, usa `automaticFallback` (p. ej. top por ventas). */
export function resolveBestSellersForDisplay(
	candidates: ProductRow[],
	orderedStoredIds: string[],
	automaticFallback: ProductRow[],
	max: number = BEST_SELLERS_MAX,
): ProductRow[] {
	const ids = orderedStoredIds.slice(0, max);
	if (ids.length > 0) {
		const picked = pickProductsByOrderedIds(candidates, ids, max);
		if (picked.length > 0) return picked;
	}
	return automaticFallback.slice(0, max);
}

export function pickProductsByTopSold(
	candidates: ProductRow[],
	soldByProductId: Map<string, number> | Record<string, number>,
	max: number = BEST_SELLERS_MAX,
): ProductRow[] {
	const getQty = (id: string) => {
		if (soldByProductId instanceof Map) return soldByProductId.get(id) ?? 0;
		return soldByProductId[id] ?? 0;
	};
	return [...candidates]
		.filter((p) => getQty(p.id) > 0)
		.sort((a, b) => getQty(b.id) - getQty(a.id))
		.slice(0, max);
}

export function pickProductsByTopSoldWithFallback(
	candidates: ProductRow[],
	soldByProductId: Map<string, number> | Record<string, number>,
	max: number = BEST_SELLERS_MAX,
): ProductRow[] {
	const top = pickProductsByTopSold(candidates, soldByProductId, max);
	if (top.length >= max) return top;
	const used = new Set(top.map((p) => p.id));
	const fill = candidates.filter((p) => !used.has(p.id)).slice(0, max - top.length);
	return [...top, ...fill];
}

export function broadcastBestSellersSelectionUpdated() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(BEST_SELLERS_UPDATED_EVENT));
}

export function subscribeBestSellersStorage(onStoreChange: () => void) {
	if (typeof window === 'undefined') return () => {};
	const on = () => onStoreChange();
	window.addEventListener(BEST_SELLERS_UPDATED_EVENT, on);
	window.addEventListener('storage', on);
	return () => {
		window.removeEventListener(BEST_SELLERS_UPDATED_EVENT, on);
		window.removeEventListener('storage', on);
	};
}

export function getBestSellersStorageSnapshot(): string {
	if (typeof window === 'undefined') return '';
	return localStorage.getItem(BEST_SELLERS_IDS_STORAGE_KEY) ?? '';
}

export function getBestSellersStorageServerSnapshot(): string {
	return '';
}

import type { ProductRow } from '@/lib/data/productCatalog';

/** Lista ordenada de UUID de `products` a mostrar en inicio (máx. 6). */
export const RECENT_ARRIVALS_IDS_STORAGE_KEY = 'sj-recien-llegados-ids-v1';

export const RECENT_ARRIVALS_UPDATED_EVENT = 'sj-recien-llegados-updated';

export const RECENT_ARRIVALS_MAX = 6;

export function parseStoredProductIds(raw: string | null): string[] {
	if (raw == null || raw.trim() === '') return [];
	try {
		const v = JSON.parse(raw) as unknown;
		if (!Array.isArray(v)) return [];
		return v
			.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
			.map((x) => x.trim())
			.slice(0, RECENT_ARRIVALS_MAX);
	} catch {
		return [];
	}
}

export function serializeProductIds(ids: string[]): string {
	return JSON.stringify(ids.slice(0, RECENT_ARRIVALS_MAX));
}

/** Orden fijo: sigue `orderedIds`, ignora ids que ya no existan en catálogo. */
export function pickProductsByOrderedIds(candidates: ProductRow[], orderedIds: string[]): ProductRow[] {
	const byId = new Map(candidates.map((p) => [p.id, p]));
	const out: ProductRow[] = [];
	for (const id of orderedIds) {
		const row = byId.get(id);
		if (row) out.push(row);
		if (out.length >= RECENT_ARRIVALS_MAX) break;
	}
	return out;
}

/**
 * Si hay selección guardada y al menos un id sigue vigente → esos (en orden, máx. 6).
 * Si no hay selección o ningún id coincide → los más recientes del catálogo (máx. 6).
 */
export function resolveRecentArrivalsForDisplay(
	candidates: ProductRow[],
	orderedStoredIds: string[],
): ProductRow[] {
	const ids = orderedStoredIds.slice(0, RECENT_ARRIVALS_MAX);
	if (ids.length > 0) {
		const picked = pickProductsByOrderedIds(candidates, ids);
		if (picked.length > 0) return picked;
	}
	return candidates.slice(0, RECENT_ARRIVALS_MAX);
}

export function broadcastRecentArrivalsSelectionUpdated() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(RECENT_ARRIVALS_UPDATED_EVENT));
}

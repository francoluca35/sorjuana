import type { ProductRow } from '@/lib/data/productCatalog';

/** Lista ordenada de UUID de `products` a mostrar en inicio (máx. 6). */
export const RECENT_ARRIVALS_IDS_STORAGE_KEY = 'sj-recien-llegados-ids-v1';

export const RECENT_ARRIVALS_UPDATED_EVENT = 'sj-recien-llegados-updated';

export const RECENT_ARRIVALS_MAX = 6;
export const RECENT_ARRIVALS_MIN = 3;

export function parseStoredProductIds(raw: string | null, max: number = RECENT_ARRIVALS_MAX): string[] {
	if (raw == null || raw.trim() === '') return [];
	try {
		const v = JSON.parse(raw) as unknown;
		if (!Array.isArray(v)) return [];
		return v
			.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
			.map((x) => x.trim())
			.slice(0, max);
	} catch {
		return [];
	}
}

export function serializeProductIds(ids: string[], max: number = RECENT_ARRIVALS_MAX): string {
	return JSON.stringify(ids.slice(0, max));
}

/** Orden fijo: sigue `orderedIds`, ignora ids que ya no existan en catálogo. */
export function pickProductsByOrderedIds(
	candidates: ProductRow[],
	orderedIds: string[],
	max: number = RECENT_ARRIVALS_MAX,
): ProductRow[] {
	const byId = new Map(candidates.map((p) => [p.id, p]));
	const out: ProductRow[] = [];
	for (const id of orderedIds) {
		const row = byId.get(id);
		if (row) out.push(row);
		if (out.length >= max) break;
	}
	return out;
}

/**
 * Si hay selección guardada y al menos un id sigue vigente → esos (en orden, máx. 6).
 * Si no hay selección o ningún id coincide → los más recientes del catálogo (máx. 6).
 *
 * `automaticFallback` es la lista “por fecha” que envía el servidor (p. ej. los 24 más nuevos).
 * Si se mezclan filas extra cargadas por ID, pasalas solo en `candidates` y dejá el fallback
 * sin esas filas para que el modo automático siga mostrando solo novedades recientes.
 */
export function resolveRecentArrivalsForDisplay(
	candidates: ProductRow[],
	orderedStoredIds: string[],
	automaticFallback?: ProductRow[],
	max: number = RECENT_ARRIVALS_MAX,
): ProductRow[] {
	const ids = orderedStoredIds.slice(0, max);
	if (ids.length >= RECENT_ARRIVALS_MIN) {
		const picked = pickProductsByOrderedIds(candidates, ids, max);
		if (picked.length >= RECENT_ARRIVALS_MIN) return picked;
	}
	const fb = automaticFallback ?? candidates;
	return fb.slice(0, max);
}

export function broadcastRecentArrivalsSelectionUpdated() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(RECENT_ARRIVALS_UPDATED_EVENT));
}

/** Une listas de productos por `id` (útil para incluir selección admin en el pool de la home). */
export function mergeProductRowsById(...lists: ProductRow[][]): ProductRow[] {
	const byId = new Map<string, ProductRow>();
	for (const list of lists) {
		for (const row of list) byId.set(row.id, row);
	}
	return [...byId.values()];
}

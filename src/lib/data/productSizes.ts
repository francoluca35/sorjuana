/** Filas de inventario por talle (JSON en `products.size_inventory`). */

export type SizeInventoryRow = {
	size: string;
	qty: number;
};

export function parseSizeInventoryFromDb(raw: unknown): SizeInventoryRow[] {
	if (!Array.isArray(raw)) return [];
	const out: SizeInventoryRow[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const o = item as Record<string, unknown>;
		const size = String(o.size ?? '').trim();
		const qty = Math.max(0, Math.floor(Number(o.qty) || 0));
		if (!size) continue;
		out.push({ size, qty });
	}
	return out;
}

/**
 * Une talles iguales (suma cantidades), descarta talle vacío, cantidades enteras ≥ 0.
 */
export function normalizeSizeInventoryForDb(rows: SizeInventoryRow[]): SizeInventoryRow[] {
	const map = new Map<string, number>();
	for (const r of rows) {
		const k = r.size.trim();
		if (!k) continue;
		map.set(k, (map.get(k) ?? 0) + Math.max(0, Math.floor(Number(r.qty) || 0)));
	}
	return Array.from(map.entries()).map(([size, qty]) => ({ size, qty }));
}

export function sumSizeInventoryQty(rows: SizeInventoryRow[]): number {
	return rows.reduce((s, r) => s + Math.max(0, Math.floor(Number(r.qty) || 0)), 0);
}

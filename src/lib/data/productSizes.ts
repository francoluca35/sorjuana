/** Filas de inventario por talle (JSON en `products.size_inventory`). */

export type SizeInventoryRow = {
	color?: string | null;
	size: string;
	qty: number;
};

export function parseSizeInventoryFromDb(raw: unknown): SizeInventoryRow[] {
	if (!Array.isArray(raw)) return [];
	const out: SizeInventoryRow[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') continue;
		const o = item as Record<string, unknown>;
		const colorRaw = String(o.color ?? '').trim();
		const size = String(o.size ?? '').trim();
		const qty = Math.max(0, Math.floor(Number(o.qty) || 0));
		if (!size) continue;
		out.push({ color: colorRaw || null, size, qty });
	}
	return out;
}

/**
 * Une talles iguales (suma cantidades), descarta talle vacío, cantidades enteras ≥ 0.
 */
export function normalizeSizeInventoryForDb(rows: SizeInventoryRow[]): SizeInventoryRow[] {
	const map = new Map<string, number>();
	const keyFor = (color: string | null | undefined, size: string) => `${(color ?? '').trim().toLowerCase()}::${size}`;
	for (const r of rows) {
		const k = r.size.trim();
		if (!k) continue;
		const color = r.color?.trim() || '';
		const key = keyFor(color, k);
		map.set(key, (map.get(key) ?? 0) + Math.max(0, Math.floor(Number(r.qty) || 0)));
	}
	return Array.from(map.entries()).map(([key, qty]) => {
		const [color, size] = key.split('::');
		return { color: color || null, size: size ?? '', qty };
	});
}

export function sumSizeInventoryQty(rows: SizeInventoryRow[]): number {
	return rows.reduce((s, r) => s + Math.max(0, Math.floor(Number(r.qty) || 0)), 0);
}

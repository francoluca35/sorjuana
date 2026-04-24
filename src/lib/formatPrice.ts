/**
 * Precio para listados de tienda, estilo planilla AR: `$ 59.900` (miles con punto, sin decimales).
 */
export function formatPrecioListaAr(n: number): string {
	if (!Number.isFinite(n)) return '$ 0';
	const v = Math.round(Math.max(0, n));
	return `$ ${v.toLocaleString('es-AR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
}

/**
 * Devuelve el precio principal a mostrar: el menor entre efectivo y transferencia.
 */
export function getPrimaryDiscountedPrice(cashPrice: number, transferPrice: number): number {
	const candidates = [cashPrice, transferPrice].filter((v) => Number.isFinite(v) && v > 0);
	if (candidates.length === 0) return 0;
	return Math.min(...candidates);
}

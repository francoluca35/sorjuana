/**
 * Precio para listados de tienda, estilo planilla AR: `$ 59.900` (miles con punto, sin decimales).
 */
export function formatPrecioListaAr(n: number): string {
	if (!Number.isFinite(n)) return '$ 0';
	const v = Math.round(Math.max(0, n));
	return `$ ${v.toLocaleString('es-AR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
}

/** Espacio fino no rompible tras `$`, para que signo y monto no partan en dos líneas. */
const NBSP = '\u00A0';

/**
 * Precio para listados de tienda, estilo planilla AR: `$ 59.900` (miles con punto, sin decimales).
 */
export function formatPrecioListaAr(n: number): string {
	if (!Number.isFinite(n)) return `$${NBSP}0`;
	const v = Math.round(Math.max(0, n));
	return `$${NBSP}${v.toLocaleString('es-AR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
}

/**
 * Devuelve el precio principal a mostrar: el menor entre efectivo y transferencia.
 */
export function getPrimaryDiscountedPrice(cashPrice: number, transferPrice: number): number {
	const candidates = [cashPrice, transferPrice].filter((v) => Number.isFinite(v) && v > 0);
	if (candidates.length === 0) return 0;
	return Math.min(...candidates);
}

/**
 * Calcula el porcentaje OFF entre precio lista y precio final.
 */
export function computeDiscountPercent(listPrice: number, discountedPrice: number): number {
	const list = Number.isFinite(listPrice) ? Math.max(0, listPrice) : 0;
	const discounted = Number.isFinite(discountedPrice) ? Math.max(0, discountedPrice) : 0;
	if (list <= 0 || discounted <= 0 || discounted >= list) return 0;
	return Math.round(((list - discounted) / list) * 100);
}

/** Cuotas sin interés para texto precio lista / tarjeta en catálogo y fichas. */
export const CARD_INSTALLMENTS_NO_INTEREST = 3;

/**
 * Formatea cuota AR con 2 decimales, ej: `$ 11.166,67`.
 */
export function formatCuotaAr(total: number, installments: number): string {
	if (!Number.isFinite(total) || total <= 0 || installments <= 0) return `$${NBSP}0,00`;
	const value = total / installments;
	return `$${NBSP}${value.toLocaleString('es-AR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

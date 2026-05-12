/**
 * Cotización de envío (servidor).
 *
 * **Prioridad 1 — ShipNow:** `SHIPNOW_ACCESS_TOKEN` + GET `/shipping_options`
 * (peso `SHIPNOW_WEIGHT_GRAMS`, tipos `SHIPNOW_TYPES`). Ver `shipnowQuote.ts`.
 *
 * **Prioridad 2 — API genérica (opcional):**
 * - `SHIPPING_QUOTE_URL` o `SHIPPING_API_BASE_URL` + `SHIPPING_QUOTE_PATH`
 * - Compatibilidad: mismas claves con prefijo `CORREO_SHIPPING_*` si aún las usás.
 * - `SHIPPING_HTTP_METHOD`, `SHIPPING_CP_FIELD`, `SHIPPING_EXTRA_JSON`
 */

import { isShipnowConfigured, quoteShipnowShipping } from '@/lib/shipping/shipnowQuote';

function getQuoteEndpoint(): string | null {
	const full =
		process.env.SHIPPING_QUOTE_URL?.trim() || process.env.CORREO_SHIPPING_QUOTE_URL?.trim();
	if (full) return full;
	const base =
		process.env.SHIPPING_API_BASE_URL?.trim() || process.env.CORREO_SHIPPING_API_BASE_URL?.trim();
	if (!base) return null;
	const path =
		process.env.SHIPPING_QUOTE_PATH?.trim() ??
		process.env.CORREO_SHIPPING_QUOTE_PATH?.trim() ??
		'';
	const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
	return `${base.replace(/\/$/, '')}${normalizedPath}`;
}

/** Solo dígitos, típico CP Argentina 4–8 caracteres. */
export function normalizeArgentinaPostalCode(raw: string): string {
	return raw.replace(/\D/g, '').slice(0, 8);
}

export function isValidArgentinaPostalCode(cp: string): boolean {
	return cp.length >= 4 && cp.length <= 8;
}

function mergeExtraBody(base: Record<string, unknown>): Record<string, unknown> {
	const extra =
		process.env.SHIPPING_EXTRA_JSON?.trim() || process.env.CORREO_SHIPPING_EXTRA_JSON?.trim();
	if (!extra) return base;
	try {
		const parsed = JSON.parse(extra) as unknown;
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return { ...base, ...(parsed as Record<string, unknown>) };
		}
	} catch {
		/* ignore */
	}
	return base;
}

function extractShippingAmount(data: unknown): number | null {
	if (data == null) return null;
	if (typeof data === 'number' && Number.isFinite(data) && data >= 0) return data;
	if (typeof data === 'string') {
		const n = parseFloat(data.replace(/\./g, '').replace(',', '.'));
		return Number.isFinite(n) && n >= 0 ? n : null;
	}
	if (typeof data !== 'object') return null;

	const tryKeys = (o: Record<string, unknown>): number | null => {
		const keys = [
			'importe',
			'precio',
			'monto',
			'total',
			'costo',
			'valor',
			'amount',
			'price',
			'tarifa',
			'cost',
		];
		for (const k of keys) {
			const v = o[k];
			if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
			if (typeof v === 'string') {
				const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
				if (Number.isFinite(n) && n >= 0) return n;
			}
		}
		return null;
	};

	const o = data as Record<string, unknown>;
	const direct = tryKeys(o);
	if (direct != null) return direct;

	for (const nested of ['data', 'result', 'response', 'cotizacion', 'payload']) {
		const inner = o[nested];
		if (inner && typeof inner === 'object') {
			const n = extractShippingAmount(inner);
			if (n != null) return n;
		}
	}

	if (Array.isArray(data) && data.length > 0) {
		return extractShippingAmount(data[0]);
	}

	return null;
}

export type ShippingQuoteResult =
	| { ok: true; amountArs: number; rawPreview?: string }
	| { ok: false; message: string };

/** @deprecated Usar `fetchShippingQuote`. */
export type CorreoQuoteResult = ShippingQuoteResult;

/**
 * Cotización: ShipNow si hay token; si no, API genérica configurada por env.
 */
export async function fetchShippingQuote(postalCodeDigits: string): Promise<ShippingQuoteResult> {
	const cp = normalizeArgentinaPostalCode(postalCodeDigits);
	if (!isValidArgentinaPostalCode(cp)) {
		return { ok: false, message: 'Ingresá un código postal válido (4 a 8 dígitos).' };
	}

	if (isShipnowConfigured()) {
		return quoteShipnowShipping(cp);
	}

	const url = getQuoteEndpoint();
	if (!url) {
		return {
			ok: false,
			message:
				'Falta configurar envío: SHIPNOW_ACCESS_TOKEN (ShipNow) o bien SHIPPING_QUOTE_URL / SHIPPING_API_BASE_URL.',
		};
	}

	const method = (
		process.env.SHIPPING_HTTP_METHOD ?? process.env.CORREO_SHIPPING_HTTP_METHOD ?? 'POST'
	).toUpperCase();
	const cpField =
		process.env.SHIPPING_CP_FIELD?.trim() ||
		process.env.CORREO_SHIPPING_CP_FIELD?.trim() ||
		'codigoPostal';

	try {
		let res: Response;
		if (method === 'GET') {
			const u = new URL(url);
			u.searchParams.set(cpField, cp);
			res = await fetch(u.toString(), {
				method: 'GET',
				headers: { Accept: 'application/json' },
				cache: 'no-store',
			});
		} else {
			const bodyObj = mergeExtraBody({ [cpField]: cp });
			res = await fetch(url, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(bodyObj),
				cache: 'no-store',
			});
		}

		const text = await res.text();
		if (!res.ok) {
			return {
				ok: false,
				message: `La API de envío respondió ${res.status}. ${text.slice(0, 200)}`,
			};
		}

		let parsed: unknown;
		try {
			parsed = text ? JSON.parse(text) : null;
		} catch {
			const asNum = extractShippingAmount(text);
			if (asNum != null) {
				return { ok: true, amountArs: asNum, rawPreview: text.slice(0, 120) };
			}
			return {
				ok: false,
				message: 'La respuesta del cotizador no es JSON válido.',
			};
		}

		const amount = extractShippingAmount(parsed);
		if (amount == null) {
			return {
				ok: false,
				message: `No se pudo leer el importe en la respuesta. Fragmento: ${text.slice(0, 180)}`,
			};
		}

		return { ok: true, amountArs: amount, rawPreview: text.slice(0, 120) };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error de red al cotizar envío.';
		return {
			ok: false,
			message: msg.includes('fetch failed') ? `${msg} (¿red / DNS?)` : msg,
		};
	}
}

export async function fetchCorreoShippingQuote(postalCodeDigits: string): Promise<ShippingQuoteResult> {
	return fetchShippingQuote(postalCodeDigits);
}

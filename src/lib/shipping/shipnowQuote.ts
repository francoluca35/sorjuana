/**
 * ShipNow — cotización vía GET /shipping_options.
 * @see https://api.shipnow.com.ar (prod; token: developers@shipnow.com.ar)
 * @see https://shipnow.stoplight.io/docs/shipnow-api/cysyd7s2172ws-shipnow
 */

export type ShipnowQuoteResult =
	| { ok: true; amountArs: number; rawPreview?: string }
	| { ok: false; message: string };

function normalizeBase(url: string): string {
	return url.replace(/\/$/, '');
}

function parseEnvInt(key: string, fallback: number): number {
	const raw = process.env[key]?.trim();
	if (!raw) return fallback;
	const n = parseInt(raw, 10);
	return Number.isFinite(n) ? n : fallback;
}

export function isShipnowConfigured(): boolean {
	return Boolean(process.env.SHIPNOW_ACCESS_TOKEN?.trim());
}

/**
 * Respuesta típica: `{ results: [ { price: number, ... } ] }`.
 */
function minPriceFromResults(data: unknown): number | null {
	if (!data || typeof data !== 'object') return null;
	const results = (data as { results?: unknown }).results;
	if (!Array.isArray(results) || results.length === 0) return null;
	let min: number | null = null;
	for (const row of results) {
		if (!row || typeof row !== 'object') continue;
		const p = (row as { price?: unknown }).price;
		if (typeof p === 'number' && Number.isFinite(p) && p >= 0) {
			min = min == null ? p : Math.min(min, p);
		}
	}
	return min;
}

export async function quoteShipnowShipping(destinationPostalDigits: string): Promise<ShipnowQuoteResult> {
	const token = process.env.SHIPNOW_ACCESS_TOKEN?.trim();
	if (!token) {
		return { ok: false, message: 'Falta SHIPNOW_ACCESS_TOKEN.' };
	}

	const base = normalizeBase(
		process.env.SHIPNOW_API_BASE_URL?.trim() || 'https://api.shipnow.com.ar',
	);
	const weight = Math.max(1, parseEnvInt('SHIPNOW_WEIGHT_GRAMS', 1500));
	const typesRaw = process.env.SHIPNOW_TYPES?.trim() || 'ship_pap';
	const types = typesRaw.replace(/\s+/g, '');

	const zipNum = parseInt(destinationPostalDigits, 10);
	if (!Number.isFinite(zipNum) || zipNum < 1) {
		return { ok: false, message: 'Código postal inválido para ShipNow.' };
	}

	const url = new URL(`${base}/shipping_options`);
	url.searchParams.set('weight', String(weight));
	url.searchParams.set('to_zip_code', String(zipNum));
	url.searchParams.set('types', types);

	let res: Response;
	try {
		res = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
			},
			cache: 'no-store',
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error de red.';
		return { ok: false, message: msg };
	}

	const text = await res.text();
	if (!res.ok) {
		let detail = text.slice(0, 220);
		try {
			const err = JSON.parse(text) as { errors?: unknown };
			if (Array.isArray(err.errors)) detail = String(err.errors[0] ?? detail);
			else if (err.errors && typeof err.errors === 'object')
				detail = JSON.stringify(err.errors).slice(0, 220);
		} catch {
			/* keep text */
		}
		return { ok: false, message: `ShipNow ${res.status}: ${detail}` };
	}

	let parsed: unknown;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		return { ok: false, message: 'ShipNow: respuesta no es JSON válido.' };
	}

	const price = minPriceFromResults(parsed);
	if (price == null) {
		return {
			ok: false,
			message:
				'ShipNow no devolvió opciones de envío para ese CP (results vacío o sin price). Podés probar SHIPNOW_TYPES=ship_pap,ship_pas.',
		};
	}

	return { ok: true, amountArs: price, rawPreview: text.slice(0, 160) };
}

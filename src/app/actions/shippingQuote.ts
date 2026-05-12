'use server';

import { fetchShippingQuote } from '@/lib/shipping/correoQuote';

export async function quoteShippingByPostalCodeAction(
	postalCode: string,
): Promise<{ ok: true; amountArs: number } | { ok: false; message: string }> {
	const r = await fetchShippingQuote(postalCode);
	if (!r.ok) return r;
	return { ok: true, amountArs: r.amountArs };
}

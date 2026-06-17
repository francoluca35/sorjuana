'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchPriceSettings } from '@/lib/data/priceSettings';
import { clampPercent, computePricesFromGarmentCost } from '@/lib/productPricing';

type SavePriceSettingsInput = {
	cashDiscountPercent: number;
	transferDiscountPercent: number;
};

const PRODUCTS_PAGE = 500;

function toNonNegativePercent(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, value);
}

async function requireAuthUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	if (error || !user) {
		return { ok: false as const, message: 'Tenés que iniciar sesión.' };
	}
	return { ok: true as const, supabase };
}

async function reapplyGlobalDiscountsToProducts(
	supabase: Awaited<ReturnType<typeof createClient>>,
	cashPct: number,
	transferPct: number,
): Promise<{ ok: true; updated: number } | { ok: false; message: string }> {
	const cash = clampPercent(cashPct);
	const transfer = clampPercent(transferPct);
	let updated = 0;
	let from = 0;

	for (;;) {
		const { data, error } = await supabase
			.from('products')
			.select('id, base_price')
			.order('created_at', { ascending: false })
			.range(from, from + PRODUCTS_PAGE - 1);

		if (error) {
			return { ok: false, message: error.message };
		}

		const rows = data ?? [];
		if (rows.length === 0) break;

		for (const row of rows) {
			const garmentCost = Math.max(0, Number(row.base_price) || 0);
			if (garmentCost <= 0) continue;

			const prices = computePricesFromGarmentCost(garmentCost, cash, transfer);
			const { error: updateError } = await supabase
				.from('products')
				.update({
					price: prices.cash,
					transfer_price: prices.transfer,
					final_transfer_price: prices.card,
					cash_discount_percent: cash,
					transfer_discount_percent: transfer,
				})
				.eq('id', row.id);

			if (updateError) {
				return { ok: false, message: updateError.message };
			}
			updated += 1;
		}

		if (rows.length < PRODUCTS_PAGE) break;
		from += PRODUCTS_PAGE;
	}

	return { ok: true, updated };
}

export async function getPriceSettingsAction() {
	return fetchPriceSettings();
}

export async function savePriceSettingsAction(
	input: SavePriceSettingsInput,
): Promise<{ ok: true; updatedProducts: number } | { ok: false; message: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	const cashDiscountPercent = toNonNegativePercent(input.cashDiscountPercent);
	const transferDiscountPercent = toNonNegativePercent(input.transferDiscountPercent);

	const payload = {
		cash_discount_percent: cashDiscountPercent,
		transfer_discount_percent: transferDiscountPercent,
		updated_at: new Date().toISOString(),
	};

	const { error } = await auth.supabase.from('price_settings').upsert(
		{
			id: 1,
			...payload,
		},
		{
			onConflict: 'id',
		},
	);

	if (error) {
		return { ok: false, message: error.message };
	}

	const reapply = await reapplyGlobalDiscountsToProducts(
		auth.supabase,
		cashDiscountPercent,
		transferDiscountPercent,
	);
	if (!reapply.ok) {
		return reapply;
	}

	revalidatePath('/app/precios');
	revalidatePath('/catalogo');
	revalidatePath('/');
	revalidatePath('/app/productos');

	return { ok: true, updatedProducts: reapply.updated };
}

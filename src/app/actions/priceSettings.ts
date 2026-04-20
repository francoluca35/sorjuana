'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchPriceSettings } from '@/lib/data/priceSettings';

type SavePriceSettingsInput = {
	cashDiscountPercent: number;
	transferDiscountPercent: number;
};

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

export async function getPriceSettingsAction() {
	return fetchPriceSettings();
}

export async function savePriceSettingsAction(
	input: SavePriceSettingsInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	const payload = {
		cash_discount_percent: toNonNegativePercent(input.cashDiscountPercent),
		transfer_discount_percent: toNonNegativePercent(input.transferDiscountPercent),
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

	revalidatePath('/app/precios');
	return { ok: true };
}

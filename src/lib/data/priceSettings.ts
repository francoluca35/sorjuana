import { createClient } from '@/lib/supabase/server';

export type PriceSettingsDTO = {
	cashDiscountPercent: number;
	transferDiscountPercent: number;
};

const DEFAULT_PRICE_SETTINGS: PriceSettingsDTO = {
	cashDiscountPercent: 0,
	transferDiscountPercent: 0,
};

function toNonNegativePercent(value: unknown): number {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, n);
}

export async function fetchPriceSettings(): Promise<PriceSettingsDTO> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('price_settings')
		.select('cash_discount_percent, transfer_discount_percent')
		.eq('id', 1)
		.maybeSingle();

	if (error || !data) {
		return DEFAULT_PRICE_SETTINGS;
	}

	return {
		cashDiscountPercent: toNonNegativePercent(data.cash_discount_percent),
		transferDiscountPercent: toNonNegativePercent(data.transfer_discount_percent),
	};
}

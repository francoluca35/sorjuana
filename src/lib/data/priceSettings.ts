import { getPriceSettingsDoc } from '@/lib/firebase/config';
import { clampPercent } from '@/lib/productPricing';

export type PriceSettingsDTO = {
	cashDiscountPercent: number;
	transferDiscountPercent: number;
	hasStoredDoc: boolean;
};

const DEFAULT_PRICE_SETTINGS: Omit<PriceSettingsDTO, 'hasStoredDoc'> = {
	cashDiscountPercent: 0,
	transferDiscountPercent: 0,
};

function toStoredPercent(value: unknown): number {
	return clampPercent(Number(value));
}

export async function fetchPriceSettings(): Promise<PriceSettingsDTO> {
	const data = await getPriceSettingsDoc();
	if (!data) {
		return { ...DEFAULT_PRICE_SETTINGS, hasStoredDoc: false };
	}

	const cashRaw = data.cash_discount_percent ?? data.cashDiscountPercent;
	const transferRaw = data.transfer_discount_percent ?? data.transferDiscountPercent;

	return {
		cashDiscountPercent: toStoredPercent(cashRaw),
		transferDiscountPercent: toStoredPercent(transferRaw),
		hasStoredDoc: true,
	};
}

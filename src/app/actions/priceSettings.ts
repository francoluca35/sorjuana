'use server';

import { revalidatePath } from 'next/cache';
import { requireSessionUser } from '@/lib/firebase/auth-server';
import { upsertPriceSettings } from '@/lib/firebase/config';
import { fetchPriceSettings } from '@/lib/data/priceSettings';
import { clampPercent, computePricesFromGarmentCost } from '@/lib/productPricing';
import { fetchAllProductsForPricing, updateProductDoc } from '@/lib/firebase/products';

type SavePriceSettingsInput = {
	cashDiscountPercent: number;
	transferDiscountPercent: number;
};

async function requireAuthUser() {
	const user = await requireSessionUser();
	if ('error' in user) return { ok: false as const, message: user.error };
	return { ok: true as const, user };
}

async function reapplyGlobalDiscountsToProducts(
	cashPct: number,
	transferPct: number,
): Promise<{ ok: true; updated: number } | { ok: false; message: string }> {
	const cash = clampPercent(cashPct);
	const transfer = clampPercent(transferPct);
	let updated = 0;

	const rows = await fetchAllProductsForPricing();
	for (const row of rows) {
		const garmentCost = Math.max(0, Number(row.base_price) || 0);
		if (garmentCost <= 0) continue;

		const prices = computePricesFromGarmentCost(garmentCost, cash, transfer);
		await updateProductDoc(row.id, {
			price: prices.cash,
			transfer_price: prices.transfer,
			final_transfer_price: prices.card,
			cash_discount_percent: cash,
			transfer_discount_percent: transfer,
		});
		updated += 1;
	}

	return { ok: true, updated };
}

export async function getPriceSettingsAction() {
	return fetchPriceSettings();
}

export async function savePriceSettingsAction(
	input: SavePriceSettingsInput,
): Promise<
	| { ok: true; updatedProducts: number; warning?: string }
	| { ok: false; message: string }
> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	const cashDiscountPercent = clampPercent(input.cashDiscountPercent);
	const transferDiscountPercent = clampPercent(input.transferDiscountPercent);

	try {
		await upsertPriceSettings({
			cash_discount_percent: cashDiscountPercent,
			transfer_discount_percent: transferDiscountPercent,
		});
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : 'No se pudieron guardar los descuentos en Firestore.',
		};
	}

	let updatedProducts = 0;
	let warning: string | undefined;

	try {
		const reapply = await reapplyGlobalDiscountsToProducts(
			cashDiscountPercent,
			transferDiscountPercent,
		);
		if (!reapply.ok) {
			warning = reapply.message;
		} else {
			updatedProducts = reapply.updated;
		}
	} catch (e) {
		warning =
			e instanceof Error
				? `Descuentos guardados, pero falló el recálculo de productos: ${e.message}`
				: 'Descuentos guardados, pero no se pudieron recalcular los productos.';
	}

	revalidatePath('/app/precios');
	revalidatePath('/catalogo');
	revalidatePath('/');
	revalidatePath('/app/productos');

	return { ok: true, updatedProducts, warning };
}

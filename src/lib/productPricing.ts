export function clampPercent(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(100, n));
}

export function roundMoney(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.round(n));
}

export function computePricesFromGarmentCost(garmentCost: number, cashPct: number, transferPct: number) {
	const base = Math.max(0, garmentCost);
	const cash = roundMoney(base * (1 - clampPercent(cashPct) / 100));
	const transfer = roundMoney(base * (1 - clampPercent(transferPct) / 100));
	const card = roundMoney(base);
	return { cash, transfer, card };
}

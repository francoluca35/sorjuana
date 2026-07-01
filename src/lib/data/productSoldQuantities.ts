import { unstable_noStore as noStore } from 'next/cache';
import { fetchAllSalesOrdersForReports } from '@/lib/firebase/orders';
import { parseOrderLines } from '@/lib/data/salesReports';

export async function fetchProductSoldQuantitiesMap(): Promise<Map<string, number>> {
	noStore();
	const orders = await fetchAllSalesOrdersForReports();
	const totals = new Map<string, number>();

	for (const order of orders) {
		if (String(order.status ?? 'pending') !== 'paid') continue;
		for (const line of parseOrderLines(order.items)) {
			const productId = line.product_id?.trim();
			if (!productId) continue;
			const qty = Math.max(0, Math.floor(Number(line.qty) || 0));
			if (qty === 0) continue;
			totals.set(productId, (totals.get(productId) ?? 0) + qty);
		}
	}

	return totals;
}

export async function fetchProductSoldQuantitiesRecord(): Promise<Record<string, number>> {
	const map = await fetchProductSoldQuantitiesMap();
	return Object.fromEntries(map);
}

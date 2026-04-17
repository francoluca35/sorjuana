import type { Metadata } from 'next';
import { VentasPanel } from '@/app/components/app/VentasPanel';
import { fetchSalesOrders } from '@/lib/data/salesOrders';

export const metadata: Metadata = {
	title: 'Ventas — Sor Juana',
};

export default async function Page() {
	const orders = await fetchSalesOrders(2000);
	return <VentasPanel orders={orders} />;
}

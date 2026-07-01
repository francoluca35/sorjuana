import { fetchSalesOrders as fetchSalesOrdersFirestore } from '@/lib/firebase/orders';

export type SalesOrderStatus = 'pending' | 'paid' | 'cancelled';

export type SalesOrderPaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta';

export type SalesOrderRow = {
	id: string;
	created_at: string;
	customer_name: string;
	customer_phone: string;
	customer_locality: string;
	customer_address: string;
	items: unknown;
	total_amount: number;
	grand_total: number;
	shipping_postal_code: string | null;
	shipping_cost_ars: number | null;
	payment_method: SalesOrderPaymentMethod | null;
	status: SalesOrderStatus;
	paid_at: string | null;
};

export async function fetchSalesOrders(limit = 100): Promise<SalesOrderRow[]> {
	return fetchSalesOrdersFirestore(limit);
}

import { createClient } from '@/lib/supabase/server';

export type SalesOrderStatus = 'pending' | 'paid' | 'cancelled';

export type SalesOrderRow = {
	id: string;
	created_at: string;
	customer_name: string;
	customer_phone: string;
	customer_locality: string;
	customer_address: string;
	items: unknown;
	total_amount: number;
	status: SalesOrderStatus;
};

export async function fetchSalesOrders(limit = 100): Promise<SalesOrderRow[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('sales_orders')
		.select(
			'id, created_at, customer_name, customer_phone, customer_locality, customer_address, items, total_amount, status',
		)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) {
		console.error('fetchSalesOrders', error.message);
		return [];
	}
	const rows = (data ?? []) as (SalesOrderRow & { status?: string })[];
	return rows.map((r) => ({
		...r,
		status: (r.status as SalesOrderRow['status']) ?? 'pending',
	}));
}

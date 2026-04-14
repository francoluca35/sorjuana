import { createClient } from '@/lib/supabase/server';
import { normalizeProductRow, type ProductRow } from '@/lib/data/productCatalog';

export type { ProductRow } from '@/lib/data/productCatalog';

const PANEL_SELECT =
	'id,name,category,price,compare_at_price,image_url,created_at,kind,stock,cost,base_price,tax_applies,tax_percent,description,product_code,image_urls,video_url,min_order_qty,max_order_qty,size_inventory';

/**
 * Productos más recientes primero (por `created_at` descendente).
 * Solo importar este módulo desde Server Components o Server Actions (usa `next/headers`).
 */
export async function fetchRecentProducts(limit = 12): Promise<ProductRow[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from('products')
			.select(PANEL_SELECT)
			.order('created_at', { ascending: false })
			.limit(Math.min(Math.max(limit, 1), 500));
		if (error) {
			console.error('[fetchRecentProducts]', error.message);
			return [];
		}
		return (data ?? []).map((raw) => normalizeProductRow(raw as Record<string, unknown>));
	} catch (e) {
		console.error('[fetchRecentProducts]', e);
		return [];
	}
}

import { createClient } from '@/lib/supabase/server';
import { normalizeProductRow, type ProductRow } from '@/lib/data/productCatalog';

export type { ProductRow } from '@/lib/data/productCatalog';

const PANEL_SELECT =
	'id,name,category,price,compare_at_price,image_url,created_at,kind,stock,cost,base_price,transfer_price,final_transfer_price,tax_applies,tax_percent,description,color,product_code,image_urls,video_url,min_order_qty,max_order_qty,size_inventory';

const PANEL_SELECT_LEGACY =
	'id,name,category,price,compare_at_price,image_url,created_at,kind,stock,cost,base_price,tax_applies,tax_percent,description,color,product_code,image_urls,video_url,min_order_qty,max_order_qty,size_inventory';

/**
 * Productos más recientes primero (por `created_at` descendente).
 * Solo importar este módulo desde Server Components o Server Actions (usa `next/headers`).
 */
function missingColorColumn(message: string): boolean {
	return (
		message.includes('column products.color does not exist') ||
		message.includes('column "color" does not exist') ||
		message.includes("Could not find the 'color' column of 'products' in the schema cache")
	);
}

function missingNewPriceColumns(message: string): boolean {
	return (
		message.includes('column products.transfer_price does not exist') ||
		message.includes('column "transfer_price" does not exist') ||
		message.includes("Could not find the 'transfer_price' column of 'products' in the schema cache") ||
		message.includes('column products.final_transfer_price does not exist') ||
		message.includes('column "final_transfer_price" does not exist') ||
		message.includes("Could not find the 'final_transfer_price' column of 'products' in the schema cache")
	);
}

export async function fetchRecentProducts(limit = 12): Promise<ProductRow[]> {
	try {
		const supabase = await createClient();
		const normalizedLimit = Math.min(Math.max(limit, 1), 500);
		const run = (selectStr: string) =>
			supabase
				.from('products')
				.select(selectStr)
				.order('created_at', { ascending: false })
				.limit(normalizedLimit);

		let { data, error } = await run(PANEL_SELECT);
		if (!error) {
			return (data ?? []).map((raw) => normalizeProductRow(raw as Record<string, unknown>));
		}

		if (missingColorColumn(error.message)) {
			const second = await run(PANEL_SELECT.replace(',color', ''));
			if (!second.error) {
				return (second.data ?? []).map((raw) => normalizeProductRow(raw as Record<string, unknown>));
			}
			error = second.error;
		}

		if (missingNewPriceColumns(error.message)) {
			let third = await run(PANEL_SELECT_LEGACY);
			if (!third.error) {
				return (third.data ?? []).map((raw) => normalizeProductRow(raw as Record<string, unknown>));
			}
			if (missingColorColumn(third.error.message)) {
				const fourth = await run(PANEL_SELECT_LEGACY.replace(',color', ''));
				if (!fourth.error) {
					return (fourth.data ?? []).map((raw) => normalizeProductRow(raw as Record<string, unknown>));
				}
				console.error('[fetchRecentProducts]', fourth.error.message);
				return [];
			}
			console.error('[fetchRecentProducts]', third.error.message);
			return [];
		}

		console.error('[fetchRecentProducts]', error.message);
		return [];
	} catch (e) {
		console.error('[fetchRecentProducts]', e);
		return [];
	}
}

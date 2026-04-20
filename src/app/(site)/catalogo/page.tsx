import { Suspense } from 'react';
import { CatalogoPage } from '@/app/pages/CatalogoPage';
import { fetchRecentProducts } from '@/lib/data/recentProducts';
import { PLACEHOLDER_IMG, productRowToCatalogProduct } from '@/lib/data/productCatalog';

/** Supabase server client usa cookies; el catálogo no puede pre-renderizarse estático. */
export const dynamic = 'force-dynamic';

function CatalogoFallback() {
	return (
		<div
			className="flex min-h-[50vh] items-center justify-center text-sm text-[#6b6156]"
			style={{ fontFamily: 'Montserrat, sans-serif' }}
		>
			Cargando catálogo…
		</div>
	);
}

export default async function Page() {
	const rows = await fetchRecentProducts(500);
	const products = rows.map((row) => {
		const p = productRowToCatalogProduct(row);
		return {
			id: p.id,
			name: p.name,
			garment_cost: p.base_price,
			price: p.price,
			transfer_price: p.transfer_price,
			final_transfer_price: p.final_transfer_price,
			cash_discount_percent: p.cash_discount_percent,
			transfer_discount_percent: p.transfer_discount_percent,
			image: p.image || PLACEHOLDER_IMG,
			category_db: p.category_db,
			gallery_image_urls: p.gallery_image_urls,
			video_url: p.video_url,
			description: p.description,
			size_inventory: p.size_inventory,
			stock: p.stock,
		};
	});

	return (
		<Suspense fallback={<CatalogoFallback />}>
			<CatalogoPage products={products} />
		</Suspense>
	);
}

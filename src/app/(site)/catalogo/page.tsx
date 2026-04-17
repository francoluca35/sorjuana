import { CatalogoPage } from '@/app/pages/CatalogoPage';
import { fetchRecentProducts } from '@/lib/data/recentProducts';
import { PLACEHOLDER_IMG, productRowToCatalogProduct } from '@/lib/data/productCatalog';

export default async function Page() {
	const rows = await fetchRecentProducts(500);
	const products = rows.map((row) => {
		const p = productRowToCatalogProduct(row);
		return {
			id: p.id,
			name: p.name,
			price: p.price,
			transfer_price: p.transfer_price,
			final_transfer_price: p.final_transfer_price,
			image: p.image || PLACEHOLDER_IMG,
			category_db: p.category_db,
			gallery_image_urls: p.gallery_image_urls,
			video_url: p.video_url,
			description: p.description,
			size_inventory: p.size_inventory,
			stock: p.stock,
		};
	});

	return <CatalogoPage products={products} />;
}

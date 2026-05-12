import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CatalogoPage } from '@/app/pages/CatalogoPage';
import { fetchStorefrontCatalogRows } from '@/lib/data/recentProducts';
import { PLACEHOLDER_IMG, productRowToCatalogProduct } from '@/lib/data/productCatalog';
import { getCanonicalUrl } from '@/lib/seo';

const canonicalUrl = getCanonicalUrl('/catalogo');

export const metadata: Metadata = {
	title: 'Catálogo de moda femenina',
	description:
		'Explorá el catálogo de Sor Juana con prendas italianas y francesas. Novedades, precios y disponibilidad actualizada.',
	alternates: {
		canonical: '/catalogo',
	},
	openGraph: {
		url: '/catalogo',
		title: 'Catálogo de moda femenina | Sor Juana',
		description:
			'Explorá el catálogo de Sor Juana con prendas italianas y francesas. Novedades, precios y disponibilidad actualizada.',
	},
	twitter: {
		title: 'Catálogo de moda femenina | Sor Juana',
		description:
			'Explorá el catálogo de Sor Juana con prendas italianas y francesas. Novedades, precios y disponibilidad actualizada.',
	},
};

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

function firstSearchParam(v: string | string[] | undefined): string | undefined {
	if (Array.isArray(v)) return v[0];
	return v;
}

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ categoria?: string | string[]; filter?: string | string[] }>;
}) {
	const sp = await searchParams;
	const rows = await fetchStorefrontCatalogRows({
		categoria: firstSearchParam(sp.categoria),
		filter: firstSearchParam(sp.filter),
	});
	const products = rows.map((row) => {
		const p = productRowToCatalogProduct(row);
		return {
			id: p.id,
			name: p.name,
			product_code: p.code === '—' ? '' : p.code.trim(),
			color: p.color,
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
	const itemListJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'Catálogo Sor Juana',
		url: canonicalUrl,
		itemListElement: products.slice(0, 20).map((product, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			url: canonicalUrl,
			item: {
				'@type': 'Product',
				name: product.name,
				sku: product.product_code || undefined,
				image: product.image ? [product.image] : undefined,
				description: product.description || undefined,
			},
		})),
	};

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
			/>
			<Suspense fallback={<CatalogoFallback />}>
				<CatalogoPage products={products} />
			</Suspense>
		</>
	);
}

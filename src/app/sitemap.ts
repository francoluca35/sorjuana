import type { MetadataRoute } from 'next';
import { fetchLatestProductCreatedAt } from '@/lib/firebase/products';
import { getCanonicalUrl } from '@/lib/seo';

async function fetchCatalogLastModified(): Promise<Date | undefined> {
	try {
		const latest = await fetchLatestProductCreatedAt();
		return latest ? new Date(latest) : undefined;
	} catch {
		return undefined;
	}
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const now = new Date();
	const catalogLastModified = (await fetchCatalogLastModified()) ?? now;

	return [
		{
			url: getCanonicalUrl('/'),
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 1,
		},
		{
			url: getCanonicalUrl('/catalogo'),
			lastModified: catalogLastModified,
			changeFrequency: 'daily',
			priority: 0.9,
		},
		{
			url: getCanonicalUrl('/politica-cambios-devoluciones'),
			lastModified: now,
			changeFrequency: 'monthly',
			priority: 0.5,
		},
		{
			url: getCanonicalUrl('/terminos-y-condiciones'),
			lastModified: now,
			changeFrequency: 'monthly',
			priority: 0.5,
		},
	];
}

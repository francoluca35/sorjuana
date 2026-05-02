import type { MetadataRoute } from 'next';
import { getCanonicalUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
	const now = new Date();

	return [
		{
			url: getCanonicalUrl('/'),
			lastModified: now,
			changeFrequency: 'weekly',
			priority: 1,
		},
		{
			url: getCanonicalUrl('/catalogo'),
			lastModified: now,
			changeFrequency: 'daily',
			priority: 0.9,
		},
		{
			url: getCanonicalUrl('/politica-cambios-devoluciones'),
			lastModified: now,
			changeFrequency: 'monthly',
			priority: 0.5,
		},
	];
}

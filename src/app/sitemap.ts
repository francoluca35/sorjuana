import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getCanonicalUrl } from '@/lib/seo';

async function fetchCatalogLastModified(): Promise<Date | undefined> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from('products')
			.select('created_at')
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error || !data?.created_at) return undefined;
		return new Date(data.created_at);
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
	];
}

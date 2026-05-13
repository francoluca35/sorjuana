import type { MetadataRoute } from 'next';
import {
	SITE_DESCRIPTION,
	SITE_NAME,
	SITE_TITLE,
	DEFAULT_OG_IMAGE_PATH,
	getSiteUrl,
} from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: SITE_TITLE,
		short_name: SITE_NAME,
		description: SITE_DESCRIPTION,
		start_url: '/',
		display: 'standalone',
		background_color: '#e8e3db',
		theme_color: '#1a1410',
		lang: 'es-AR',
		icons: [
			{
				src: DEFAULT_OG_IMAGE_PATH,
				sizes: '512x512',
				type: 'image/png',
			},
		],
		id: getSiteUrl(),
	};
}

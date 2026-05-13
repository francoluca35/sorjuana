import type { Metadata } from 'next';
import { HomePage } from '@/app/pages/HomePage';
import {
	SITE_DESCRIPTION,
	SITE_TITLE,
	buildHomeJsonLd,
	getDefaultOgImageUrl,
} from '@/lib/seo';

const homeJsonLd = buildHomeJsonLd();
const ogImage = getDefaultOgImageUrl();

export const metadata: Metadata = {
	title: SITE_TITLE,
	description: SITE_DESCRIPTION,
	alternates: {
		canonical: '/',
	},
	openGraph: {
		url: '/',
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		images: [{ url: ogImage, alt: SITE_TITLE }],
	},
	twitter: {
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		images: [ogImage],
	},
};

export default async function Page() {
	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
			/>
			<HomePage />
		</>
	);
}

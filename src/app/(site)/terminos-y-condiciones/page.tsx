import type { Metadata } from 'next';
import { TerminosYCondicionesPage } from '@/app/pages/TerminosYCondicionesPage';
import { fetchSiteHomeConfig } from '@/lib/data/siteHomeConfig';
import { SITE_NAME, getDefaultOgImageUrl } from '@/lib/seo';
import { DEFAULT_TERMS_CONDITIONS } from '@/lib/termsConditionsConfig';

const ogImage = getDefaultOgImageUrl();

export async function generateMetadata(): Promise<Metadata> {
	const cfg = await fetchSiteHomeConfig();
	const terms = cfg.termsConditions ?? DEFAULT_TERMS_CONDITIONS;

	return {
		title: terms.pageTitle,
		description: terms.intro,
		alternates: {
			canonical: '/terminos-y-condiciones',
		},
		openGraph: {
			url: '/terminos-y-condiciones',
			title: `${terms.pageTitle} | ${SITE_NAME}`,
			description: terms.intro,
			images: [{ url: ogImage, alt: `${terms.pageTitle} | ${SITE_NAME}` }],
		},
		twitter: {
			title: `${terms.pageTitle} | ${SITE_NAME}`,
			description: terms.intro,
			images: [ogImage],
		},
	};
}

export default async function Page() {
	const cfg = await fetchSiteHomeConfig();
	const terms = cfg.termsConditions ?? DEFAULT_TERMS_CONDITIONS;

	return <TerminosYCondicionesPage terms={terms} />;
}

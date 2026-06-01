import type { Metadata } from 'next';
import { PoliticaCambiosDevolucionesPage } from '@/app/pages/PoliticaCambiosDevolucionesPage';
import { fetchSiteHomeConfig } from '@/lib/data/siteHomeConfig';
import { DEFAULT_RETURN_POLICY } from '@/lib/returnPolicyConfig';
import { SITE_NAME, getDefaultOgImageUrl } from '@/lib/seo';

const ogImage = getDefaultOgImageUrl();

export async function generateMetadata(): Promise<Metadata> {
	const cfg = await fetchSiteHomeConfig();
	const policy = cfg.returnPolicy ?? DEFAULT_RETURN_POLICY;
	const policyTitle = policy.pageTitle;
	const policyDescription = policy.intro;

	return {
		title: policyTitle,
		description: policyDescription,
		alternates: {
			canonical: '/politica-cambios-devoluciones',
		},
		openGraph: {
			url: '/politica-cambios-devoluciones',
			title: `${policyTitle} | ${SITE_NAME}`,
			description: policyDescription,
			images: [{ url: ogImage, alt: `${policyTitle} | ${SITE_NAME}` }],
		},
		twitter: {
			title: `${policyTitle} | ${SITE_NAME}`,
			description: policyDescription,
			images: [ogImage],
		},
	};
}

export default async function Page() {
	const cfg = await fetchSiteHomeConfig();
	const policy = cfg.returnPolicy ?? DEFAULT_RETURN_POLICY;

	return <PoliticaCambiosDevolucionesPage policy={policy} />;
}

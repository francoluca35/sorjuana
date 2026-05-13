import type { Metadata } from 'next';
import { PoliticaCambiosDevolucionesPage } from '@/app/pages/PoliticaCambiosDevolucionesPage';
import { SITE_NAME, getDefaultOgImageUrl } from '@/lib/seo';

const policyTitle = 'Política de cambios y devoluciones';
const policyDescription =
	'Condiciones de cambios y devoluciones en Sor Juana Liberté: plazos, modalidad, envíos y contacto por WhatsApp.';
const ogImage = getDefaultOgImageUrl();

export const metadata: Metadata = {
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

export default function Page() {
	return <PoliticaCambiosDevolucionesPage />;
}

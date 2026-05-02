import type { Metadata } from 'next';
import { HomePage } from '@/app/pages/HomePage';
import { getCanonicalUrl } from '@/lib/seo';

const canonicalUrl = getCanonicalUrl('/');

const organizationJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Organization',
	name: 'Sor Juana',
	url: canonicalUrl,
	address: {
		'@type': 'PostalAddress',
		addressLocality: 'Merlo',
		addressRegion: 'Buenos Aires',
		addressCountry: 'AR',
	},
};

export const metadata: Metadata = {
	title: 'Sor Juana — Moda italiana y francesa',
	description:
		'Elegancia europea en Merlo, Buenos Aires, Argentina. Envíos a todo el país en moda italiana y francesa de alta calidad.',
	alternates: {
		canonical: '/',
	},
	openGraph: {
		url: '/',
		title: 'Sor Juana — Moda italiana y francesa',
		description:
			'Elegancia europea en Merlo, Buenos Aires, Argentina. Envíos a todo el país en moda italiana y francesa de alta calidad.',
	},
	twitter: {
		title: 'Sor Juana — Moda italiana y francesa',
		description:
			'Elegancia europea en Merlo, Buenos Aires, Argentina. Envíos a todo el país en moda italiana y francesa de alta calidad.',
	},
};

export default async function Page() {
	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
			/>
			<HomePage />
		</>
	);
}

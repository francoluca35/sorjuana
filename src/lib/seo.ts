import type { Metadata } from 'next';

const FALLBACK_SITE_URL = 'https://www.sorjuanaliberte.com.ar';
const DEFAULT_GOOGLE_VERIFICATION = 'T43hwfD8hsRYQSuHv-wXm6qjFv9MGYZNbjM-Me3R5j0';

export const SITE_NAME = 'Sor Juana';
export const SITE_TAGLINE = 'Moda italiana y francesa';
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
	'Elegancia europea en Merlo, Buenos Aires, Argentina. Envíos a todo el país en moda italiana y francesa de alta calidad.';
export const SITE_KEYWORDS = [
	'Sor Juana',
	'moda femenina',
	'moda italiana',
	'moda francesa',
	'ropa mujer',
	'Merlo Buenos Aires',
	'envíos Argentina',
	'tienda de ropa',
	'elegancia europea',
	'Liberté Sor Juana',
];
export const SITE_LOCALE = 'es_AR';
export const SITE_INSTAGRAM = 'https://www.instagram.com/libertesorjuana';
export const SITE_WHATSAPP = 'https://wa.me/5491159795700';
export const DEFAULT_OG_IMAGE_PATH = '/Assets/logo-pdf.png';

export function getSiteUrl() {
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
	if (!siteUrl) return FALLBACK_SITE_URL;

	try {
		return new URL(siteUrl).toString().replace(/\/$/, '');
	} catch {
		return FALLBACK_SITE_URL;
	}
}

export function getCanonicalUrl(pathname: string) {
	return new URL(pathname, getSiteUrl()).toString();
}

export function getGoogleSiteVerification() {
	return (
		process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
		DEFAULT_GOOGLE_VERIFICATION
	);
}

export function getDefaultOgImageUrl() {
	return getCanonicalUrl(DEFAULT_OG_IMAGE_PATH);
}

export function buildRootMetadata(): Metadata {
	const siteUrl = getSiteUrl();
	const ogImage = getDefaultOgImageUrl();

	return {
		metadataBase: new URL(siteUrl),
		title: {
			default: SITE_TITLE,
			template: `%s | ${SITE_NAME}`,
		},
		description: SITE_DESCRIPTION,
		applicationName: SITE_NAME,
		keywords: SITE_KEYWORDS,
		authors: [{ name: SITE_NAME, url: siteUrl }],
		creator: SITE_NAME,
		publisher: SITE_NAME,
		category: 'fashion',
		alternates: {
			canonical: '/',
		},
		icons: {
			icon: DEFAULT_OG_IMAGE_PATH,
			apple: DEFAULT_OG_IMAGE_PATH,
		},
		openGraph: {
			type: 'website',
			locale: SITE_LOCALE,
			url: '/',
			siteName: SITE_NAME,
			title: SITE_TITLE,
			description: SITE_DESCRIPTION,
			images: [
				{
					url: ogImage,
					alt: SITE_TITLE,
				},
			],
		},
		twitter: {
			card: 'summary_large_image',
			title: SITE_TITLE,
			description: SITE_DESCRIPTION,
			images: [ogImage],
		},
		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				'max-image-preview': 'large',
				'max-snippet': -1,
				'max-video-preview': -1,
			},
		},
		verification: {
			google: getGoogleSiteVerification(),
		},
		formatDetection: {
			telephone: false,
			email: false,
			address: false,
		},
	};
}

export function buildHomeJsonLd() {
	const siteUrl = getSiteUrl();
	const canonicalUrl = getCanonicalUrl('/');

	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Organization',
				'@id': `${siteUrl}/#organization`,
				name: SITE_NAME,
				url: siteUrl,
				logo: getDefaultOgImageUrl(),
				sameAs: [SITE_INSTAGRAM, SITE_WHATSAPP],
				address: {
					'@type': 'PostalAddress',
					addressLocality: 'Merlo',
					addressRegion: 'Buenos Aires',
					addressCountry: 'AR',
				},
			},
			{
				'@type': 'WebSite',
				'@id': `${siteUrl}/#website`,
				url: siteUrl,
				name: SITE_NAME,
				description: SITE_DESCRIPTION,
				inLanguage: 'es-AR',
				publisher: { '@id': `${siteUrl}/#organization` },
			},
			{
				'@type': 'ClothingStore',
				'@id': `${siteUrl}/#store`,
				name: SITE_NAME,
				url: canonicalUrl,
				description: SITE_DESCRIPTION,
				image: getDefaultOgImageUrl(),
				telephone: '+54-9-11-5979-5700',
				address: {
					'@type': 'PostalAddress',
					addressLocality: 'Merlo',
					addressRegion: 'Buenos Aires',
					addressCountry: 'AR',
				},
				areaServed: {
					'@type': 'Country',
					name: 'Argentina',
				},
				sameAs: [SITE_INSTAGRAM, SITE_WHATSAPP],
			},
		],
	};
}

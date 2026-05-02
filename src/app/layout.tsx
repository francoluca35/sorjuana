import type { Metadata } from 'next';
import '@/styles/index.css';
import { SiteProviders } from '@/app/components/SiteProviders';
import { getSiteUrl } from '@/lib/seo';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: 'Sor Juana — Moda italiana y francesa',
		template: '%s | Sor Juana',
	},
	description:
		'Elegancia europea en Merlo, Buenos Aires, Argentina. Envíos a todo el país en moda italiana y francesa de alta calidad.',
	applicationName: 'Sor Juana',
	alternates: {
		canonical: '/',
	},
	openGraph: {
		type: 'website',
		locale: 'es_AR',
		url: '/',
		siteName: 'Sor Juana',
		title: 'Sor Juana — Moda italiana y francesa',
		description:
			'Elegancia europea en Merlo, Buenos Aires, Argentina. Envíos a todo el país en moda italiana y francesa de alta calidad.',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Sor Juana — Moda italiana y francesa',
		description:
			'Elegancia europea en Merlo, Buenos Aires, Argentina. Envíos a todo el país en moda italiana y francesa de alta calidad.',
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es">
			<body>
				<SiteProviders>{children}</SiteProviders>
			</body>
		</html>
	);
}

import type { Metadata } from 'next';
import '@/styles/index.css';
import { SiteProviders } from '@/app/components/SiteProviders';
import { buildRootMetadata } from '@/lib/seo';

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es-AR">
			<body>
				<SiteProviders>{children}</SiteProviders>
			</body>
		</html>
	);
}

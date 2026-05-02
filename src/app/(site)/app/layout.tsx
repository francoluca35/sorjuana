import type { Metadata } from 'next';
import { AppShell } from '@/app/components/app/AppShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	title: 'Panel — Sor Juana Liberté',
	description: 'Administración de Sor Juana Liberté.',
	robots: {
		index: false,
		follow: false,
		nocache: true,
	},
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return <AppShell>{children}</AppShell>;
}

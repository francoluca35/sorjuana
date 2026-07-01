import type { Metadata } from 'next';
import { InformesVentasPage } from '@/app/pages/InformesVentasPage';

export const metadata: Metadata = {
	title: 'Informes de ventas — Sor Juana',
};

export const dynamic = 'force-dynamic';

export default function Page() {
	return <InformesVentasPage />;
}

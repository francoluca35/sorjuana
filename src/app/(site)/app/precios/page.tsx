import type { Metadata } from 'next';
import { PreciosAdminPanel } from '@/app/components/app/PreciosAdminPanel';

export const metadata: Metadata = {
	title: 'Precios — Sor Juana',
};

export default function PreciosPage() {
	return <PreciosAdminPanel />;
}

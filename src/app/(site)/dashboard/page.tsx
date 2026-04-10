import type { Metadata } from 'next';
import { DashboardHome } from '@/app/pages/DashboardHome';

export const metadata: Metadata = {
  title: 'Panel — Sor Juana Liberté',
  description: 'Panel de administración de Sor Juana Liberté.',
};

export default function DashboardPage() {
  return <DashboardHome />;
}

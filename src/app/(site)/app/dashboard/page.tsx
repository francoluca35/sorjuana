import type { Metadata } from 'next';
import { DashboardHome } from '@/app/pages/DashboardHome';

export const metadata: Metadata = {
  title: 'Dashboard — Sor Juana',
};

export default function Page() {
  return <DashboardHome />;
}

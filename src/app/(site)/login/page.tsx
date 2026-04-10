import type { Metadata } from 'next';
import { LoginPage } from '@/app/pages/LoginPage';

export const metadata: Metadata = {
  title: 'Iniciar sesión — Sor Juana',
  description: 'Accedé a tu cuenta en Sor Juana Liberté.',
};

export default function Page() {
  return <LoginPage />;
}

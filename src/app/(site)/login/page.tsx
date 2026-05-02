import type { Metadata } from 'next';
import { LoginPage } from '@/app/pages/LoginPage';

export const metadata: Metadata = {
	title: 'Iniciar sesión',
	description: 'Accedé a tu cuenta en Sor Juana Liberté.',
	alternates: {
		canonical: '/login',
	},
	robots: {
		index: false,
		follow: false,
	},
};

export default function Page() {
	return <LoginPage />;
}

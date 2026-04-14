import type { Metadata } from 'next';
import { PoliticaCambiosDevolucionesPage } from '@/app/pages/PoliticaCambiosDevolucionesPage';

export const metadata: Metadata = {
  title: 'Política de cambios y devoluciones — Sor Juana Liberté',
  description:
    'Condiciones de cambios y devoluciones en Sor Juana Liberté: plazos, modalidad, envíos y contacto por WhatsApp.',
};

export default function Page() {
  return <PoliticaCambiosDevolucionesPage />;
}

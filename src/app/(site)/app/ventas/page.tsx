import type { Metadata } from 'next';
import { AppPanel } from '@/app/components/app/AppPanel';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

export const metadata: Metadata = {
  title: 'Control de ventas — Sor Juana',
};

export default function Page() {
  return (
    <AppPanel>
      <h1 className="mb-2 text-2xl font-light text-[#1a1410] sm:text-3xl" style={{ fontFamily: serif }}>
        Control de ventas
      </h1>
      <p className="text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
        Próximamente vas a poder consultar y gestionar ventas desde este módulo.
      </p>
    </AppPanel>
  );
}

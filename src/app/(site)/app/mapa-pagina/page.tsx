import type { Metadata } from 'next';
import { AppPanel } from '@/app/components/app/AppPanel';
import { MapaPaginaContent } from '@/app/components/app/MapaPaginaContent';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

export const metadata: Metadata = {
	title: 'Mapa de página — Sor Juana',
};

export default function Page() {
	return (
		<AppPanel>
			<h1 className="mb-2 text-2xl font-light text-[#1a1410] sm:text-3xl" style={{ fontFamily: serif }}>
				Mapa de página
			</h1>
			<p className="mb-8 text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
				Elegí la sección: el hero se guarda en el sitio (Supabase) al pulsar Guardar; también se copia una copia local
				por si necesitás recuperar. Más vendidos (hasta 4) y Recién llegados (hasta 6) eligen productos desde la
				tabla.
			</p>
			<MapaPaginaContent />
		</AppPanel>
	);
}

'use client';

import { useState } from 'react';
import { MapaPaginaHeroEditor } from '@/app/components/app/MapaPaginaHeroEditor';
import { MapaPaginaMasVendidosPanel } from '@/app/components/app/MapaPaginaMasVendidosPanel';
import { MapaPaginaRecienLlegadosPanel } from '@/app/components/app/MapaPaginaRecienLlegadosPanel';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';

type Seccion = 'hero' | 'masvendidos' | 'recien';

export function MapaPaginaContent() {
	const [seccion, setSeccion] = useState<Seccion>('hero');

	return (
		<div className="space-y-6">
			<div
				className="inline-flex rounded-xl border border-[#b8956a]/30 bg-[#faf8f7]/90 p-1 shadow-sm"
				role="tablist"
				aria-label="Sección del sitio a editar"
			>
				<button
					type="button"
					role="tab"
					aria-selected={seccion === 'hero'}
					onClick={() => setSeccion('hero')}
					className={cn(
						'rounded-lg px-4 py-2.5 text-sm transition',
						seccion === 'hero'
							? 'bg-[#1a1410] text-[#f5f2ed] shadow-sm'
							: 'text-[#6b6156] hover:bg-white/70',
					)}
					style={{ fontFamily: sans, fontWeight: 500 }}
				>
					Hero
				</button>
		
				<button
					type="button"
					role="tab"
					aria-selected={seccion === 'recien'}
					onClick={() => setSeccion('recien')}
					className={cn(
						'rounded-lg px-4 py-2.5 text-sm transition',
						seccion === 'recien'
							? 'bg-[#1a1410] text-[#f5f2ed] shadow-sm'
							: 'text-[#6b6156] hover:bg-white/70',
					)}
					style={{ fontFamily: sans, fontWeight: 500 }}
				>
					Recién llegados
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={seccion === 'masvendidos'}
					onClick={() => setSeccion('masvendidos')}
					className={cn(
						'rounded-lg px-4 py-2.5 text-sm transition',
						seccion === 'masvendidos'
							? 'bg-[#1a1410] text-[#f5f2ed] shadow-sm'
							: 'text-[#6b6156] hover:bg-white/70',
					)}
					style={{ fontFamily: sans, fontWeight: 500 }}
				>
					Más vendidos
				</button>
			</div>

			{seccion === 'hero' ? (
				<MapaPaginaHeroEditor />
			) : seccion === 'masvendidos' ? (
				<MapaPaginaMasVendidosPanel />
			) : (
				<MapaPaginaRecienLlegadosPanel />
			)}
		</div>
	);
}

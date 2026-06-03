'use client';

import { useState } from 'react';
import { MapaPaginaCategorySpotlightRailPanel } from '@/app/components/app/MapaPaginaCategorySpotlightRailPanel';
import { MapaPaginaFashionCategoriesPanel } from '@/app/components/app/MapaPaginaFashionCategoriesPanel';
import { MapaPaginaHeroEditor } from '@/app/components/app/MapaPaginaHeroEditor';
import { MapaPaginaMasVendidosPanel } from '@/app/components/app/MapaPaginaMasVendidosPanel';
import { MapaPaginaRecienLlegadosPanel } from '@/app/components/app/MapaPaginaRecienLlegadosPanel';
import { MapaPaginaReturnPolicyPanel } from '@/app/components/app/MapaPaginaReturnPolicyPanel';
import { MapaPaginaTermsPanel } from '@/app/components/app/MapaPaginaTermsPanel';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';

type Seccion =
	| 'hero'
	| 'coleccion'
	| 'categorias'
	| 'masvendidos'
	| 'recien'
	| 'politica'
	| 'terminos';

const TABS: { id: Seccion; label: string }[] = [
	{ id: 'hero', label: 'Hero' },
	{ id: 'coleccion', label: 'Colección' },
	{ id: 'categorias', label: 'Categorías' },
	{ id: 'recien', label: 'Recién llegados' },
	{ id: 'masvendidos', label: 'Más vendidos' },
	{ id: 'politica', label: 'Política de cambios' },
	{ id: 'terminos', label: 'Términos' },
];

export function MapaPaginaContent() {
	const [seccion, setSeccion] = useState<Seccion>('hero');

	return (
		<div className="space-y-6">
			<div
				className="flex max-w-full flex-wrap gap-1 rounded-xl border border-[#b8956a]/30 bg-[#faf8f7]/90 p-1 shadow-sm"
				role="tablist"
				aria-label="Sección del sitio a editar"
			>
				{TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={seccion === tab.id}
						onClick={() => setSeccion(tab.id)}
						className={cn(
							'rounded-lg px-3 py-2 text-sm transition sm:px-4 sm:py-2.5',
							seccion === tab.id
								? 'bg-[#1a1410] text-[#f5f2ed] shadow-sm'
								: 'text-[#6b6156] hover:bg-white/70',
						)}
						style={{ fontFamily: sans, fontWeight: 500 }}
					>
						{tab.label}
					</button>
				))}
			</div>

			{seccion === 'hero' ? (
				<MapaPaginaHeroEditor />
			) : seccion === 'coleccion' ? (
				<MapaPaginaFashionCategoriesPanel />
			) : seccion === 'categorias' ? (
				<MapaPaginaCategorySpotlightRailPanel />
			) : seccion === 'masvendidos' ? (
				<MapaPaginaMasVendidosPanel />
			) : seccion === 'recien' ? (
				<MapaPaginaRecienLlegadosPanel />
			) : seccion === 'politica' ? (
				<MapaPaginaReturnPolicyPanel />
			) : (
				<MapaPaginaTermsPanel />
			)}
		</div>
	);
}

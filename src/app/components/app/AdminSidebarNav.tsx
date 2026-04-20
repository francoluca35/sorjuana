'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	LayoutDashboard,
	PackagePlus,
	ListOrdered,
	FolderTree,
	Map,
	LineChart,
	Sheet,
	FileBarChart,
	BadgePercent,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';

const NAV_BEFORE_VENTAS = [
	{ href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ href: '/app/cargar-producto', label: 'Carga de producto', icon: PackagePlus },
	{ href: '/app/carga-excel', label: 'Carga de excel', icon: Sheet },
	{ href: '/app/productos', label: 'Lista de productos', icon: ListOrdered },
	{ href: '/app/precios', label: 'Precios', icon: BadgePercent },
	{ href: '/app/categorias', label: 'Categorías', icon: FolderTree },
	{ href: '/app/mapa-pagina', label: 'Mapa de página', icon: Map },
] as const;

type VentasProps = {
	collapsed: boolean;
	onNavigate?: () => void;
};

/** Ítem del sidebar para el módulo de ventas (`/app/ventas`). */
export function Ventas({ collapsed, onNavigate }: VentasProps) {
	const pathname = usePathname();
	const href = '/app/ventas';
	const active = pathname === href || pathname.startsWith(`${href}/`);
	const Icon = LineChart;

	return (
		<Link
			href={href}
			title={collapsed ? 'Ventas' : undefined}
			onClick={onNavigate}
			className={cn(
				'flex items-center text-sm tracking-wide transition-colors',
				collapsed ? 'justify-center px-0 py-3' : 'gap-3 border-l-2 border-transparent px-3 py-2.5',
				active &&
					(collapsed
						? 'rounded-md bg-[#b8956a]/20 text-[#f5f2ed]'
						: 'border-[#b8956a] bg-[#b8956a]/15 text-[#f5f2ed]'),
				!active &&
					(collapsed
						? 'text-[#e8e3db]/85 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]'
						: 'text-[#e8e3db]/80 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]'),
			)}
			style={{ fontFamily: sans, fontWeight: 300 }}
		>
			<Icon className="h-4 w-4 shrink-0 text-[#b8956a]" strokeWidth={1.5} aria-hidden />
			{!collapsed ? <span className="truncate">Ventas</span> : null}
		</Link>
	);
}

type InformesVentasProps = {
	collapsed: boolean;
	onNavigate?: () => void;
};

export function InformesVentasLink({ collapsed, onNavigate }: InformesVentasProps) {
	const pathname = usePathname();
	const href = '/app/informes-ventas';
	const active = pathname === href || pathname.startsWith(`${href}/`);
	const Icon = FileBarChart;

	return (
		<Link
			href={href}
			title={collapsed ? 'Informes de ventas' : undefined}
			onClick={onNavigate}
			className={cn(
				'flex items-center text-sm tracking-wide transition-colors',
				collapsed ? 'justify-center px-0 py-3' : 'gap-3 border-l-2 border-transparent px-3 py-2.5',
				active &&
					(collapsed
						? 'rounded-md bg-[#b8956a]/20 text-[#f5f2ed]'
						: 'border-[#b8956a] bg-[#b8956a]/15 text-[#f5f2ed]'),
				!active &&
					(collapsed
						? 'text-[#e8e3db]/85 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]'
						: 'text-[#e8e3db]/80 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]'),
			)}
			style={{ fontFamily: sans, fontWeight: 300 }}
		>
			<Icon className="h-4 w-4 shrink-0 text-[#b8956a]" strokeWidth={1.5} aria-hidden />
			{!collapsed ? <span className="truncate">Informes de ventas</span> : null}
		</Link>
	);
}

export function NavLinks({
	collapsed,
	onNavigate,
	className,
}: {
	collapsed: boolean;
	onNavigate?: () => void;
	className?: string;
}) {
	const pathname = usePathname();

	return (
		<nav className={cn('flex flex-col gap-0.5', collapsed && 'items-stretch', className)}>
			{NAV_BEFORE_VENTAS.map(({ href, label, icon: Icon }) => {
				const active = pathname === href || pathname.startsWith(`${href}/`);
				return (
					<Link
						key={href}
						href={href}
						title={collapsed ? label : undefined}
						onClick={onNavigate}
						className={cn(
							'flex items-center text-sm tracking-wide transition-colors',
							collapsed ? 'justify-center px-0 py-3' : 'gap-3 border-l-2 border-transparent px-3 py-2.5',
							active &&
								(collapsed
									? 'rounded-md bg-[#b8956a]/20 text-[#f5f2ed]'
									: 'border-[#b8956a] bg-[#b8956a]/15 text-[#f5f2ed]'),
							!active &&
								(collapsed
									? 'text-[#e8e3db]/85 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]'
									: 'text-[#e8e3db]/80 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]'),
						)}
						style={{ fontFamily: sans, fontWeight: 300 }}
					>
						<Icon className="h-4 w-4 shrink-0 text-[#b8956a]" strokeWidth={1.5} aria-hidden />
						{!collapsed ? <span className="truncate">{label}</span> : null}
					</Link>
				);
			})}
			<Ventas collapsed={collapsed} onNavigate={onNavigate} />
			<InformesVentasLink collapsed={collapsed} onNavigate={onNavigate} />
		</nav>
	);
}

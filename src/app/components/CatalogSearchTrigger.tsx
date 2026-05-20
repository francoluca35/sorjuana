'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { cn } from '@/app/components/ui/utils';

type Props = {
	className?: string;
	iconClassName?: string;
	/** En catálogo sincroniza con `?q=` de la URL. */
	syncWithCatalogQuery?: boolean;
	/** En móvil abre el catálogo en lugar de expandir input en la barra. */
	preferCatalogOnMobile?: boolean;
};

export function CatalogSearchTrigger({
	className,
	iconClassName,
	syncWithCatalogQuery = false,
	preferCatalogOnMobile = true,
}: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const isCatalog = pathname.startsWith('/catalogo');
	const inputRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState('');
	const [isCompactNav, setIsCompactNav] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia('(max-width: 1023px)');
		const apply = () => setIsCompactNav(mq.matches);
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	}, []);

	useEffect(() => {
		if (!syncWithCatalogQuery || !isCatalog || typeof window === 'undefined') return;
		const q = new URLSearchParams(window.location.search).get('q') ?? '';
		setValue(q);
	}, [syncWithCatalogQuery, isCatalog, pathname]);

	useEffect(() => {
		if (open) inputRef.current?.focus();
	}, [open]);

	const submit = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			const term = value.trim();
			const target = term ? `/catalogo?q=${encodeURIComponent(term)}` : '/catalogo';
			if (isCatalog && syncWithCatalogQuery) {
				router.replace(target, { scroll: false });
			} else {
				router.push(target);
			}
			setOpen(false);
		},
		[value, isCatalog, syncWithCatalogQuery, router],
	);

	const openSearch = useCallback(() => {
		if (preferCatalogOnMobile && isCompactNav && !isCatalog) {
			router.push('/catalogo');
			return;
		}
		setOpen(true);
	}, [preferCatalogOnMobile, isCompactNav, isCatalog, router]);

	if (!open) {
		return (
			<button
				type="button"
				onClick={openSearch}
				className={cn(className)}
				aria-label="Buscar productos"
			>
				<Search className={cn('h-5 w-5', iconClassName)} strokeWidth={1.5} />
			</button>
		);
	}

	return (
		<form onSubmit={submit} className="flex max-w-full items-center gap-1">
			<label className="sr-only" htmlFor="nav-catalog-search">
				Buscar productos
			</label>
			<input
				ref={inputRef}
				id="nav-catalog-search"
				type="search"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder="Buscar…"
				className="w-[min(7rem,32vw)] rounded-sm border border-[#b8956a]/40 bg-[#1a1410]/90 px-2 py-1.5 text-xs text-[#f5f2ed] placeholder:text-[#8a7a68] focus:border-[#b8956a] focus:outline-none sm:w-36"
				style={{ fontFamily: 'Montserrat, sans-serif' }}
			/>
			<button
				type="button"
				onClick={() => {
					setOpen(false);
					setValue('');
				}}
				className={cn(className)}
				aria-label="Cerrar búsqueda"
			>
				<X className={cn('h-4 w-4', iconClassName)} strokeWidth={1.5} />
			</button>
		</form>
	);
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CategorySpotlight } from '@/lib/data/categorySpotlights';
import { cn } from '@/app/components/ui/utils';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type Props = {
	items: CategorySpotlight[];
};

function thresholdFor(bp: Breakpoint): number {
	switch (bp) {
		case 'mobile':
			return 4;
		case 'tablet':
			return 6;
		case 'desktop':
			return 10;
	}
}

/** Más separación con pocas categorías; se agrupa un poco más al crecer el listado. */
function gapClasses(count: number): string {
	if (count <= 4) {
		return 'gap-12 sm:gap-14 md:gap-16';
	}
	if (count <= 6) {
		return 'gap-10 sm:gap-12 md:gap-14';
	}
	if (count <= 10) {
		return 'gap-8 sm:gap-10 md:gap-12';
	}
	return 'gap-6 sm:gap-8 md:gap-10';
}

function readBreakpoint(): Breakpoint {
	if (typeof window === 'undefined') return 'desktop';
	if (window.matchMedia('(min-width: 1024px)').matches) return 'desktop';
	if (window.matchMedia('(min-width: 768px)').matches) return 'tablet';
	return 'mobile';
}

function CategoryTile({ item }: { item: CategorySpotlight }) {
	const isExternal = /^https?:\/\//i.test(item.href);
	const innerClass =
		'group flex w-full flex-col items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8956a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#e8e3db]';
	const media = (
		<>
				<span className="relative block aspect-square w-full overflow-hidden rounded-full bg-[#f5f2ed] ring-2 ring-[#b8956a]/35 ring-offset-2 ring-offset-[#e8e3db] transition duration-300 group-hover:ring-[#b8956a]/70">
					<Image
						src={item.imageUrl}
						alt={item.label}
						fill
						sizes="(max-width: 640px) 76px, 100px"
						className="object-cover transition duration-500 group-hover:scale-105"
					/>
				</span>
				<span
					className="w-full truncate text-center text-xs font-medium text-[#1a1410] sm:text-[0.8rem]"
					style={{ fontFamily: 'Montserrat, sans-serif' }}
					title={item.label}
				>
					{item.label}
				</span>
		</>
	);
	return (
		<li className="flex w-[4.75rem] shrink-0 flex-col items-center sm:w-[5.5rem] md:w-[6.25rem]">
			{isExternal ? (
				<a
					href={item.href}
					target="_blank"
					rel="noopener noreferrer"
					className={innerClass}
				>
					{media}
				</a>
			) : (
				<Link href={item.href} className={innerClass}>
					{media}
				</Link>
			)}
		</li>
	);
}

function CategoryRailStatic({
	items,
	gap,
}: {
	items: CategorySpotlight[];
	gap: string;
}) {
	return (
		<ul className={cn('flex flex-wrap justify-center pb-1', gap)}>
			{items.map((item) => (
				<CategoryTile key={item.slug} item={item} />
			))}
		</ul>
	);
}

function CategoryRailCarousel({
	items,
	gap,
}: {
	items: CategorySpotlight[];
	gap: string;
}) {
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: 'start',
		loop: false,
		containScroll: 'trimSnaps',
		dragFree: false,
	});

	const [canPrev, setCanPrev] = useState(false);
	const [canNext, setCanNext] = useState(false);

	const onSelect = useCallback(() => {
		if (!emblaApi) return;
		setCanPrev(emblaApi.canScrollPrev());
		setCanNext(emblaApi.canScrollNext());
	}, [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;
		onSelect();
		emblaApi.on('select', onSelect);
		emblaApi.on('reInit', onSelect);
		return () => {
			emblaApi.off('select', onSelect);
			emblaApi.off('reInit', onSelect);
		};
	}, [emblaApi, onSelect]);

	useEffect(() => {
		emblaApi?.reInit();
	}, [emblaApi, gap, items.length]);

	const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

	return (
		<div className="relative px-10 sm:px-12 md:px-14">
			<div className="overflow-hidden pb-1" ref={emblaRef}>
				<ul className={cn('flex', gap)}>
					{items.map((item) => (
						<CategoryTile key={item.slug} item={item} />
					))}
				</ul>
			</div>
			<button
				type="button"
				onClick={scrollPrev}
				disabled={!canPrev}
				className="absolute top-1/2 left-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#b8956a]/50 bg-white text-[#1a1410] shadow-sm transition hover:bg-[#f5f2ed] disabled:pointer-events-none disabled:opacity-30"
				aria-label="Categorías anteriores"
			>
				<ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
			</button>
			<button
				type="button"
				onClick={scrollNext}
				disabled={!canNext}
				className="absolute top-1/2 right-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#b8956a]/50 bg-white text-[#1a1410] shadow-sm transition hover:bg-[#f5f2ed] disabled:pointer-events-none disabled:opacity-30"
				aria-label="Siguientes categorías"
			>
				<ChevronRight className="h-5 w-5" strokeWidth={1.5} />
			</button>
		</div>
	);
}

export function AdminCategorySpotlightRail({ items }: Props) {
	const [bp, setBp] = useState<Breakpoint | null>(null);
	const gap = gapClasses(items.length);

	useLayoutEffect(() => {
		const sync = () => setBp(readBreakpoint());
		sync();
		window.addEventListener('resize', sync);
		return () => window.removeEventListener('resize', sync);
	}, []);

	const carouselActive = useMemo(() => {
		if (bp === null) return false;
		return items.length >= thresholdFor(bp);
	}, [bp, items.length]);

	return (
		<section
			className="border-y border-[#b8956a]/25 bg-[#e8e3db]"
			aria-labelledby="admin-category-rail-heading"
		>
			<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				<h2
					id="admin-category-rail-heading"
					className="mb-8 text-center text-[#1a1410]"
					style={{
						fontFamily: '"Cormorant Garamond", serif',
						fontSize: 'clamp(1.35rem, 2.5vw, 1.85rem)',
						fontWeight: 500,
						letterSpacing: '0.08em',
					}}
				>
					Explorá por categoría
				</h2>

				{carouselActive ? (
					<CategoryRailCarousel items={items} gap={gap} />
				) : (
					<CategoryRailStatic items={items} gap={gap} />
				)}
			</div>
		</section>
	);
}

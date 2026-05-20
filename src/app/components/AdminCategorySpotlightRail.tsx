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
	/** Menos padding cuando va justo debajo del hero. */
	compact?: boolean;
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

/** Separación en fila estática (sin carrusel). */
function gapClasses(count: number): string {
	if (count <= 5) {
		return 'gap-10 sm:gap-12 md:gap-14 lg:gap-16';
	}
	if (count <= 8) {
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

function CategoryTile({ item, inCarousel = false }: { item: CategorySpotlight; inCarousel?: boolean }) {
	const isExternal = /^https?:\/\//i.test(item.href);
	const innerClass =
		'group flex w-full flex-col items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8956a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f2ed]';
	const media = (
		<>
				<span className="relative mx-auto block aspect-square w-[4.5rem] shrink-0 overflow-hidden rounded-full bg-[#f5f2ed] ring-2 ring-[#b8956a]/35 ring-offset-2 ring-offset-[#f5f2ed] transition duration-300 group-hover:ring-[#b8956a]/70 sm:w-[5.25rem]">
					<Image
						src={item.imageUrl}
						alt={item.label}
						fill
						sizes="(max-width: 640px) 84px, 100px"
						className="object-cover transition duration-500 group-hover:scale-105"
					/>
				</span>
				<span
					className="line-clamp-2 min-h-[2.6em] w-full px-0.5 text-center text-[10px] leading-snug font-medium text-[#1a1410] sm:min-h-[2.75em] sm:text-[11px]"
					style={{ fontFamily: 'Montserrat, sans-serif' }}
					title={item.label}
				>
					{item.label}
				</span>
		</>
	);
	return (
		<li
			className={cn(
				'flex shrink-0 flex-col items-center',
				inCarousel
					? 'w-[6.75rem] basis-[6.75rem] pr-8 sm:w-[7.5rem] sm:basis-[7.5rem] sm:pr-10'
					: 'w-[6.75rem] sm:w-[7.25rem] md:w-[7.75rem]',
			)}
		>
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

const CATEGORY_RAIL_AUTOPLAY_MS = 4000;

function CategoryRailCarousel({ items }: { items: CategorySpotlight[] }) {
	const [autoplayPaused, setAutoplayPaused] = useState(false);
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => setReducedMotion(mq.matches);
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	}, []);

	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: 'start',
		loop: true,
		dragFree: false,
		duration: 20,
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
		if (!emblaApi) return;
		emblaApi.reInit({ loop: items.length > 1 });
	}, [emblaApi, items.length]);

	useEffect(() => {
		if (!emblaApi || autoplayPaused || reducedMotion || items.length < 2) return;
		const id = window.setInterval(() => emblaApi.scrollNext(), CATEGORY_RAIL_AUTOPLAY_MS);
		return () => window.clearInterval(id);
	}, [emblaApi, autoplayPaused, reducedMotion, items.length]);

	const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

	return (
		<div
			className="relative px-8 sm:px-12 md:px-14"
			onMouseEnter={() => setAutoplayPaused(true)}
			onMouseLeave={() => setAutoplayPaused(false)}
		>
			<div className="overflow-hidden pb-2" ref={emblaRef}>
				<ul className="flex touch-pan-y">
					{items.map((item) => (
						<CategoryTile key={item.slug} item={item} inCarousel />
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

export function AdminCategorySpotlightRail({ items, compact = false }: Props) {
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
			id="categorias"
			className="scroll-mt-28 border-b border-[#b8956a]/20 bg-[#f5f2ed]"
			aria-labelledby="admin-category-rail-heading"
		>
			<div
				className={cn(
					'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
					compact ? 'py-6 sm:py-8' : 'py-10',
				)}
			>
				<h2
					id="admin-category-rail-heading"
					className={cn('text-center text-[#1a1410]', compact ? 'mb-5' : 'mb-8')}
					style={{
						fontFamily: '"Cormorant Garamond", serif',
						fontSize: compact ? 'clamp(1.15rem, 2vw, 1.5rem)' : 'clamp(1.35rem, 2.5vw, 1.85rem)',
						fontWeight: 500,
						letterSpacing: '0.08em',
					}}
				>
					Explorá por categoría
				</h2>

				{carouselActive ? (
					<CategoryRailCarousel items={items} />
				) : (
					<CategoryRailStatic items={items} gap={gap} />
				)}
			</div>
		</section>
	);
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';

import { ProductDetailModal, productRowToDetailModalProduct } from '@/app/components/ProductDetailModal';
import { SingleLineFitText } from '@/app/components/SingleLineFitText';
import {
	CardImageCarousel,
	getPublicationTotalStock,
	mapRowToNewArrivalProduct,
} from '@/app/components/NewArrivals';
import type { ProductRow } from '@/lib/data/productCatalog';
import {
	CARD_INSTALLMENTS_NO_INTEREST,
	computeDiscountPercent,
	formatCuotaAr,
	formatPrecioListaAr,
	getPrimaryDiscountedPrice,
} from '@/lib/formatPrice';
import { fetchProductsByIdsAction } from '@/app/actions/products';
import { getSiteHomeStoredIdsAction } from '@/app/actions/siteHomeConfig';
import {
	BEST_SELLERS_MAX,
	BEST_SELLERS_UPDATED_EVENT,
	parseStoredProductIds,
	resolveRecentArrivalsForDisplay,
} from '@/lib/bestSellersSelection';
import { cn } from '@/app/components/ui/utils';

type CarouselProduct = ReturnType<typeof mapRowToNewArrivalProduct>;

const FEATURED_AUTOPLAY_MS = 4500;

function usePrefersReducedMotion() {
	const [reduced, setReduced] = React.useState(false);
	React.useEffect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		setReduced(mq.matches);
		const onChange = () => setReduced(mq.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, []);
	return reduced;
}

export function HomeFeaturedCarousel({
	products,
	bestSellersIdsJson,
}: {
	products: ProductRow[];
	bestSellersIdsJson: string;
}) {
	const [selectionRaw, setSelectionRaw] = React.useState(bestSellersIdsJson);
	const reducedMotion = usePrefersReducedMotion();
	const [detailProductId, setDetailProductId] = React.useState<string | null>(null);
	const [autoplayPaused, setAutoplayPaused] = React.useState(false);

	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: 'start',
		loop: true,
		dragFree: false,
		duration: 22,
	});

	const [canPrev, setCanPrev] = React.useState(false);
	const [canNext, setCanNext] = React.useState(false);

	React.useEffect(() => {
		setSelectionRaw(bestSellersIdsJson);
	}, [bestSellersIdsJson]);

	React.useEffect(() => {
		const sync = () => {
			void getSiteHomeStoredIdsAction().then(({ best }) => setSelectionRaw(best));
		};
		window.addEventListener(BEST_SELLERS_UPDATED_EVENT, sync);
		window.addEventListener('storage', sync);
		return () => {
			window.removeEventListener(BEST_SELLERS_UPDATED_EVENT, sync);
			window.removeEventListener('storage', sync);
		};
	}, []);

	const orderedIds = React.useMemo(
		() => parseStoredProductIds(selectionRaw, BEST_SELLERS_MAX),
		[selectionRaw],
	);

	const productIdSet = React.useMemo(() => new Set(products.map((p) => p.id)), [products]);
	const missingIdsForSelection = React.useMemo(() => {
		if (orderedIds.length === 0) return [];
		return orderedIds.filter((id) => !productIdSet.has(id));
	}, [orderedIds, productIdSet]);

	const [supplementalRows, setSupplementalRows] = React.useState<ProductRow[]>([]);
	React.useEffect(() => {
		if (missingIdsForSelection.length === 0) {
			setSupplementalRows([]);
			return;
		}
		let cancelled = false;
		void fetchProductsByIdsAction(missingIdsForSelection).then((rows) => {
			if (!cancelled) setSupplementalRows(rows);
		});
		return () => {
			cancelled = true;
		};
	}, [missingIdsForSelection]);

	const selectionPool = React.useMemo(() => {
		if (supplementalRows.length === 0) return products;
		const byId = new Map(products.map((p) => [p.id, p]));
		for (const p of supplementalRows) byId.set(p.id, p);
		return [...byId.values()];
	}, [products, supplementalRows]);

	const displayRows = React.useMemo(
		() => resolveRecentArrivalsForDisplay(selectionPool, orderedIds, products, 12),
		[selectionPool, orderedIds, products],
	);

	const carouselProducts = React.useMemo(
		() => displayRows.map(mapRowToNewArrivalProduct),
		[displayRows],
	);

	const detailModalProduct = React.useMemo(() => {
		if (!detailProductId) return null;
		const row = displayRows.find((r) => r.id === detailProductId);
		return row ? productRowToDetailModalProduct(row) : null;
	}, [detailProductId, displayRows]);

	const onSelect = React.useCallback(() => {
		if (!emblaApi) return;
		setCanPrev(emblaApi.canScrollPrev());
		setCanNext(emblaApi.canScrollNext());
	}, [emblaApi]);

	React.useEffect(() => {
		if (!emblaApi) return;
		onSelect();
		emblaApi.on('select', onSelect);
		emblaApi.on('reInit', onSelect);
		return () => {
			emblaApi.off('select', onSelect);
			emblaApi.off('reInit', onSelect);
		};
	}, [emblaApi, onSelect]);

	React.useEffect(() => {
		if (!emblaApi) return;
		emblaApi.reInit({ loop: carouselProducts.length > 1 });
	}, [emblaApi, carouselProducts.length]);

	React.useEffect(() => {
		if (!emblaApi || autoplayPaused || reducedMotion || carouselProducts.length < 2) return;
		const id = window.setInterval(() => {
			emblaApi.scrollNext();
		}, FEATURED_AUTOPLAY_MS);
		return () => window.clearInterval(id);
	}, [emblaApi, autoplayPaused, reducedMotion, carouselProducts.length]);

	if (carouselProducts.length === 0) {
		return null;
	}

	return (
		<section
			id="destacados"
			className="scroll-mt-28 border-b border-[#b8956a]/20 bg-[#f5f2ed] py-10 sm:py-12"
			aria-labelledby="home-featured-heading"
			onMouseEnter={() => setAutoplayPaused(true)}
			onMouseLeave={() => setAutoplayPaused(false)}
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<p
							className="mb-1 text-[11px] tracking-[0.28em] text-[#8b6f47]"
							style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
						>
							DESTACADOS
						</p>
						<h2
							id="home-featured-heading"
							className="text-[#1a1410]"
							style={{
								fontFamily: 'Cormorant Garamond, serif',
								fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
								fontWeight: 400,
								letterSpacing: '0.06em',
							}}
						>
							Prendas para vos
						</h2>
					</div>
					<Link
						href="/catalogo"
						className="text-xs tracking-[0.2em] text-[#8b6f47] transition hover:text-[#1a1410]"
						style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
					>
						VER TODO EL CATÁLOGO →
					</Link>
				</div>

				<div className="relative px-10 sm:px-12">
					<div className="overflow-hidden" ref={emblaRef}>
						<ul className="flex gap-4 sm:gap-5">
							{carouselProducts.map((product) => (
								<FeaturedProductSlide
									key={product.id}
									product={product}
									reducedMotion={reducedMotion}
									onOpen={() => setDetailProductId(product.id)}
								/>
							))}
						</ul>
					</div>
					<button
						type="button"
						onClick={() => emblaApi?.scrollPrev()}
						disabled={!canPrev}
						className="absolute top-[38%] left-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#b8956a]/50 bg-white text-[#1a1410] shadow-sm transition hover:bg-[#ebe6df] disabled:pointer-events-none disabled:opacity-30"
						aria-label="Productos anteriores"
					>
						<ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
					</button>
					<button
						type="button"
						onClick={() => emblaApi?.scrollNext()}
						disabled={!canNext}
						className="absolute top-[38%] right-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#b8956a]/50 bg-white text-[#1a1410] shadow-sm transition hover:bg-[#ebe6df] disabled:pointer-events-none disabled:opacity-30"
						aria-label="Siguientes productos"
					>
						<ChevronRight className="h-5 w-5" strokeWidth={1.5} />
					</button>
				</div>
			</div>

			<ProductDetailModal
				product={detailModalProduct}
				onClose={() => setDetailProductId(null)}
			/>
		</section>
	);
}

function FeaturedProductSlide({
	product,
	reducedMotion,
	onOpen,
}: {
	product: CarouselProduct;
	reducedMotion: boolean;
	onOpen: () => void;
}) {
	const discountedPrice = getPrimaryDiscountedPrice(product.price, product.transferPrice);
	const listPrice = product.cardPrice > 0 ? product.cardPrice : discountedPrice;
	const discountPercent = computeDiscountPercent(listPrice, discountedPrice);
	const hasDiscount = discountPercent > 0;
	const publicationStock = getPublicationTotalStock(product.sizeInventory, product.stock);

	return (
		<li className="min-w-0 flex-[0_0_72%] sm:flex-[0_0_48%] md:flex-[0_0_32%] lg:flex-[0_0_24%]">
			<motion.article
				role="button"
				tabIndex={0}
				whileHover={{ y: -2 }}
				onClick={onOpen}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onOpen();
					}
				}}
				className={cn(
					'group flex h-full cursor-pointer flex-col overflow-hidden border border-[#b8956a]/20 bg-white shadow-sm outline-none transition hover:border-[#b8956a]/45',
					'focus-visible:ring-2 focus-visible:ring-[#b8956a] focus-visible:ring-offset-2',
				)}
			>
				<div className="relative aspect-[3/4] overflow-hidden bg-[#ebe6df]">
					<CardImageCarousel images={product.cardImages} alt={product.name} reducedMotion={reducedMotion} />
					{publicationStock <= 0 ? (
						<span className="absolute top-2 left-2 z-10 bg-[#1a1410]/80 px-2 py-1 text-[10px] tracking-wider text-white">
							SIN STOCK
						</span>
					) : null}
					<div className="absolute inset-0 flex items-center justify-center bg-[#1a1410]/75 opacity-0 transition group-hover:opacity-100">
						<span className="flex items-center gap-2 bg-white px-3 py-2 text-xs tracking-[0.12em] text-[#1a1410]">
							<ShoppingCart className="h-4 w-4" strokeWidth={1.7} />
							VER
						</span>
					</div>
				</div>
				<div className="flex flex-1 flex-col px-3 py-3 text-center">
					<p
						className="mb-1 truncate text-[10px] tracking-wider text-[#8b6f47]"
						style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
					>
						{product.category}
					</p>
					<h3
						className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm text-[#1a1410]"
						style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 400 }}
					>
						{product.name}
					</h3>
					<div className="mt-auto space-y-0.5">
						{hasDiscount ? (
							<p
								className="text-[10px] text-[#6b6156] line-through"
								style={{ fontFamily: 'Montserrat, sans-serif' }}
							>
								{formatPrecioListaAr(listPrice)}
							</p>
						) : null}
						<SingleLineFitText
							minFontSizePx={11}
							maxFontSizePx={14}
							className="font-medium text-[#1a1410]"
							style={{ fontFamily: 'Montserrat, sans-serif' }}
						>
							{formatPrecioListaAr(discountedPrice)}
						</SingleLineFitText>
						<p
							className="text-[10px] text-[#8b6f47]"
							style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
						>
							{CARD_INSTALLMENTS_NO_INTEREST} cuotas · {formatCuotaAr(discountedPrice, CARD_INSTALLMENTS_NO_INTEREST)}
						</p>
					</div>
				</div>
			</motion.article>
		</li>
	);
}

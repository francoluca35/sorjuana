'use client';

import Link from 'next/link';
import Image from 'next/image';
import * as React from 'react';
import { Heart, Eye, Sparkles, Play, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from './ui/dialog';
import { cn } from './ui/utils';
import { displayCategoryLabel, type ProductRow } from '@/lib/data/productCatalog';
import type { SizeInventoryRow } from '@/lib/data/productSizes';
import {
	RECENT_ARRIVALS_IDS_STORAGE_KEY,
	RECENT_ARRIVALS_UPDATED_EVENT,
	parseStoredProductIds,
	resolveRecentArrivalsForDisplay,
} from '@/lib/recentArrivalsSelection';

const PLACEHOLDER_IMG =
	'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80';

type ModalSlide =
	| { kind: 'video'; src: string; poster: string; label: string }
	| { kind: 'image'; src: string; label: string };

type NewArrivalProduct = {
	id: string;
	name: string;
	category: string;
	price: number;
	oldPrice: number | null;
	/** Imágenes para carrusel en tarjeta (siempre al menos una URL válida) */
	cardImages: string[];
	videoUrl: string | null;
	description: string | null;
	stock: number;
	/** Talles con cantidad (vacío si el producto solo tiene stock total) */
	sizeInventory: SizeInventoryRow[];
	isNew: boolean;
};

function dedupeUrls(urls: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const u of urls) {
		const t = u.trim();
		if (!t || seen.has(t)) continue;
		seen.add(t);
		out.push(t);
	}
	return out;
}

function mapRowToNewArrivalProduct(p: ProductRow): NewArrivalProduct {
	const price = Number(p.price);
	const compare = p.compare_at_price != null ? Number(p.compare_at_price) : null;
	const oldPrice =
		compare != null && Number.isFinite(compare) && Number.isFinite(price) && compare > price
			? compare
			: null;
	const rawGallery = dedupeUrls(p.image_urls?.length ? p.image_urls : p.image_url ? [p.image_url] : []);
	const cardImages = rawGallery.length > 0 ? rawGallery : [PLACEHOLDER_IMG];
	const videoUrl = p.video_url?.trim() || null;
	return {
		id: p.id,
		name: p.name,
		category: displayCategoryLabel(p.category),
		price: Number.isFinite(price) ? price : 0,
		oldPrice,
		cardImages,
		videoUrl,
		description: p.description?.trim() ?? null,
		stock: p.stock,
		sizeInventory: p.size_inventory?.length ? p.size_inventory.map((r) => ({ ...r })) : [],
		isNew: true,
	};
}

function arrivalToModalSlides(p: NewArrivalProduct): ModalSlide[] {
	const poster = p.cardImages[0] ?? PLACEHOLDER_IMG;
	const slides: ModalSlide[] = [];
	const seen = new Set<string>();
	if (p.videoUrl) {
		slides.push({ kind: 'video', src: p.videoUrl, poster, label: 'Video' });
		seen.add(`video:${p.videoUrl}`);
	}
	let fotoIdx = 0;
	for (const src of p.cardImages) {
		const key = `image:${src}`;
		if (seen.has(key)) continue;
		seen.add(key);
		fotoIdx += 1;
		slides.push({ kind: 'image', src, label: `Foto ${fotoIdx}` });
	}
	return slides;
}

function subscribeRecentArrivalsStorage(onStoreChange: () => void) {
	if (typeof window === 'undefined') return () => {};
	const on = () => onStoreChange();
	window.addEventListener(RECENT_ARRIVALS_UPDATED_EVENT, on);
	window.addEventListener('storage', on);
	return () => {
		window.removeEventListener(RECENT_ARRIVALS_UPDATED_EVENT, on);
		window.removeEventListener('storage', on);
	};
}

function getRecentArrivalsStorageSnapshot(): string {
	if (typeof window === 'undefined') return '';
	return localStorage.getItem(RECENT_ARRIVALS_IDS_STORAGE_KEY) ?? '';
}

function getRecentArrivalsStorageServerSnapshot(): string {
	return '';
}

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

function CardImageCarousel({
	images,
	alt,
	reducedMotion,
}: {
	images: string[];
	alt: string;
	reducedMotion: boolean;
}) {
	const [idx, setIdx] = React.useState(0);

	React.useEffect(() => {
		setIdx(0);
	}, [images]);

	React.useEffect(() => {
		if (reducedMotion || images.length <= 1) return;
		const id = window.setInterval(() => {
			setIdx((i) => (i + 1) % images.length);
		}, 4500);
		return () => window.clearInterval(id);
	}, [images, reducedMotion]);

	return (
		<div className="relative aspect-[3/4] w-full overflow-hidden">
			{images.map((src, i) => (
				<div
					key={`${src}-${i}`}
					className={cn(
						'absolute inset-0 transition-opacity duration-[800ms] ease-in-out',
						i === idx ? 'z-[1] opacity-100' : 'z-0 opacity-0',
					)}
					aria-hidden={i !== idx}
				>
					<Image
						src={src}
						alt={i === idx ? alt : ''}
						fill
						unoptimized
						className="object-cover"
						style={{ filter: 'sepia(0.08) contrast(1.05)' }}
						sizes="(max-width: 768px) 50vw, 16vw"
					/>
				</div>
			))}
		</div>
	);
}

export function NewArrivals({ products }: { products: ProductRow[] }) {
	const storedRaw = React.useSyncExternalStore(
		subscribeRecentArrivalsStorage,
		getRecentArrivalsStorageSnapshot,
		getRecentArrivalsStorageServerSnapshot,
	);
	const orderedIds = React.useMemo(() => parseStoredProductIds(storedRaw), [storedRaw]);
	const displayRows = React.useMemo(
		() => resolveRecentArrivalsForDisplay(products, orderedIds),
		[products, orderedIds],
	);
	const newProducts = React.useMemo(() => displayRows.map(mapRowToNewArrivalProduct), [displayRows]);

	const reducedMotion = usePrefersReducedMotion();
	const [modalOpen, setModalOpen] = React.useState(false);
	const [modalProduct, setModalProduct] = React.useState<NewArrivalProduct | null>(null);
	const [slideIndex, setSlideIndex] = React.useState(0);

	const modalSlides = React.useMemo(
		() => (modalProduct ? arrivalToModalSlides(modalProduct) : []),
		[modalProduct],
	);

	const openProduct = React.useCallback((p: NewArrivalProduct) => {
		setModalProduct(p);
		setSlideIndex(0);
		setModalOpen(true);
	}, []);

	React.useEffect(() => {
		setSlideIndex(0);
	}, [modalProduct?.id]);

	const goSlide = React.useCallback(
		(delta: number) => {
			if (modalSlides.length === 0) return;
			setSlideIndex((i) => (i + delta + modalSlides.length) % modalSlides.length);
		},
		[modalSlides.length],
	);

	React.useEffect(() => {
		if (!modalOpen || modalSlides.length === 0) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				goSlide(-1);
			}
			if (e.key === 'ArrowRight') {
				e.preventDefault();
				goSlide(1);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [modalOpen, modalSlides.length, goSlide]);

	const modalSlide =
		modalProduct && modalSlides.length > 0
			? modalSlides[Math.min(slideIndex, modalSlides.length - 1)]
			: null;

	return (
		<section className="relative bg-white px-4 py-32 sm:px-6 lg:px-8">
			<div className="absolute top-0 left-0 h-2 w-full bg-[#b8956a]/20" />
			<div className="absolute bottom-0 left-0 h-2 w-full bg-[#b8956a]/20" />

			<div className="mx-auto max-w-7xl">
				<motion.div
					initial={{ opacity: 0, y: 50 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.8 }}
					className="mb-20 text-center"
				>
					<motion.div
						initial={{ scale: 0 }}
						whileInView={{ scale: 1 }}
						viewport={{ once: true }}
						transition={{ delay: 0.2, duration: 0.6 }}
						className="mb-6 inline-flex items-center justify-center"
					>
						<Sparkles className="mr-3 h-5 w-5 text-[#b8956a]" strokeWidth={1.5} />
						<span
							className="text-sm tracking-[0.3em] text-[#8b6f47]"
							style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
						>
							NOVEDADES
						</span>
						<Sparkles className="ml-3 h-5 w-5 text-[#b8956a]" strokeWidth={1.5} />
					</motion.div>

					<h2
						className="mb-4 text-[#1a1410]"
						style={{
							fontFamily: 'Cormorant Garamond, serif',
							fontSize: 'clamp(2.5rem, 5vw, 4rem)',
							fontWeight: 300,
							letterSpacing: '0.05em',
						}}
					>
						Recién Llegados
					</h2>

					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ delay: 0.5, duration: 0.8 }}
						className="mx-auto mt-4 max-w-2xl italic text-[#6b6156]"
						style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem' }}
					>
						Las últimas creaciones de las pasarelas europeas
					</motion.p>

					<motion.div
						initial={{ opacity: 0, scale: 0 }}
						whileInView={{ opacity: 0.3, scale: 1 }}
						viewport={{ once: true }}
						transition={{ delay: 0.7, duration: 1 }}
						className="mt-4 text-4xl text-[#b8956a]"
						style={{ fontFamily: 'Cormorant Garamond, serif' }}
					>
						❦
					</motion.div>
				</motion.div>

				{newProducts.length === 0 ? (
					<p
						className="mx-auto max-w-lg py-12 text-center text-sm text-[#6b6156]"
						style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
					>
						Pronto sumaremos novedades desde el panel. Los productos que des de alta en la base aparecerán
						acá automáticamente.
					</p>
				) : (
					<div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
						{newProducts.map((product, index) => (
							<motion.article
								key={product.id}
								role="button"
								tabIndex={0}
								initial={{ opacity: 0, y: 50 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: index * 0.1, duration: 0.6 }}
								onClick={() => openProduct(product)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openProduct(product);
									}
								}}
								className="group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#b8956a] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
							>
								<div className="relative mb-4 overflow-hidden border-2 border-transparent bg-[#f5f2ed] transition-all duration-500 group-hover:border-[#b8956a]/30">
									<motion.div
										whileHover={{ scale: 1.08 }}
										transition={{ duration: 0.6 }}
										className="relative w-full"
									>
										<CardImageCarousel
											images={product.cardImages}
											alt={product.name}
											reducedMotion={reducedMotion}
										/>
									</motion.div>

									<div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#1a1410]/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

									{product.isNew ? (
										<div className="absolute top-3 left-3 z-20">
											<motion.span
												initial={{ rotate: -5 }}
												whileHover={{ rotate: 0, scale: 1.05 }}
												className="inline-block border border-[#b8956a]/50 bg-[#1a1410] px-3 py-1.5 text-xs tracking-[0.2em] text-[#b8956a]"
												style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
											>
												NUEVO
											</motion.span>
										</div>
									) : null}

									{product.oldPrice != null ? (
										<div className="absolute top-3 right-3 z-20">
											<span className="bg-[#8b6f47] px-3 py-1.5 text-xs tracking-wider text-white">
												OFERTA
											</span>
										</div>
									) : null}

									<div className="absolute inset-0 z-20 flex items-center justify-center space-x-3 bg-[#1a1410]/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
										<motion.button
											type="button"
											whileHover={{ scale: 1.1, rotate: 5 }}
											whileTap={{ scale: 0.95 }}
											onClick={(e) => e.stopPropagation()}
											className="bg-white/90 p-2.5 backdrop-blur-sm transition-colors duration-300 hover:bg-[#b8956a] hover:text-white"
											aria-label="Favoritos"
										>
											<Heart className="h-4 w-4" strokeWidth={1.5} />
										</motion.button>
										<motion.button
											type="button"
											whileHover={{ scale: 1.1, rotate: -5 }}
											whileTap={{ scale: 0.95 }}
											onClick={(e) => {
												e.stopPropagation();
												openProduct(product);
											}}
											className="bg-white/90 p-2.5 backdrop-blur-sm transition-colors duration-300 hover:bg-[#b8956a] hover:text-white"
											aria-label="Ver fotos y video"
										>
											<Eye className="h-4 w-4" strokeWidth={1.5} />
										</motion.button>
									</div>
								</div>

								<div className="px-2 text-center">
									<div
										className="mb-1.5 text-xs tracking-wider text-[#8b6f47]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
									>
										{product.category}
									</div>
									<h3
										className="mb-2 line-clamp-2 text-sm text-[#1a1410] transition-colors duration-300 group-hover:text-[#b8956a]"
										style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 400 }}
									>
										{product.name}
									</h3>
									<div className="flex items-center justify-center space-x-2">
										<span
											className="text-[#b8956a]"
											style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}
										>
											$
											{product.price.toLocaleString('es-AR', {
												minimumFractionDigits: 0,
												maximumFractionDigits: 0,
											})}
										</span>
										{product.oldPrice != null ? (
											<span
												className="text-xs text-[#6b6156]/50 line-through"
												style={{ fontFamily: 'Montserrat, sans-serif' }}
											>
												$
												{product.oldPrice.toLocaleString('es-AR', {
													minimumFractionDigits: 0,
													maximumFractionDigits: 0,
												})}
											</span>
										) : null}
									</div>
								</div>
							</motion.article>
						))}
					</div>
				)}

				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.8, duration: 0.6 }}
					className="mt-16 text-center"
				>
					<Link
						href="/catalogo"
						className="group inline-flex items-center space-x-4 border-2 border-[#b8956a] bg-transparent px-12 py-5 text-[#1a1410] transition-all duration-500 hover:bg-[#b8956a] hover:text-white"
					>
						<span
							className="relative z-10 text-sm tracking-[0.25em]"
							style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
						>
							DESCUBRIR TODO
						</span>
					</Link>
				</motion.div>
			</div>

			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent
					className={cn(
						'max-h-[min(92vh,900px)] w-[min(96vw,56rem)] gap-0 overflow-y-auto rounded-none border-[#1a1410]/15 bg-[#f5f2ed] p-0 sm:max-w-[min(96vw,56rem)]',
					)}
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					{modalProduct ? (
						<>
							<DialogHeader className="sr-only">
								<DialogTitle>{modalProduct.name}</DialogTitle>
								<DialogDescription>
									{modalProduct.description ?? 'Detalle del producto'}
								</DialogDescription>
							</DialogHeader>

							<div className="grid lg:grid-cols-[1.05fr_1fr]">
								<div className="relative flex flex-col border-b border-[#1a1410]/10 bg-[#0a0a0a] lg:min-h-0 lg:border-b-0 lg:border-r">
									{modalSlide ? (
										<>
											<div className="relative flex min-h-[min(46vh,400px)] w-full flex-1 items-center justify-center overflow-hidden lg:min-h-[min(72vh,780px)]">
												{modalSlide.kind === 'video' ? (
													<video
														key={`${modalProduct.id}-slide-${slideIndex}`}
														className="max-h-[min(46vh,400px)] w-full max-w-full object-contain lg:max-h-[min(72vh,780px)]"
														poster={modalSlide.poster}
														src={modalSlide.src}
														controls
														playsInline
														preload="metadata"
													/>
												) : (
													<div className="relative h-[min(46vh,400px)] w-full max-w-full lg:h-[min(72vh,780px)]">
														<Image
															src={modalSlide.src}
															alt=""
															fill
															className="object-contain object-center"
															sizes="(max-width: 1024px) 96vw, 52vw"
															unoptimized
															priority={slideIndex === 0}
														/>
													</div>
												)}

												<div className="pointer-events-none absolute left-3 top-3 z-10 border border-white/25 bg-black/60 px-2.5 py-1 text-[10px] tracking-[0.18em] text-white backdrop-blur-sm">
													{modalSlide.kind === 'video' ? (
														<span
															className="flex items-center gap-1.5"
															style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
														>
															<Play className="size-3 fill-current" aria-hidden />
															{modalSlide.label.toUpperCase()}
														</span>
													) : (
														<span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}>
															{modalSlide.label.toUpperCase()}
														</span>
													)}
												</div>

												{modalSlides.length > 1 ? (
													<div
														className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/65 px-3 py-1 text-[11px] tabular-nums text-white backdrop-blur-sm"
														style={{ fontFamily: 'Montserrat, sans-serif' }}
													>
														{slideIndex + 1} / {modalSlides.length}
													</div>
												) : null}

												{modalSlides.length > 1 ? (
													<>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																goSlide(-1);
															}}
															className="absolute left-2 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-[#1a1410] shadow-lg transition hover:bg-[#f5f2ed] sm:left-3 sm:size-11"
															aria-label="Ver anterior"
														>
															<ChevronLeft className="size-6 sm:size-7" strokeWidth={1.75} />
														</button>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																goSlide(1);
															}}
															className="absolute right-2 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-[#1a1410] shadow-lg transition hover:bg-[#f5f2ed] sm:right-3 sm:size-11"
															aria-label="Ver siguiente"
														>
															<ChevronRight className="size-6 sm:size-7" strokeWidth={1.75} />
														</button>
													</>
												) : null}
											</div>

											{modalSlides.length > 1 ? (
												<div className="shrink-0 border-t border-white/10 bg-black/90 px-2 py-2 sm:px-3">
													<div
														className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
														role="tablist"
														aria-label="Miniaturas de la galería"
													>
														{modalSlides.map((s, i) => (
															<button
																key={`${modalProduct.id}-thumb-${i}-${s.kind}-${s.src}`}
																type="button"
																role="tab"
																aria-selected={i === slideIndex}
																onClick={(e) => {
																	e.stopPropagation();
																	setSlideIndex(i);
																}}
																className={cn(
																	'relative size-[52px] shrink-0 overflow-hidden border-2 transition-all sm:size-[60px]',
																	i === slideIndex
																		? 'border-[#b8956a] opacity-100 ring-1 ring-[#b8956a]/50'
																		: 'border-transparent opacity-65 hover:opacity-100',
																)}
															>
																{s.kind === 'video' ? (
																	<>
																		<Image
																			src={s.poster}
																			alt=""
																			fill
																			className="object-cover"
																			sizes="60px"
																			unoptimized
																		/>
																		<span className="absolute inset-0 flex items-center justify-center bg-black/35">
																			<Play
																				className="size-4 text-white drop-shadow-md"
																				fill="currentColor"
																				aria-hidden
																			/>
																		</span>
																	</>
																) : (
																	<Image
																		src={s.src}
																		alt=""
																		fill
																		className="object-cover"
																		sizes="60px"
																		unoptimized
																	/>
																)}
															</button>
														))}
													</div>
												</div>
											) : null}
										</>
									) : null}
								</div>

								<div className="flex flex-col p-6 sm:p-8">
									<p
										className="mb-1 text-[10px] tracking-[0.28em] text-[#8b6f47]"
										style={{ fontFamily: 'Montserrat, sans-serif' }}
									>
										{modalProduct.category.toUpperCase()}
									</p>
									<h2
										className="mb-3 text-2xl text-[#1a1410] sm:text-3xl"
										style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 500 }}
									>
										{modalProduct.name}
									</h2>

									<div className="mb-4 flex flex-wrap items-baseline gap-3">
										<span
											className="text-3xl text-[#b8956a]"
											style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}
										>
											$
											{modalProduct.price.toLocaleString('es-AR', {
												minimumFractionDigits: 0,
												maximumFractionDigits: 0,
											})}
										</span>
										{modalProduct.oldPrice != null ? (
											<span
												className="text-lg text-[#9a9085] line-through"
												style={{ fontFamily: 'Montserrat, sans-serif' }}
											>
												$
												{modalProduct.oldPrice.toLocaleString('es-AR', {
													minimumFractionDigits: 0,
													maximumFractionDigits: 0,
												})}
											</span>
										) : null}
									</div>

									{modalProduct.description ? (
										<p
											className="mb-6 text-sm leading-relaxed text-[#6b6156]"
											style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem' }}
										>
											{modalProduct.description}
										</p>
									) : null}

									<div className="mb-6 space-y-3">
										{modalProduct.sizeInventory.length > 0 ? (
											<div className="rounded-none border border-[#b8956a]/40 bg-white/60 px-4 py-3">
												<p
													className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b6f47]"
													style={{ fontFamily: 'Montserrat, sans-serif' }}
												>
													Talles disponibles
												</p>
												<ul className="flex flex-wrap justify-center gap-2">
													{modalProduct.sizeInventory.map((row, idx) => (
														<li
															key={`${row.size}-${idx}`}
															className={cn(
																'min-w-[3.25rem] rounded-sm border px-2.5 py-2 text-center',
																row.qty > 0
																	? 'border-[#b8956a]/50 bg-[#f5f2ed]/90'
																	: 'border-[#1a1410]/10 bg-white/40 opacity-80',
															)}
														>
															<span
																className="block text-[11px] font-medium tracking-wide text-[#1a1410]"
																style={{ fontFamily: 'Montserrat, sans-serif' }}
															>
																{row.size}
															</span>
															<span
																className={cn(
																	'mt-0.5 block text-sm tabular-nums',
																	row.qty > 0 ? 'text-[#b8956a]' : 'text-[#9a9085]',
																)}
																style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}
															>
																{row.qty}
															</span>
														</li>
													))}
												</ul>
												<p
													className="mt-3 border-t border-[#b8956a]/20 pt-2 text-center text-[11px] text-[#5c5349]"
													style={{ fontFamily: 'Montserrat, sans-serif' }}
												>
													Total en tienda:{' '}
													<strong className="text-[#1a1410]">{modalProduct.stock}</strong> unidades
												</p>
											</div>
										) : (
											<div className="rounded-none border border-[#b8956a]/40 bg-white/60 px-4 py-3">
												<p
													className="text-center text-xs font-semibold uppercase tracking-wide text-[#5c5349]"
													style={{ fontFamily: 'Montserrat, sans-serif' }}
												>
													Stock disponible: {modalProduct.stock} unidades
												</p>
											</div>
										)}
									</div>

									<div className="mt-auto flex flex-col gap-3 sm:flex-row">
										<button
											type="button"
											className="flex flex-1 items-center justify-center gap-2 bg-[#1a1410] py-4 text-[#f5f2ed] transition-colors hover:bg-[#b8956a] hover:text-[#1a1410]"
											style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
										>
											<ShoppingCart className="size-4" strokeWidth={1.5} />
											COMPRAR AHORA
										</button>
										<Link
											href="/catalogo"
											className="flex flex-1 items-center justify-center border-2 border-[#1a1410] py-4 text-center text-sm tracking-wide text-[#1a1410] transition-colors hover:bg-[#1a1410] hover:text-[#f5f2ed]"
											style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
											onClick={() => setModalOpen(false)}
										>
											VER MÁS MODELOS
										</Link>
									</div>
								</div>
							</div>
						</>
					) : null}
				</DialogContent>
			</Dialog>
		</section>
	);
}

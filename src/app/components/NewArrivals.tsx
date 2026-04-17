'use client';

import Link from 'next/link';
import Image from 'next/image';
import * as React from 'react';
import { Heart, Eye, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { ProductDetailModal, productRowToDetailModalProduct } from './ProductDetailModal';
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
	const [detailProductId, setDetailProductId] = React.useState<string | null>(null);

	const detailModalProduct = React.useMemo(() => {
		if (!detailProductId) return null;
		const row = displayRows.find((r) => r.id === detailProductId);
		return row ? productRowToDetailModalProduct(row) : null;
	}, [detailProductId, displayRows]);

	const openProduct = React.useCallback((p: NewArrivalProduct) => {
		setDetailProductId(p.id);
	}, []);

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

			<ProductDetailModal
				product={detailModalProduct}
				onClose={() => setDetailProductId(null)}
			/>
		</section>
	);
}

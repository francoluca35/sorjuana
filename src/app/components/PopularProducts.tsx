'use client';

import Link from 'next/link';
import Image from 'next/image';
import * as React from 'react';
import { ShoppingCart, Sparkles, Truck, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

import { ProductDetailModal, productRowToDetailModalProduct } from '@/app/components/ProductDetailModal';
import {
	CardImageCarousel,
	getPublicationTotalStock,
	mapRowToNewArrivalProduct,
} from '@/app/components/NewArrivals';
import type { ProductRow } from '@/lib/data/productCatalog';
import {
	computeDiscountPercent,
	formatCuotaAr,
	formatPrecioListaAr,
	getPrimaryDiscountedPrice,
} from '@/lib/formatPrice';
import type { SizeInventoryRow } from '@/lib/data/productSizes';
import { fetchProductsByIdsAction } from '@/app/actions/products';
import { getSiteHomeStoredIdsAction } from '@/app/actions/siteHomeConfig';
import {
	BEST_SELLERS_MAX,
	BEST_SELLERS_UPDATED_EVENT,
	parseStoredProductIds,
	resolveRecentArrivalsForDisplay,
} from '@/lib/bestSellersSelection';

type GridProduct = {
	id: string;
	name: string;
	category: string;
	price: number;
	transferPrice: number;
	cardPrice: number;
	oldPrice: number | null;
	cardImages: string[];
	videoUrl: string | null;
	description: string | null;
	stock: number;
	sizeInventory: SizeInventoryRow[];
	publicationStock: number;
};

function mapRowToGridProduct(p: ProductRow): GridProduct {
	const base = mapRowToNewArrivalProduct(p);
	return {
		id: base.id,
		name: base.name,
		category: base.category,
		price: base.price,
		transferPrice: base.transferPrice,
		cardPrice: base.cardPrice,
		oldPrice: base.oldPrice,
		cardImages: base.cardImages,
		videoUrl: base.videoUrl,
		description: base.description,
		stock: base.stock,
		sizeInventory: base.sizeInventory,
		publicationStock: getPublicationTotalStock(base.sizeInventory, base.stock),
	};
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

export function PopularProducts({
	products,
	bestSellersIdsJson,
}: {
	products: ProductRow[];
	/** IDs publicados (Supabase `site_home_config`), mismo formato que antes en localStorage. */
	bestSellersIdsJson: string;
}) {
	const [selectionRaw, setSelectionRaw] = React.useState(bestSellersIdsJson);

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
		() => resolveRecentArrivalsForDisplay(selectionPool, orderedIds, products, BEST_SELLERS_MAX),
		[selectionPool, orderedIds, products],
	);

	const gridProducts = React.useMemo(() => displayRows.map(mapRowToGridProduct), [displayRows]);

	const reducedMotion = usePrefersReducedMotion();
	const [detailProductId, setDetailProductId] = React.useState<string | null>(null);

	const detailModalProduct = React.useMemo(() => {
		if (!detailProductId) return null;
		const row = displayRows.find((r) => r.id === detailProductId);
		return row ? productRowToDetailModalProduct(row) : null;
	}, [detailProductId, displayRows]);

	const openProduct = React.useCallback((p: GridProduct) => {
		setDetailProductId(p.id);
	}, []);

	return (
		<section className="relative overflow-hidden bg-[#f5f2ed] px-4 py-28 sm:px-6 lg:px-8">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(184,149,106,0.18),transparent)]" />
			<div className="absolute -left-20 top-40 h-72 w-72 rounded-full bg-[#b8956a]/10 blur-3xl" />
			<div className="absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-[#1a1410]/[0.06] blur-3xl" />

			<div className="relative z-10 mx-auto max-w-7xl">
				<motion.div
					initial={{ opacity: 0, y: 40 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.65 }}
					className="mb-16 text-center lg:mb-20"
				>
					<div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b8956a]/40 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm">
						<Sparkles className="size-3.5 text-[#b8956a]" strokeWidth={1.5} />
						<span
							className="text-[11px] tracking-[0.28em] text-[#8b6f47]"
							style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
						>
							LO QUE MÁS SE COMPRA
						</span>
					</div>

					<h2
						className="mb-4 text-[#1a1410]"
						style={{
							fontFamily: 'Cormorant Garamond, serif',
							fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
							fontWeight: 400,
							letterSpacing: '0.04em',
						}}
					>
						Productos más vendidos
					</h2>

					<div className="mx-auto flex flex-wrap items-center justify-center gap-6 text-[#5c5349]">
						<span className="flex items-center gap-2 text-sm">
							<Truck className="size-4 text-[#b8956a]" strokeWidth={1.5} />
							<span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem' }}>
								Envío gratis +$150
							</span>
						</span>
						<span className="flex items-center gap-2 text-sm">
							<ShieldCheck className="size-4 text-[#b8956a]" strokeWidth={1.5} />
							<span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem' }}>
								Pago seguro y cuotas
							</span>
						</span>
					</div>
				</motion.div>

				{gridProducts.length === 0 ? (
					<p
						className="mx-auto max-w-lg py-12 text-center text-sm text-[#6b6156]"
						style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
					>
						Cuando cargues productos en la base, podrás destacarlos acá desde Mapa de página → Más vendidos.
					</p>
				) : (
					<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
						{gridProducts.map((product, index) => (
							<motion.article
								key={product.id}
								role="button"
								tabIndex={0}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, amount: 0.15, margin: '0px 0px -8% 0px' }}
								transition={{ delay: Math.min(index * 0.04, 0.35), duration: 0.35 }}
								onClick={() => openProduct(product)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openProduct(product);
									}
								}}
								className="group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#b8956a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f2ed]"
							>
								<div className="relative mb-4 overflow-hidden border-2 border-transparent bg-[#ebe6df] transition-all duration-500 group-hover:border-[#b8956a]/30">
									<motion.div
										whileHover={{ scale: 1.04 }}
										transition={{ duration: 0.25 }}
										className="relative w-full"
									>
										<CardImageCarousel
											images={product.cardImages}
											alt={product.name}
											reducedMotion={reducedMotion}
										/>
									</motion.div>

									<div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#1a1410]/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

									<div className="absolute top-3 left-3 z-20">
										<span
											className="inline-block border border-[#b8956a]/50 bg-[#1a1410] px-3 py-1.5 text-xs tracking-[0.2em] text-[#b8956a]"
											style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
										>
											TOP
										</span>
									</div>

									{product.oldPrice != null ? (
										<div className="absolute top-3 right-3 z-20">
											<span className="bg-[#8b6f47] px-3 py-1.5 text-xs tracking-wider text-white">
												OFERTA
											</span>
										</div>
									) : null}

									<div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1a1410]/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
										<motion.button
											type="button"
											whileHover={{ scale: 1.08 }}
											whileTap={{ scale: 0.95 }}
											onClick={(e) => {
												e.stopPropagation();
												openProduct(product);
											}}
											className="flex items-center gap-2 bg-white px-4 py-2.5 text-[#1a1410] transition-colors duration-200 hover:bg-[#b8956a] hover:text-white md:bg-white/90 md:backdrop-blur-sm"
											aria-label="Abrir producto"
										>
											<ShoppingCart className="h-4 w-4" strokeWidth={1.7} />
											<span className="text-xs uppercase tracking-[0.12em]" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
												Comprar
											</span>
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
									{(() => {
										const discountedPrice = getPrimaryDiscountedPrice(product.price, product.transferPrice);
										const listPrice = product.cardPrice > 0 ? product.cardPrice : discountedPrice;
										const discountPercent = computeDiscountPercent(listPrice, discountedPrice);
										const hasDiscount = discountPercent > 0;
										const installments = 6;

										return (
											<div className="space-y-1 text-center">
												{hasDiscount ? (
													<div className="flex items-center justify-center gap-2">
														<span
															className="text-[11px] text-[#6b6156] line-through"
															style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
														>
															{formatPrecioListaAr(listPrice)}
														</span>
														<span
															className="text-[12px] text-[#d61f45]"
															style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}
														>
															{discountPercent}% OFF
														</span>
													</div>
												) : null}
												<span
													className="text-[#1a1410]"
													style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.2rem', fontWeight: 800 }}
												>
													{formatPrecioListaAr(discountedPrice)}
												</span>
												<p
													className="text-[10px] uppercase tracking-[0.14em] text-[#6b6156]"
													style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
												>
													Efectivo o transferencia
												</p>
												<p
													className="text-[10px] leading-snug text-[#1a1410]"
													style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
												>
													Precio de lista: {formatPrecioListaAr(listPrice)}
												</p>
												<p
													className="text-[10px] leading-snug text-[#1a1410]"
													style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
												>
													{installments} x {formatCuotaAr(listPrice, installments)} sin interés
												</p>
												<p
													className="text-[10px] uppercase tracking-[0.14em] text-[#6b6156]"
													style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}
												>
													{product.publicationStock > 0
														? `Stock disponible: ${product.publicationStock}`
														: 'No hay stock disponible.'}
												</p>
											</div>
										);
									})()}
								</div>
							</motion.article>
						))}
					</div>
				)}

				<motion.div
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.2, duration: 0.55 }}
					className="mt-16 text-center"
				>
					<Link
						href="/catalogo"
						className="group inline-flex items-center gap-3 border-2 border-[#1a1410] bg-[#1a1410] px-10 py-4 text-[#f5f2ed] transition-all duration-300 hover:border-[#b8956a] hover:bg-[#b8956a] hover:text-[#1a1410]"
					>
						<span
							className="text-sm tracking-[0.22em]"
							style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
						>
							IR AL CATÁLOGO COMPLETO
						</span>
					</Link>
				</motion.div>
			</div>

			<ProductDetailModal product={detailModalProduct} onClose={() => setDetailProductId(null)} />
		</section>
	);
}

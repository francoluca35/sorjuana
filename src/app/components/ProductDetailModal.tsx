'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useCart } from '@/app/context/CartContext';
import { displayCategoryLabel, PLACEHOLDER_IMG, productRowToCatalogProduct } from '@/lib/data/productCatalog';
import type { ProductRow } from '@/lib/data/productCatalog';
import type { SizeInventoryRow } from '@/lib/data/productSizes';

export type MediaItem =
	| { type: 'image'; src: string }
	| { type: 'video'; src: string };

export type CatalogProductBase = {
	id: string;
	name: string;
	price: number;
	transfer_price: number;
	final_transfer_price: number;
	image: string;
	category_db: string | null;
	gallery_image_urls: string[];
	video_url: string | null;
	description: string;
	size_inventory: SizeInventoryRow[];
	stock: number;
};

export type ProductForDetailModal = CatalogProductBase & { media: MediaItem[] };

export function buildProductForDetailModal(p: CatalogProductBase): ProductForDetailModal {
	const media: MediaItem[] = [];
	const imgs = (p.gallery_image_urls ?? []).filter(Boolean);
	if (imgs.length > 0) {
		for (const src of imgs) media.push({ type: 'image', src });
	} else if (p.image) {
		media.push({ type: 'image', src: p.image });
	}
	if (p.video_url?.trim()) {
		media.push({ type: 'video', src: p.video_url.trim() });
	}
	return {
		...p,
		media: media.length > 0 ? media : [{ type: 'image' as const, src: p.image }],
	};
}

/** Convierte una fila de producto (home, etc.) al mismo modelo que usa el catálogo en el modal. */
export function productRowToDetailModalProduct(row: ProductRow): ProductForDetailModal {
	const cp = productRowToCatalogProduct(row);
	const base: CatalogProductBase = {
		id: cp.id,
		name: cp.name,
		price: cp.price,
		transfer_price: cp.transfer_price,
		final_transfer_price: cp.final_transfer_price,
		image: cp.image || PLACEHOLDER_IMG,
		category_db: cp.category_db,
		gallery_image_urls: cp.gallery_image_urls,
		video_url: cp.video_url,
		description: cp.description,
		size_inventory: cp.size_inventory,
		stock: cp.stock,
	};
	return buildProductForDetailModal(base);
}

export function ProductMediaCarousel({
	media,
	productName,
	className,
	fit = 'cover',
	autoPlay = true,
	showThumbRail = false,
}: {
	media: MediaItem[];
	productName: string;
	className?: string;
	fit?: 'cover' | 'contain';
	autoPlay?: boolean;
	showThumbRail?: boolean;
}) {
	const [idx, setIdx] = useState(0);

	useEffect(() => {
		setIdx(0);
	}, [media.length]);

	useEffect(() => {
		if (!autoPlay || media.length <= 1) return;
		const t = window.setInterval(() => {
			setIdx((i) => (i + 1) % media.length);
		}, 2800);
		return () => window.clearInterval(t);
	}, [autoPlay, media.length]);

	function goPrev() {
		setIdx((i) => (i - 1 + media.length) % media.length);
	}

	function goNext() {
		setIdx((i) => (i + 1) % media.length);
	}

	const showControls = media.length > 1;
	const showThumbnails = showThumbRail && media.length > 1;

	return (
		<div className={`relative w-full overflow-hidden ${className ?? 'h-[450px]'}`}>
			<div className={`flex h-full ${showThumbnails ? 'gap-3 px-3 py-3 md:gap-4 md:px-4' : ''}`}>
				{showThumbnails ? (
					<div className="hidden h-full w-16 flex-col items-center justify-center gap-2 md:flex">
						{media.map((m, i) => (
							<button
								key={`${m.type}-${m.src}-${i}`}
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setIdx(i);
								}}
								className={`relative h-16 w-12 overflow-hidden rounded-md border transition ${
									i === idx
										? 'border-white/95 ring-1 ring-white/70'
										: 'border-white/25 hover:border-white/70'
								}`}
								aria-label={`Ver medio ${i + 1}`}
							>
								{m.type === 'video' ? (
									<div className="flex h-full w-full items-center justify-center bg-black/55 text-white">
										<Play className="h-3.5 w-3.5" />
									</div>
								) : (
									<img
										src={m.src}
										alt={`${productName} miniatura ${i + 1}`}
										className="h-full w-full object-cover"
									/>
								)}
							</button>
						))}
					</div>
				) : null}

				<div className="relative min-w-0 flex-1">
					<AnimatePresence mode="wait">
						{media[idx]?.type === 'video' ? (
							<motion.video
								key={`${media[idx].type}-${media[idx].src}`}
								initial={{ opacity: 0, scale: 1.02 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.35 }}
								src={media[idx].src}
								className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
								autoPlay
								muted
								loop
								playsInline
							/>
						) : (
							<motion.img
								key={`${media[idx].type}-${media[idx].src}`}
								initial={{ opacity: 0, scale: 1.02 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.35 }}
								src={media[idx].src}
								alt={productName}
								className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
								style={{ filter: 'sepia(0.08) contrast(1.05)' }}
							/>
						)}
					</AnimatePresence>

					{showControls ? (
						<>
							<button
								type="button"
								onClick={goPrev}
								className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70"
								aria-label="Imagen anterior"
							>
								<ChevronLeft className="h-5 w-5" />
							</button>
							<button
								type="button"
								onClick={goNext}
								className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70"
								aria-label="Imagen siguiente"
							>
								<ChevronRight className="h-5 w-5" />
							</button>
						</>
					) : null}

					{!showThumbnails && showControls ? (
						<div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1 backdrop-blur-sm">
							{media.map((m, i) => (
								<button
									key={`${m.type}-${m.src}-${i}`}
									type="button"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setIdx(i);
									}}
									className={`h-1.5 w-1.5 rounded-full transition ${
										i === idx ? 'bg-[#f5f2ed]' : 'bg-[#f5f2ed]/45 hover:bg-[#f5f2ed]/70'
									}`}
									aria-label={`Ver medio ${i + 1}`}
								/>
							))}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function getCardPrice(product: CatalogProductBase): number | null {
	if (product.final_transfer_price > 0) return product.final_transfer_price;
	if (product.transfer_price > 0) return product.transfer_price;
	return null;
}

type ProductDetailModalProps = {
	product: ProductForDetailModal | null;
	onClose: () => void;
};

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
	const { addItem, openCart } = useCart();
	const [selectedSize, setSelectedSize] = useState<string>('');
	const [selectedQty, setSelectedQty] = useState(1);

	useEffect(() => {
		if (!product) {
			setSelectedSize('');
			return;
		}
		const availableSizes = product.size_inventory.filter((s) => s.qty > 0);
		if (availableSizes.length === 0) {
			setSelectedSize('');
			return;
		}
		if (!availableSizes.some((s) => s.size === selectedSize)) {
			setSelectedSize(availableSizes[0].size);
		}
	}, [product, selectedSize]);

	useEffect(() => {
		setSelectedQty(1);
	}, [product?.id]);

	function closeProductModal() {
		onClose();
		setSelectedQty(1);
	}

	function onAddSelectedToCart() {
		if (!product) return;
		const availableSizes = product.size_inventory.filter((s) => s.qty > 0);
		if (availableSizes.length > 0 && !selectedSize) {
			toast.error('Seleccioná un talle.');
			return;
		}
		addItem({
			id: product.id,
			productId: product.id,
			name: product.name,
			price: product.price,
			image: product.image,
			size: selectedSize || undefined,
			qty: selectedQty,
		});
		toast.success('Producto agregado al carrito.');
		openCart();
		closeProductModal();
	}

	return (
		<AnimatePresence>
			{product ? (
				<>
					<motion.button
						type="button"
						className="fixed inset-0 z-[120] bg-[radial-gradient(circle_at_top,rgba(20,20,20,0.35),rgba(0,0,0,0.72))] backdrop-blur-[3px]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={closeProductModal}
						aria-label="Cerrar detalle de producto"
					/>
					<motion.div
						className="fixed inset-x-3 top-[3vh] z-[121] mx-auto max-h-[94vh] w-full max-w-6xl overflow-hidden border border-black/10 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:inset-x-6"
						initial={{ opacity: 0, y: 24, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 24, scale: 0.98 }}
						transition={{ duration: 0.25 }}
					>
						<button
							type="button"
							className="absolute right-4 top-4 z-30 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/75"
							onClick={closeProductModal}
							aria-label="Cerrar"
						>
							<X className="h-4 w-4" />
						</button>
						<div className="grid max-h-[94vh] lg:grid-cols-[minmax(0,1fr)_420px]">
							<div className="relative bg-[#111]">
								<ProductMediaCarousel
									media={product.media}
									productName={product.name}
									className="h-[52vh] min-h-[320px] max-h-[640px] lg:h-[94vh]"
									fit="contain"
									autoPlay={false}
									showThumbRail
								/>
							</div>
							<div className="overflow-y-auto bg-white p-6">
								<p
									className="text-xs uppercase tracking-[0.18em] text-[#8a8a8a]"
									style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
								>
									{product.category_db ? displayCategoryLabel(product.category_db) : 'Sin categoría'}
								</p>
								<h2
									className="mt-2 text-[#1f1f1f]"
									style={{
										fontFamily: 'Montserrat, sans-serif',
										fontSize: 'clamp(1.8rem, 3.2vw, 2.2rem)',
										fontWeight: 700,
										lineHeight: 1.1,
									}}
								>
									{product.name}
								</h2>
								<p
									className="mt-3 text-[#2a2a2a]"
									style={{
										fontFamily: 'Montserrat, sans-serif',
										fontSize: '2.6rem',
										fontWeight: 400,
										letterSpacing: '-0.02em',
									}}
								>
									${product.price.toFixed(2)}
								</p>
								{getCardPrice(product) != null ? (
									<p
										className="mt-1 text-[#9f3b3b]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.95rem', fontWeight: 500 }}
									>
										${getCardPrice(product)!.toFixed(2)} con tarjetas
									</p>
								) : null}
								<div className="mt-5 rounded-xl border border-[#ececec] bg-[#fafafa] p-4">
									<p className="text-sm leading-relaxed text-[#5e5448]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
										{product.description?.trim() || 'Prenda seleccionada de nuestra colección.'}
									</p>
								</div>

								{product.size_inventory.length > 0 ? (
									<div className="mt-7">
										<p
											className="mb-3 text-xs uppercase tracking-[0.18em] text-[#666]"
											style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
										>
											Elegí talle
										</p>
										<div className="flex flex-wrap gap-2">
											{product.size_inventory.map((s) => {
												const disabled = s.qty <= 0;
												const active = selectedSize === s.size;
												return (
													<button
														key={s.size}
														type="button"
														disabled={disabled}
														onClick={() => setSelectedSize(s.size)}
														className={`rounded-md border px-3.5 py-2 text-xs transition ${
															active
																? 'border-[#202020] bg-[#202020] text-white shadow-sm'
																: disabled
																	? 'cursor-not-allowed border-slate-200 bg-white/50 text-slate-400'
																	: 'border-[#d7d7d7] bg-white text-[#1a1410] hover:border-[#202020]'
														}`}
														style={{ fontFamily: 'Montserrat, sans-serif' }}
													>
														{s.size} {disabled ? '(sin stock)' : ''}
													</button>
												);
											})}
										</div>
									</div>
								) : (
									<p
										className="mt-7 text-xs uppercase tracking-[0.18em] text-[#666]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
									>
										Stock disponible: {product.stock}
									</p>
								)}

								<div className="mt-8 grid grid-cols-[7.5rem_1fr] gap-3">
									<div className="flex h-12 items-center rounded-md border border-[#d7d7d7] bg-white">
										<button
											type="button"
											className="flex h-full w-10 items-center justify-center text-xl text-[#666] transition hover:bg-[#f6f6f6]"
											onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
											aria-label="Restar cantidad"
										>
											-
										</button>
										<div className="flex-1 text-center text-sm text-[#333]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
											{selectedQty}
										</div>
										<button
											type="button"
											className="flex h-full w-10 items-center justify-center text-xl text-[#666] transition hover:bg-[#f6f6f6]"
											onClick={() => setSelectedQty((q) => q + 1)}
											aria-label="Sumar cantidad"
										>
											+
										</button>
									</div>
									<button
										type="button"
										onClick={onAddSelectedToCart}
										className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#1f1f1f] px-4 text-sm text-white shadow-[0_8px_20px_rgba(26,20,16,0.24)] transition hover:bg-[#343434]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
									>
										<ShoppingCart className="h-4 w-4" strokeWidth={1.7} />
										Agregar al carrito
									</button>
								</div>
							</div>
						</div>
					</motion.div>
				</>
			) : null}
		</AnimatePresence>
	);
}

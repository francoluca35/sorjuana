'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingCart, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useCart } from '@/app/context/CartContext';
import { displayCategoryLabel, PLACEHOLDER_IMG, productRowToCatalogProduct } from '@/lib/data/productCatalog';
import { formatPrecioListaAr, getPrimaryDiscountedPrice } from '@/lib/formatPrice';
import { whatsAppLinkWithMessage } from '@/app/config/contact';
import type { ProductRow } from '@/lib/data/productCatalog';
import { sumSizeInventoryQty, type SizeInventoryRow } from '@/lib/data/productSizes';

export type MediaItem =
	| { type: 'image'; src: string }
	| { type: 'video'; src: string };

export type CatalogProductBase = {
	id: string;
	name: string;
	/** Código publicado (SKU / referencia). */
	product_code?: string | null;
	color?: string | null;
	/** Costo de prenda (precio base publicado). */
	garment_cost: number;
	price: number;
	transfer_price: number;
	final_transfer_price: number;
	cash_discount_percent: number | null;
	transfer_discount_percent: number | null;
	image: string;
	category_db: string | null;
	gallery_image_urls: string[];
	video_url: string | null;
	description: string;
	size_inventory: SizeInventoryRow[];
	stock: number;
};

export type ProductVariantForDetailModal = {
	id: string;
	color: string | null;
	size_inventory: SizeInventoryRow[];
	stock: number;
	price: number;
	image: string;
};

export type ProductForDetailModal = CatalogProductBase & {
	media: MediaItem[];
	variants?: ProductVariantForDetailModal[];
};

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
		product_code: cp.code && cp.code !== '—' ? cp.code.trim() : null,
		color: cp.color || null,
		garment_cost: cp.base_price,
		price: cp.price,
		transfer_price: cp.transfer_price,
		final_transfer_price: cp.final_transfer_price,
		cash_discount_percent: cp.cash_discount_percent,
		transfer_discount_percent: cp.transfer_discount_percent,
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

function normalizeColorValue(raw: string | null | undefined): string {
	const color = (raw ?? '').trim();
	return color.length > 0 ? color : 'Sin color';
}

function WhatsAppGlyph({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
		</svg>
	);
}

/**
 * Clave de agrupación para inventario con color por fila.
 * Si la fila no trae `color`, usa el color de la publicación solo cuando es un único color (no lista con comas).
 */
function bucketKeyForSizeRow(row: SizeInventoryRow, publicationColor: string | null): string {
	const explicit = row.color?.trim();
	if (explicit) return explicit;
	const parent = (publicationColor ?? '').trim();
	if (parent.length > 0 && !parent.includes(',')) return parent;
	return 'Sin color';
}

/** ¿Esta fila cuenta para el color elegido en el modal? */
function sizeRowMatchesSelectedColor(
	row: SizeInventoryRow,
	variantDisplayColor: string | null,
	selectedNorm: string,
): boolean {
	const rowCol = row.color?.trim();
	if (rowCol) return normalizeColorValue(rowCol) === selectedNorm;
	return normalizeColorValue(variantDisplayColor) === selectedNorm;
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
		<div className={`relative w-full min-h-0 overflow-hidden ${className ?? 'h-[450px]'}`}>
			<div className={`flex h-full min-h-0 ${showThumbnails ? 'gap-3 px-3 py-3 md:gap-4 md:px-4' : ''}`}>
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

				<div className="relative h-full min-h-0 min-w-0 flex-1">
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
								className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} contrast-[1.02] md:contrast-[1.05] md:sepia-[0.06]`}
							/>
						)}
					</AnimatePresence>

					{showControls ? (
						<>
							<button
								type="button"
								onClick={goPrev}
								className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 md:h-10 md:w-10 md:bg-black/45 md:backdrop-blur-sm"
								aria-label="Imagen anterior"
							>
								<ChevronLeft className="h-6 w-6 md:h-5 md:w-5" />
							</button>
							<button
								type="button"
								onClick={goNext}
								className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 md:h-10 md:w-10 md:bg-black/45 md:backdrop-blur-sm"
								aria-label="Imagen siguiente"
							>
								<ChevronRight className="h-6 w-6 md:h-5 md:w-5" />
							</button>
						</>
					) : null}

					{!showThumbnails && showControls ? (
						<div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-full bg-black/45 px-2.5 py-1.5 md:gap-1.5 md:bg-black/35 md:px-2 md:py-1 md:backdrop-blur-sm">
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

type ProductDetailModalProps = {
	product: ProductForDetailModal | null;
	onClose: () => void;
};

/** Una fila en BD con varias variantes por color en `size_inventory` → una entrada por color en el modal. */
function splitVariantByRowColors(v: ProductVariantForDetailModal): ProductVariantForDetailModal[] {
	const inv = v.size_inventory ?? [];
	if (inv.length === 0) return [v];
	const hasRowColor = inv.some((s) => (s.color?.trim()?.length ?? 0) > 0);
	if (!hasRowColor) return [v];
	const byColor = new Map<string, SizeInventoryRow[]>();
	for (const row of inv) {
		const colorKey = bucketKeyForSizeRow(row, v.color);
		const list = byColor.get(colorKey);
		const explicit = row.color?.trim();
		const merged = {
			...row,
			color: explicit || (colorKey !== 'Sin color' ? colorKey : null),
		};
		if (list) list.push(merged);
		else byColor.set(colorKey, [merged]);
	}
	return Array.from(byColor.entries()).map(([color, rows]) => ({
		...v,
		color,
		size_inventory: rows,
		stock: sumSizeInventoryQty(rows),
	}));
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
	const { addItem, openCart } = useCart();
	const [selectedColor, setSelectedColor] = useState<string>('');
	const [selectedSize, setSelectedSize] = useState<string>('');
	const [selectedQty, setSelectedQty] = useState(1);
	const lastResetProductIdRef = useRef<string | undefined>(undefined);

	const variants = (product?.variants?.length
		? product.variants.flatMap((v) => splitVariantByRowColors(v))
		: null) ?? (() => {
		if (!product) return [];
		const hasColorInsideSizes = product.size_inventory.some((s) => (s.color?.trim()?.length ?? 0) > 0);
		if (hasColorInsideSizes) {
			const byColor = new Map<string, SizeInventoryRow[]>();
			for (const row of product.size_inventory) {
				const colorKey = bucketKeyForSizeRow(row, product.color ?? null);
				const arr = byColor.get(colorKey);
				const explicit = row.color?.trim();
				const merged = {
					...row,
					color: explicit || (colorKey !== 'Sin color' ? colorKey : null),
				};
				if (arr) arr.push(merged);
				else byColor.set(colorKey, [merged]);
			}
			return Array.from(byColor.entries()).map(([color, rows]) => ({
				id: product.id,
				color,
				size_inventory: rows,
				stock: rows.reduce((sum, r) => sum + Math.max(0, r.qty), 0),
				price: product.price,
				image: product.image,
			}));
		}
		return [
			{
				id: product.id,
				color: product.color ?? null,
				size_inventory: product.size_inventory,
				stock: product.stock,
				price: product.price,
				image: product.image,
			},
		];
	})();

	const availableColors = Array.from(
		new Set(
			variants
				.filter((v) => {
					const withSizes = v.size_inventory.some((s) => s.qty > 0);
					return withSizes || v.stock > 0;
				})
				.map((v) => normalizeColorValue(v.color)),
		),
	);
	const hasSizes = variants.some((v) => v.size_inventory.length > 0);
	/** Si hay colores en la ficha, el usuario tiene que elegir uno antes de ver talles. */
	const requiresColorBeforeSize = availableColors.length > 0;

	const sizesForSelectedColor = useMemo(() => {
		if (!hasSizes) return [];
		if (requiresColorBeforeSize) {
			if (!selectedColor || !availableColors.includes(selectedColor)) return [];
			const cNorm = normalizeColorValue(selectedColor);
			const set = new Set<string>();
			for (const v of variants) {
				if (normalizeColorValue(v.color) !== cNorm) continue;
				for (const s of v.size_inventory) {
					if (s.qty <= 0) continue;
					if (!sizeRowMatchesSelectedColor(s, v.color, cNorm)) continue;
					const sz = s.size.trim();
					if (sz) set.add(sz);
				}
			}
			return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
		}
		const set = new Set<string>();
		for (const v of variants) {
			for (const s of v.size_inventory) {
				if (s.qty <= 0) continue;
				const sz = s.size.trim();
				if (sz) set.add(sz);
			}
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
	}, [hasSizes, requiresColorBeforeSize, selectedColor, availableColors, variants]);

	const colorChosen =
		!requiresColorBeforeSize ||
		(Boolean(selectedColor) && availableColors.includes(selectedColor));

	useEffect(() => {
		if (!product) {
			lastResetProductIdRef.current = undefined;
			setSelectedColor('');
			setSelectedSize('');
			return;
		}
		if (lastResetProductIdRef.current !== product.id) {
			lastResetProductIdRef.current = product.id;
			setSelectedColor('');
			setSelectedSize('');
		}
	}, [product]);

	useEffect(() => {
		if (!product || !hasSizes) {
			if (!product || !hasSizes) setSelectedSize('');
			return;
		}
		const sizes = sizesForSelectedColor;
		if (sizes.length === 0) {
			setSelectedSize('');
			return;
		}
		setSelectedSize((prev) => (prev && sizes.includes(prev) ? prev : ''));
	}, [product, hasSizes, sizesForSelectedColor]);

	useEffect(() => {
		setSelectedQty(1);
	}, [product?.id]);

	const effectiveColorNorm =
		requiresColorBeforeSize && colorChosen && selectedColor
			? normalizeColorValue(selectedColor)
			: '';

	const selectedVariant = useMemo(() => {
		if (!hasSizes) {
			return variants[0];
		}
		if (!selectedSize) return undefined;
		if (requiresColorBeforeSize && !colorChosen) return undefined;
		const cNorm = requiresColorBeforeSize ? effectiveColorNorm : null;
		return variants.find((v) => {
			if (cNorm && normalizeColorValue(v.color) !== cNorm) return false;
			return v.size_inventory.some((s) => {
				if (!(s.qty > 0 && s.size.trim() === selectedSize)) return false;
				if (cNorm) return sizeRowMatchesSelectedColor(s, v.color, cNorm);
				return true;
			});
		});
	}, [
		variants,
		hasSizes,
		selectedSize,
		requiresColorBeforeSize,
		colorChosen,
		effectiveColorNorm,
	]);

	const selectedVariantStock = useMemo(() => {
		if (!selectedVariant) return 0;
		if (!hasSizes || !selectedSize) return selectedVariant.stock;
		const cNorm = requiresColorBeforeSize ? effectiveColorNorm : null;
		const row = selectedVariant.size_inventory.find((s) => {
			if (s.size.trim() !== selectedSize) return false;
			if (cNorm) return sizeRowMatchesSelectedColor(s, selectedVariant.color, cNorm);
			return true;
		});
		return Math.max(0, row?.qty ?? 0);
	}, [selectedVariant, hasSizes, selectedSize, requiresColorBeforeSize, effectiveColorNorm]);

	useEffect(() => {
		if (selectedVariantStock <= 0) return;
		setSelectedQty((q) => Math.min(q, Math.max(1, selectedVariantStock)));
	}, [selectedVariantStock, product?.id]);

	const whatsAppConsultHref = useMemo(() => {
		if (!product) return '';
		const name = product.name.trim();
		const codeRaw = (product.product_code ?? '').trim();
		const code = codeRaw.length > 0 ? codeRaw : 'sin código';
		const talle = selectedSize?.trim() || '…';
		const color = selectedColor?.trim() || '…';
		const text = `Hola, quería saber si va a ingresar el «${name}», código «${code}», en talle «${talle}», color «${color}».`;
		return whatsAppLinkWithMessage(text);
	}, [product, selectedColor, selectedSize]);

	function closeProductModal() {
		onClose();
		setSelectedQty(1);
	}

	function onAddSelectedToCart() {
		if (!product) return;
		if (hasSizes && requiresColorBeforeSize && !colorChosen) {
			toast.error('Elegí un color primero.');
			return;
		}
		if (hasSizes && !selectedSize) {
			toast.error('Seleccioná un talle.');
			return;
		}
		if (!selectedVariant) {
			toast.error('Seleccioná una variante disponible.');
			return;
		}
		if (selectedVariantStock <= 0) {
			toast.error('La variante seleccionada no tiene stock.');
			return;
		}
		addItem({
			id: selectedVariant.id,
			productId: selectedVariant.id,
			name: product.name,
			price: selectedVariant.price,
			image: selectedVariant.image || product.image,
			color: normalizeColorValue(selectedVariant.color),
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
						className="fixed inset-0 z-[10000] bg-[radial-gradient(circle_at_top,rgba(20,20,20,0.45),rgba(0,0,0,0.78))] md:bg-[radial-gradient(circle_at_top,rgba(20,20,20,0.35),rgba(0,0,0,0.72))] md:backdrop-blur-[3px]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={closeProductModal}
						aria-label="Cerrar detalle de producto"
					/>
					<motion.div
						className="fixed inset-0 z-[10001] mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden border-0 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:inset-x-6 sm:top-[5vh] sm:h-auto sm:max-h-[88vh] sm:rounded-sm sm:border sm:border-black/10 md:inset-x-10 lg:max-w-5xl"
						initial={{ opacity: 0, y: 24, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 24, scale: 0.98 }}
						transition={{ duration: 0.25 }}
					>
						<button
							type="button"
							className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-black/70 text-white shadow-md transition active:scale-95 hover:bg-black/85 md:right-4 md:top-4 md:h-10 md:w-10 md:bg-black/60 md:backdrop-blur-sm"
							onClick={closeProductModal}
							aria-label="Cerrar"
						>
							<X className="h-6 w-6 md:h-5 md:w-5" strokeWidth={2} />
						</button>
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:max-h-[88vh] lg:grid-cols-[minmax(0,1fr)_380px]">
							<div className="relative shrink-0 bg-[#111] lg:min-h-0 lg:max-h-[88vh]">
								<ProductMediaCarousel
									media={product.media}
									productName={product.name}
									className="h-[min(38vh,340px)] min-h-[220px] max-h-[440px] sm:h-[min(44vh,400px)] sm:min-h-[260px] lg:h-[min(88vh,820px)] lg:max-h-[88vh]"
									fit="contain"
									autoPlay={false}
									showThumbRail
								/>
							</div>
							<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-t-[1.25rem] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] sm:px-6 sm:pt-6 lg:rounded-none lg:p-6 lg:shadow-none">
								<p
									className="pl-0.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#6b6156]"
									style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
								>
									{product.category_db ? displayCategoryLabel(product.category_db) : 'Sin categoría'}
								</p>
								<h2
									className="mt-3 text-balance text-[#1f1f1f]"
									style={{
										fontFamily: 'Montserrat, sans-serif',
										fontSize: 'clamp(1.35rem, 4.2vw, 2.2rem)',
										fontWeight: 700,
										lineHeight: 1.2,
									}}
								>
									{product.name}
								</h2>
								<p
									className="mt-5 pl-0.5 text-[0.7rem] uppercase tracking-[0.22em] text-[#6b6156]"
									style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
								>
									Costo de prenda
								</p>
								<p
									className="mt-1 text-[#1f1f1f]"
									style={{
										fontFamily: 'Montserrat, sans-serif',
										fontSize: 'clamp(1.65rem, 5vw, 2.6rem)',
										fontWeight: 700,
										letterSpacing: '-0.02em',
									}}
								>
									{formatPrecioListaAr(getPrimaryDiscountedPrice(product.price, product.transfer_price))}
								</p>
								<p
									className="mt-1 pl-0.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#6b6156]"
									style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
								>
									Efectivo o transferencia
								</p>
								<div
									className="mt-4 space-y-3 rounded-xl border border-[#e4dfd6] bg-[#faf8f6] px-4 py-4"
									style={{ fontFamily: 'Montserrat, sans-serif' }}
								>
									<div>
										<p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#6b6156]" style={{ fontWeight: 600 }}>
											Precio de lista
										</p>
										<p className="mt-1 text-sm font-medium text-[#1f1f1f]">{formatPrecioListaAr(product.final_transfer_price)}</p>
									</div>
									<div className="border-t border-[#e4dfd6] pt-3">
										<p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#6b6156]" style={{ fontWeight: 600 }}>
											Tarjeta débito / crédito
										</p>
										<p className="mt-1 text-sm font-semibold text-[#1f1f1f]">{formatPrecioListaAr(product.final_transfer_price)}</p>
										<p className="mt-1.5 text-xs leading-relaxed text-[#5c5349]" style={{ fontWeight: 500 }}>
											Débito: un solo pago. Crédito: 3 cuotas sin interés.
										</p>
									</div>
								</div>
								<div className="mt-5 rounded-xl border border-[#e4dfd6] bg-[#f5f2ed] p-4">
									<p
										className="text-sm leading-relaxed text-[#3d3830]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
									>
										{product.description?.trim() || 'Prenda seleccionada de nuestra colección.'}
									</p>
								</div>

								{availableColors.length > 0 ? (
									<div className="mt-7">
										<p
											className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[#5c5349]"
											style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
										>
											Elegí color
										</p>
										{hasSizes ? (
											<p className="mb-3 text-xs leading-relaxed text-[#6b6156]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
												Después de elegir el color vas a ver solo los talles con stock para ese color.
											</p>
										) : null}
										<div className="flex flex-wrap gap-2.5">
											{availableColors.map((color) => {
												const active = selectedColor === color;
												return (
													<button
														key={color}
														type="button"
														onClick={() => {
															setSelectedColor(color);
															setSelectedSize('');
														}}
														className={`min-h-[44px] touch-manipulation rounded-lg border px-4 py-2.5 text-sm transition active:scale-[0.98] ${
															active
																? 'border-[#202020] bg-[#202020] text-white shadow-sm'
																: 'border-[#d7d7d7] bg-white text-[#1a1410] hover:border-[#202020]'
														}`}
														style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
													>
														{color}
													</button>
												);
											})}
										</div>
									</div>
								) : null}

								{hasSizes ? (
									<div className="mt-7">
										<p
											className="mb-3 text-[0.7rem] uppercase tracking-[0.2em] text-[#5c5349]"
											style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
										>
											Elegí talle
										</p>
										{requiresColorBeforeSize && !colorChosen ? (
											<p className="text-sm leading-relaxed text-[#6b6156]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
												Primero elegí un color arriba.
											</p>
										) : sizesForSelectedColor.length === 0 ? (
											<p className="text-sm leading-relaxed text-amber-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
												No hay stock en este color.
											</p>
										) : (
											<div className="flex flex-wrap gap-2.5">
												{sizesForSelectedColor.map((size) => {
													const active = selectedSize === size;
													return (
														<button
															key={size}
															type="button"
															onClick={() => setSelectedSize(size)}
															className={`min-h-[44px] min-w-[44px] touch-manipulation rounded-lg border px-4 py-2.5 text-sm transition active:scale-[0.98] ${
																active
																	? 'border-[#202020] bg-[#202020] text-white shadow-sm'
																	: 'border-[#d7d7d7] bg-white text-[#1a1410] hover:border-[#202020]'
															}`}
															style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
														>
															{size}
														</button>
													);
												})}
											</div>
										)}
									</div>
								) : (
									<p
										className="mt-7 text-xs uppercase tracking-[0.18em] text-[#666]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
									>
										Stock disponible: {selectedVariantStock}
									</p>
								)}

								{product && (hasSizes || availableColors.length > 0) && whatsAppConsultHref ? (
									<div className="mt-5 flex flex-wrap items-center gap-2">
										<a
											href={whatsAppConsultHref}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#128C7E]/35 bg-[#25D366]/10 px-2 py-1.5 text-left text-[10px] font-medium leading-snug text-[#0d3b2c] transition hover:border-[#128C7E]/55 hover:bg-[#25D366]/18"
											style={{ fontFamily: 'Montserrat, sans-serif' }}
										>
											<WhatsAppGlyph className="h-3.5 w-3.5 shrink-0 text-[#128C7E]" />
											<span>Consultar por talle y colores sin stock</span>
										</a>
									</div>
								) : null}

								<div className="mt-8 grid grid-cols-1 gap-3 min-[400px]:grid-cols-[7.5rem_1fr]">
									<div className="flex h-12 items-center rounded-md border border-[#d7d7d7] bg-white">
										<button
											type="button"
											className="flex h-full min-w-[44px] touch-manipulation items-center justify-center text-xl text-[#666] transition hover:bg-[#f6f6f6] active:bg-[#ececec]"
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
											className="flex h-full min-w-[44px] touch-manipulation items-center justify-center text-xl text-[#666] transition hover:bg-[#f6f6f6] active:bg-[#ececec]"
											onClick={() =>
												setSelectedQty((q) =>
													selectedVariantStock > 0 ? Math.min(q + 1, selectedVariantStock) : q + 1,
												)
											}
											aria-label="Sumar cantidad"
										>
											+
										</button>
									</div>
									<button
										type="button"
										onClick={onAddSelectedToCart}
										className="flex min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-md bg-[#1f1f1f] px-4 py-3 text-sm text-white shadow-[0_8px_20px_rgba(26,20,16,0.24)] transition hover:bg-[#343434] active:scale-[0.99] sm:h-12 sm:min-h-0 sm:py-0"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
									>
										<ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={1.7} />
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

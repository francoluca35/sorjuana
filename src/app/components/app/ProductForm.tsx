'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchRecentProductsAction, insertProductAction } from '@/app/actions/products';
import { listShopCategoryTreeAction } from '@/app/actions/shopCategories';
import { getPriceSettingsAction } from '@/app/actions/priceSettings';
import type { ShopCategoryTree } from '@/lib/data/shopCategories';
import { uploadSorjuanaMedia } from '@/app/actions/storage';
import { SizeInventoryEditor } from '@/app/components/app/SizeInventoryEditor';
import {
	normalizeSizeInventoryForDb,
	sumSizeInventoryQty,
	type SizeInventoryRow,
} from '@/lib/data/productSizes';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/components/ui/utils';
import { Trash2 } from 'lucide-react';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

function formatMoneyAR(n: number) {
	if (!Number.isFinite(n) || n < 0) return '$0';
	return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function parseMoneyInput(raw: string): number {
	const normalized = raw.replace(/\./g, '').replace(',', '.');
	const n = parseFloat(normalized);
	return Number.isFinite(n) ? n : 0;
}

const PLACEHOLDER_IMG =
	'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=480&q=80';

const labelClass =
	'mb-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-[#6b6156]';

const inputClass =
	'h-10 rounded-md border border-[#b8956a]/28 bg-white/55 text-[#1a1410] shadow-none backdrop-blur-sm placeholder:text-[#9c9590] focus-visible:border-[#8b6f47]/55 focus-visible:ring-[#b8956a]/25';

const selectClass =
	'flex h-10 w-full rounded-md border border-[#b8956a]/28 bg-white/55 px-3 text-sm text-[#1a1410] outline-none backdrop-blur-sm focus:border-[#8b6f47]/55 focus:ring-2 focus:ring-[#b8956a]/20';

const innerCard = 'rounded-md border border-[#b8956a]/22 bg-white/40 p-4 backdrop-blur-sm sm:p-5';

const MAX_IMAGES = 3;

type ComboSourceProduct = {
	id: string;
	name: string;
	price: number;
};

type ComboSelectedItem = {
	productId: string;
	name: string;
	unitPrice: number;
	qty: number;
};

function parseOptionalNonNegInt(raw: string): number | null {
	const t = raw.trim();
	if (!t) return null;
	const n = parseInt(t, 10);
	return Number.isFinite(n) ? Math.max(0, n) : null;
}

type ColorBlockDraft = {
	id: string;
	color: string;
	stock: number;
	size_inventory: SizeInventoryRow[];
};

function buildInventoryFromColorBlocks(blocks: ColorBlockDraft[]): {
	mergedRows: SizeInventoryRow[];
	mergedStock: number;
	mergedColors: string;
} {
	const mergedSizes: SizeInventoryRow[] = [];
	for (const v of blocks) {
		const color = v.color.trim() || null;
		const sizesNorm = normalizeSizeInventoryForDb(v.size_inventory);
		if (sizesNorm.length > 0) {
			for (const s of sizesNorm) {
				mergedSizes.push({ color, size: s.size, qty: s.qty });
			}
		} else if (v.stock > 0) {
			mergedSizes.push({ color, size: 'Unico', qty: Math.max(0, Math.floor(v.stock)) });
		}
	}
	const mergedRows = normalizeSizeInventoryForDb(mergedSizes);
	const mergedStock =
		mergedRows.length > 0
			? sumSizeInventoryQty(mergedRows)
			: blocks.reduce((sum, v) => sum + Math.max(0, Math.floor(v.stock)), 0);
	const mergedColors = Array.from(new Set(blocks.map((b) => b.color.trim()).filter(Boolean))).join(', ');
	return { mergedRows, mergedStock, mergedColors };
}

export default function ProductForm() {
	const router = useRouter();
	const imagesInputRef = useRef<HTMLInputElement>(null);
	const videoRef = useRef<HTMLInputElement>(null);

	const [productKind, setProductKind] = useState<'producto' | 'combo' | 'ofertas'>('producto');
	const [nombre, setNombre] = useState('');
	/** Stock numérico solo para tipo combo (publicación sin talles por color). */
	const [stock, setStock] = useState('');
	const [costoInicial, setCostoInicial] = useState('');
	const [costoPrenda, setCostoPrenda] = useState('');
	const [cashDiscountPercent, setCashDiscountPercent] = useState(0);
	const [transferDiscountPercent, setTransferDiscountPercent] = useState(0);
	const [descripcion, setDescripcion] = useState('');
	const [newColorInput, setNewColorInput] = useState('');
	const [colorBlocks, setColorBlocks] = useState<ColorBlockDraft[]>([]);

	const initCode = useMemo(() => String(2000 + Math.floor(Math.random() * 7000)), []);
	const [codigo, setCodigo] = useState(initCode);
	const [categoryTree, setCategoryTree] = useState<ShopCategoryTree[]>([]);
	const [categoriesLoading, setCategoriesLoading] = useState(true);
	const [categoryId, setCategoryId] = useState('');
	const [subcategoryId, setSubcategoryId] = useState('');
	const [compraMinima, setCompraMinima] = useState('');
	const [compraMaxima, setCompraMaxima] = useState('');
	const [comboProducts, setComboProducts] = useState<ComboSourceProduct[]>([]);
	const [comboProductsLoading, setComboProductsLoading] = useState(false);
	const [comboSearch, setComboSearch] = useState('');
	const [comboItems, setComboItems] = useState<ComboSelectedItem[]>([]);

	const [imageFiles, setImageFiles] = useState<File[]>([]);
	const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
	const [previewImageIndex, setPreviewImageIndex] = useState(0);
	const [videoFile, setVideoFile] = useState<File | null>(null);
	const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
	const [remoteImageUrls, setRemoteImageUrls] = useState<string[]>([]);
	const [remoteVideoUrl, setRemoteVideoUrl] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const urls = imageFiles.map((f) => URL.createObjectURL(f));
		setImagePreviewUrls(urls);
		setPreviewImageIndex((i) => (urls.length === 0 ? 0 : Math.min(i, urls.length - 1)));
		return () => {
			for (const u of urls) URL.revokeObjectURL(u);
		};
	}, [imageFiles]);

	useEffect(() => {
		if (!videoFile) {
			setVideoPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(videoFile);
		setVideoPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [videoFile]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setCategoriesLoading(true);
			try {
				const data = await listShopCategoryTreeAction();
				if (!cancelled) {
					setCategoryTree(data);
				}
			} catch {
				if (!cancelled) {
					setCategoryTree([]);
				}
			} finally {
				if (!cancelled) {
					setCategoriesLoading(false);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setComboProductsLoading(true);
			try {
				const rows = await fetchRecentProductsAction(500);
				if (cancelled) return;
				setComboProducts(
					rows
						.filter((r) => r.kind !== 'combo')
						.map((r) => ({
							id: r.id,
							name: r.name,
							price: Number(r.price) || 0,
						})),
				);
			} catch {
				if (!cancelled) {
					setComboProducts([]);
				}
			} finally {
				if (!cancelled) {
					setComboProductsLoading(false);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const settings = await getPriceSettingsAction();
				if (cancelled) return;
				setCashDiscountPercent(Number(settings.cashDiscountPercent) || 0);
				setTransferDiscountPercent(Number(settings.transferDiscountPercent) || 0);
			} catch {
				/* ignore and keep defaults */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (productKind === 'combo') {
			setColorBlocks([]);
			setNewColorInput('');
		}
	}, [productKind]);

	const selectedCategory = useMemo(
		() => categoryTree.find((c) => c.id === categoryId) ?? null,
		[categoryTree, categoryId],
	);

	const categoryValueForDb = useMemo(() => {
		if (productKind === 'combo') return 'combo';
		if (!selectedCategory) return null;
		const sub = selectedCategory.subcategories.find((s) => s.id === subcategoryId);
		if (sub) {
			return `${selectedCategory.slug}/${sub.slug}`;
		}
		return selectedCategory.slug;
	}, [productKind, selectedCategory, subcategoryId]);

	const comboTotal = useMemo(
		() => comboItems.reduce((acc, item) => acc + item.unitPrice * item.qty, 0),
		[comboItems],
	);
	const costoPrendaNum = useMemo(() => parseMoneyInput(costoPrenda), [costoPrenda]);
	const precioCalculadoEfectivo = useMemo(() => {
		return Math.round(costoPrendaNum * (1 - Math.max(0, cashDiscountPercent) / 100));
	}, [costoPrendaNum, cashDiscountPercent]);
	const precioCalculadoTransferencia = useMemo(() => {
		return Math.round(costoPrendaNum * (1 - Math.max(0, transferDiscountPercent) / 100));
	}, [costoPrendaNum, transferDiscountPercent]);
	const precioCalculadoTarjeta = useMemo(() => Math.round(costoPrendaNum), [costoPrendaNum]);

	const comboFilteredProducts = useMemo(() => {
		const q = comboSearch.trim().toLowerCase();
		if (!q) return comboProducts.slice(0, 24);
		return comboProducts.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 24);
	}, [comboProducts, comboSearch]);

	const stockTotalComputed = useMemo(() => {
		if (productKind === 'combo') {
			return Math.max(0, Math.floor(parseInt(stock, 10) || 0));
		}
		const { mergedStock } = buildInventoryFromColorBlocks(colorBlocks);
		return mergedStock;
	}, [productKind, colorBlocks, stock]);

	const primaryPreview =
		imagePreviewUrls[previewImageIndex] ??
		imagePreviewUrls[0] ??
		remoteImageUrls[previewImageIndex] ??
		remoteImageUrls[0] ??
		null;

	function onImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
		const list = e.target.files;
		if (!list?.length) return;
		const next = [...imageFiles];
		for (let i = 0; i < list.length && next.length < MAX_IMAGES; i++) {
			next.push(list[i]!);
		}
		if (list.length + imageFiles.length > MAX_IMAGES) {
			toast.message(`Solo podés subir hasta ${MAX_IMAGES} fotos.`);
		}
		setImageFiles(next);
		setRemoteImageUrls([]);
		setPreviewImageIndex(next.length - 1);
		e.target.value = '';
	}

	function removeImageAt(index: number) {
		setImageFiles((files) => files.filter((_, i) => i !== index));
		setRemoteImageUrls([]);
		setPreviewImageIndex((i) => {
			if (index < i) return Math.max(0, i - 1);
			if (index === i) return Math.max(0, i - 1);
			return i;
		});
	}

	function onVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
		setVideoFile(e.target.files?.[0] ?? null);
		setRemoteVideoUrl(null);
	}

	function addComboItem(product: ComboSourceProduct) {
		setComboItems((prev) => {
			const idx = prev.findIndex((x) => x.productId === product.id);
			if (idx >= 0) {
				return prev.map((x, i) => (i === idx ? { ...x, qty: x.qty + 1 } : x));
			}
			return [...prev, { productId: product.id, name: product.name, unitPrice: product.price, qty: 1 }];
		});
	}

	function addColorBlock() {
		const c = newColorInput.trim();
		if (!c) {
			toast.error('Escribí un color antes de agregar.');
			return;
		}
		if (colorBlocks.some((b) => b.color.trim().toLowerCase() === c.toLowerCase())) {
			toast.error('Ese color ya está en la lista.');
			return;
		}
		setColorBlocks((prev) => [
			...prev,
			{
				id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				color: c,
				stock: 0,
				size_inventory: [],
			},
		]);
		setNewColorInput('');
	}

	function updateColorBlockColor(id: string, nextColor: string) {
		const trimmed = nextColor.trim();
		const colorForRows = trimmed || null;
		setColorBlocks((prev) =>
			prev.map((b) => {
				if (b.id !== id) return b;
				return {
					...b,
					color: nextColor,
					size_inventory: b.size_inventory.map((r) => ({ ...r, color: colorForRows })),
				};
			}),
		);
	}

	function removeColorBlock(id: string) {
		setColorBlocks((prev) => prev.filter((b) => b.id !== id));
	}

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (isSubmitting) return;

		const nameTrim = nombre.trim();
		if (!nameTrim) {
			toast.error('Completá el nombre del producto.');
			return;
		}

		if (productKind !== 'combo') {
			if (!categoryId || !selectedCategory) {
				toast.error('Elegí una categoría.');
				return;
			}
			if (selectedCategory.subcategories.length > 0 && !subcategoryId) {
				toast.error('Elegí una subcategoría.');
				return;
			}
		}
		if (productKind === 'combo' && comboItems.length === 0) {
			toast.error('Agregá al menos un producto para armar el combo.');
			return;
		}
		if (productKind !== 'combo') {
			if (colorBlocks.length === 0) {
				toast.error('Agregá al menos un color.');
				return;
			}
			if (colorBlocks.some((b) => !b.color.trim())) {
				toast.error('Completá el nombre de cada color.');
				return;
			}
		}

		const garmentCost = parseMoneyInput(costoPrenda);
		if (!(garmentCost > 0)) {
			toast.error('Ingresá un costo de prenda mayor a 0.');
			return;
		}

		setIsSubmitting(true);
		try {
			const uploadedImages: string[] = [];
			for (const file of imageFiles) {
				const fd = new FormData();
				fd.append('file', file);
				fd.append('kind', 'image');
				const res = await uploadSorjuanaMedia(fd);
				if (!res.ok) {
					toast.error(res.message);
					return;
				}
				uploadedImages.push(res.publicUrl);
			}
			if (uploadedImages.length) setRemoteImageUrls(uploadedImages);

			let finalVideoUrl: string | null = null;
			if (videoFile) {
				const fd = new FormData();
				fd.append('file', videoFile);
				fd.append('kind', 'video');
				const res = await uploadSorjuanaMedia(fd);
				if (!res.ok) {
					toast.error(res.message);
					return;
				}
				finalVideoUrl = res.publicUrl;
				setRemoteVideoUrl(res.publicUrl);
			}

			const cost = parseMoneyInput(costoInicial);
			let stockN: number;
			let colorPayload: string | null;
			let sizeInventoryPayload: SizeInventoryRow[];
			if (productKind === 'combo') {
				stockN = Math.max(0, Math.floor(parseInt(stock, 10) || 0));
				colorPayload = null;
				sizeInventoryPayload = [];
			} else {
				const { mergedRows, mergedStock, mergedColors } = buildInventoryFromColorBlocks(colorBlocks);
				stockN = mergedStock;
				colorPayload = mergedColors.trim() ? mergedColors : null;
				sizeInventoryPayload = mergedRows;
			}
			const ins = await insertProductAction({
				kind: productKind,
				name: nameTrim,
				stock: stockN,
				cost,
				garmentCost,
				cashDiscountPercent,
				transferDiscountPercent,
				taxApplies: false,
				taxPercent: null,
				description: descripcion.trim() || null,
				color: colorPayload,
				productCode: codigo.trim() || null,
				category: categoryValueForDb,
				minOrderQty: parseOptionalNonNegInt(compraMinima),
				maxOrderQty: parseOptionalNonNegInt(compraMaxima),
				imageUrls: uploadedImages,
				videoUrl: finalVideoUrl,
				compareAtPrice: null,
				sizeInventory: sizeInventoryPayload,
				comboItems,
			});

			if (!ins.ok) {
				toast.error(ins.message);
				return;
			}

			toast.success('Producto guardado en la base de datos.');
			router.push('/app/productos');
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: 'Falló el guardado. Si subiste archivos grandes, probá con otros o reiniciá el servidor tras actualizar next.config.';
			toast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
	}

	const stockLabel = String(stockTotalComputed);

	return (
		<div className="min-w-0 text-[#1a1410]" style={{ fontFamily: sans }}>
			<header className="mb-8 flex flex-col gap-4 border-b border-[#b8956a]/20 pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
				<div>
					<h1 className="text-3xl font-light tracking-wide text-[#1a1410] sm:text-4xl" style={{ fontFamily: serif }}>
						Carga de producto
					</h1>
					<p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-[#6b6156]">
						Alta de producto, combo u oferta: datos de precio, stock y hasta {MAX_IMAGES} fotos y un video.
					</p>
				</div>
				<p
					className="shrink-0 text-[10px] font-medium uppercase leading-relaxed tracking-[0.2em] text-[#8b6f47]"
					style={{ fontFamily: sans }}
				>
					Importaciones exclusivas de Europa
				</p>
			</header>

			<p className="mb-10 text-xl font-light tracking-wide text-[#3d3835] sm:text-2xl" style={{ fontFamily: serif }}>
				Nuevo ítem
			</p>

			<form onSubmit={onSubmit} className="min-w-0">
				<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_min(100%,320px)] lg:items-start lg:gap-12">
					<div className="min-w-0 space-y-10">
						<section>
							<h2 className="text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
								Tipo
							</h2>
							<div className="mt-5 flex flex-wrap gap-2">
								{(
									[
										{ id: 'producto' as const, label: 'Producto' },
										{ id: 'combo' as const, label: 'Combo' },
										{ id: 'ofertas' as const, label: 'Ofertas' },
									] as const
								).map(({ id, label }) => (
									<button
										key={id}
										type="button"
										onClick={() => setProductKind(id)}
										className={cn(
											'rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition',
											productKind === id
												? 'border-[#8b6f47] bg-[#b8956a]/18 text-[#2a2218] shadow-sm'
												: 'border-[#b8956a]/25 bg-white/35 text-[#5c5349] hover:border-[#b8956a]/40 hover:bg-white/50',
										)}
									>
										{label}
									</button>
								))}
							</div>
						</section>

						<section>
							<h2 className="text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
								Datos del ítem
							</h2>
							<div className="mt-5 grid gap-5 sm:grid-cols-2">
								<div className="sm:col-span-2">
									<Label htmlFor="nombre" className={labelClass} style={{ fontFamily: sans }}>
										Nombre
									</Label>
									<Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={cn(inputClass)} />
								</div>
								{productKind === 'combo' ? (
									<div className="sm:col-span-2">
										<div className={cn(innerCard, 'mt-0')}>
											<p className="mb-3 text-xs font-light text-[#6b6156]" style={{ fontFamily: sans }}>
												Los combos publican un solo stock (sin colores ni talles en esta pantalla).
											</p>
											<Label htmlFor="stock-combo" className={labelClass} style={{ fontFamily: sans }}>
												Stock del combo
											</Label>
											<Input
												id="stock-combo"
												type="number"
												min={0}
												step={1}
												inputMode="numeric"
												value={stock}
												onChange={(e) => setStock(e.target.value)}
												className={inputClass}
												placeholder="0"
											/>
										</div>
									</div>
								) : (
									<div className="sm:col-span-2 space-y-4">
										<p className="text-xs font-light leading-relaxed text-[#6b6156]" style={{ fontFamily: sans }}>
											Escribí un color, tocá <span className="font-medium text-[#3d3835]">Agregar</span> y debajo cargá
											stock y talles para ese color. Repetí para más colores.
										</p>
										<div className={cn(innerCard, 'flex flex-col gap-3 sm:flex-row sm:items-end')}>
											<div className="min-w-0 flex-1">
												<Label htmlFor="nuevo-color" className={labelClass} style={{ fontFamily: sans }}>
													Nuevo color
												</Label>
												<Input
													id="nuevo-color"
													value={newColorInput}
													onChange={(e) => setNewColorInput(e.target.value)}
													className={inputClass}
													placeholder="Ej. negro, beige"
												/>
											</div>
											<Button
												type="button"
												variant="outline"
												className="h-10 shrink-0 border-[#b8956a]/45 bg-white/50 text-[#2a2520] hover:bg-[#f5f2ed]"
												style={{ fontFamily: sans }}
												onClick={addColorBlock}
												disabled={isSubmitting}
											>
												Agregar
											</Button>
										</div>
										<div className="space-y-4">
											{colorBlocks.length === 0 ? (
												<p
													className="rounded-md border border-dashed border-[#b8956a]/35 bg-white/30 px-3 py-4 text-xs text-[#6b6156]"
													style={{ fontFamily: sans }}
												>
													Todavía no agregaste ningún color.
												</p>
											) : (
												colorBlocks.map((block) => (
													<div key={block.id} className={cn(innerCard, 'space-y-4')}>
														<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
															<div className="min-w-0 flex-1">
																<Label htmlFor={`color-name-${block.id}`} className={labelClass} style={{ fontFamily: sans }}>
																	Color
																</Label>
																<Input
																	id={`color-name-${block.id}`}
																	value={block.color}
																	onChange={(e) => updateColorBlockColor(block.id, e.target.value)}
																	className={inputClass}
																	placeholder="Nombre del color"
																/>
															</div>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																className="h-10 w-10 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
																aria-label="Quitar este color"
																onClick={() => removeColorBlock(block.id)}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
														<div>
															<Label htmlFor={`stock-block-${block.id}`} className={labelClass} style={{ fontFamily: sans }}>
																Stock (sin talles o ajuste rápido)
															</Label>
															<Input
																id={`stock-block-${block.id}`}
																type="number"
																min={0}
																step={1}
																inputMode="numeric"
																value={block.stock}
																onChange={(e) =>
																	setColorBlocks((prev) =>
																		prev.map((b) =>
																			b.id === block.id
																				? {
																						...b,
																						stock: Math.max(0, Math.floor(Number(e.target.value) || 0)),
																					}
																				: b,
																		),
																	)
																}
																className={cn(inputClass, 'max-w-[14rem]')}
															/>
														</div>
														<SizeInventoryEditor
															rows={block.size_inventory}
															onChange={(rows) =>
																setColorBlocks((prev) =>
																	prev.map((b) => {
																		if (b.id !== block.id) return b;
																		const norm = normalizeSizeInventoryForDb(rows);
																		return {
																			...b,
																			size_inventory: rows,
																			stock: norm.length > 0 ? sumSizeInventoryQty(norm) : b.stock,
																		};
																	}),
																)
															}
															disabled={isSubmitting}
															idPrefix={`carga-${block.id}`}
															implicitColor={block.color?.trim() || null}
															totalAccentClassName="text-[#b8956a]"
														/>
														{normalizeSizeInventoryForDb(block.size_inventory).length > 0 ? (
															<p className="text-xs font-light text-[#6b6156]" style={{ fontFamily: sans }}>
																Con talles, el total de este color es la suma de las cantidades (
																{sumSizeInventoryQty(normalizeSizeInventoryForDb(block.size_inventory))} u.).
															</p>
														) : null}
													</div>
												))
											)}
										</div>
									</div>
								)}
								<div>
									<Label htmlFor="costo" className={labelClass} style={{ fontFamily: sans }}>
										Costo inicial
									</Label>
									<Input
										id="costo"
										inputMode="decimal"
										value={costoInicial}
										onChange={(e) => setCostoInicial(e.target.value)}
										className={inputClass}
										placeholder="0"
									/>
								</div>
								<div>
									<Label htmlFor="costo-prenda" className={labelClass} style={{ fontFamily: sans }}>
										Costo de prenda
									</Label>
									<Input
										id="costo-prenda"
										inputMode="decimal"
										value={costoPrenda}
										onChange={(e) => setCostoPrenda(e.target.value)}
										className={inputClass}
										placeholder="0"
									/>
								</div>
								<div className="sm:col-span-2">
									<div className={cn(innerCard, 'mt-0 space-y-3')}>
										<p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6b6156]">
											Precios calculados desde costo de prenda
										</p>
										<div className="grid gap-3 sm:grid-cols-3">
											<div className="rounded-md border border-[#b8956a]/22 bg-[#fffdfb]/80 p-3">
												<p className="text-[11px] uppercase tracking-[0.14em] text-[#8b6f47]">
													Efectivo ({cashDiscountPercent}%)
												</p>
												<p className="mt-1 text-base text-[#1a1410]" style={{ fontFamily: serif }}>
													{formatMoneyAR(precioCalculadoEfectivo)}
												</p>
											</div>
											<div className="rounded-md border border-[#b8956a]/22 bg-[#fffdfb]/80 p-3">
												<p className="text-[11px] uppercase tracking-[0.14em] text-[#8b6f47]">
													Transferencia ({transferDiscountPercent}%)
												</p>
												<p className="mt-1 text-base text-[#1a1410]" style={{ fontFamily: serif }}>
													{formatMoneyAR(precioCalculadoTransferencia)}
												</p>
											</div>
											<div className="rounded-md border border-[#b8956a]/22 bg-[#fffdfb]/80 p-3">
												<p className="text-[11px] uppercase tracking-[0.14em] text-[#8b6f47]">
													Tarjeta crédito/débito
												</p>
												<p className="mt-1 text-base text-[#1a1410]" style={{ fontFamily: serif }}>
													{formatMoneyAR(precioCalculadoTarjeta)}
												</p>
												<p className="mt-1 text-[11px] text-[#6b6156]">
													Crédito: 3 cuotas sin interés. Débito: 1 pago.
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>

							{productKind === 'combo' ? (
								<div className={cn('mt-8', innerCard)}>
									<div className="space-y-4">
										<div>
											<Label htmlFor="combo-search" className={labelClass} style={{ fontFamily: sans }}>
												Buscador de productos para combo
											</Label>
											<Input
												id="combo-search"
												value={comboSearch}
												onChange={(e) => setComboSearch(e.target.value)}
												className={inputClass}
												placeholder={comboProductsLoading ? 'Cargando productos…' : 'Buscar producto por nombre'}
											/>
										</div>
										<div className="max-h-44 space-y-2 overflow-y-auto rounded-md border border-[#b8956a]/22 bg-white/30 p-2">
											{comboFilteredProducts.map((p) => (
												<button
													key={p.id}
													type="button"
													onClick={() => addComboItem(p)}
													className="flex w-full items-center justify-between rounded border border-[#b8956a]/18 bg-white/55 px-3 py-2 text-left text-sm hover:bg-white/70"
												>
													<span className="truncate pr-3">{p.name}</span>
													<span className="shrink-0 text-xs text-[#6b6156]">{formatMoneyAR(p.price)}</span>
												</button>
											))}
											{comboFilteredProducts.length === 0 ? (
												<p className="px-2 py-4 text-xs text-[#6b6156]">No hay productos para ese filtro.</p>
											) : null}
										</div>
										<div className="space-y-2">
											<p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6b6156]">Items del combo</p>
											{comboItems.length === 0 ? (
												<p className="text-xs text-[#6b6156]">Todavía no agregaste productos al combo.</p>
											) : (
												comboItems.map((item) => (
													<div key={item.productId} className="grid grid-cols-[1fr_90px_90px_auto] items-center gap-2">
														<p className="truncate text-sm">{item.name}</p>
														<Input
															type="number"
															min={1}
															step={1}
															value={item.qty}
															onChange={(e) => {
																const qty = Math.max(1, Math.floor(parseInt(e.target.value, 10) || 1));
																setComboItems((prev) =>
																	prev.map((x) => (x.productId === item.productId ? { ...x, qty } : x)),
																);
															}}
															className={inputClass}
														/>
														<p className="text-right text-xs text-[#6b6156]">{formatMoneyAR(item.unitPrice * item.qty)}</p>
														<Button
															type="button"
															variant="outline"
															size="sm"
															className="border-[#b8956a]/35 bg-white/40 px-3 text-[#2a2520] hover:bg-[#f5f2ed]"
															onClick={() =>
																setComboItems((prev) => prev.filter((x) => x.productId !== item.productId))
															}
														>
															Quitar
														</Button>
													</div>
												))
											)}
										</div>
										<div className="rounded-md border border-[#b8956a]/22 bg-[#fffdfb]/70 p-3">
											<p className="text-xs uppercase tracking-[0.18em] text-[#6b6156]">Valor total calculado</p>
											<p className="mt-1 text-lg text-[#1a1410]" style={{ fontFamily: serif }}>
												{formatMoneyAR(comboTotal)}
											</p>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="mt-3 border-[#b8956a]/35 bg-white/50 text-[#2a2520] hover:bg-[#f5f2ed]"
												onClick={() => {
													setCostoPrenda(String(Math.round(comboTotal)));
												}}
											>
												Usar este valor como costo de prenda
											</Button>
										</div>
									</div>
								</div>
							) : null}

							<div className="mt-8">
								<Label htmlFor="desc" className={labelClass} style={{ fontFamily: sans }}>
									Descripción
								</Label>
								<Textarea
									id="desc"
									rows={5}
									value={descripcion}
									onChange={(e) => setDescripcion(e.target.value)}
									className={cn(
										inputClass,
										'min-h-[8.5rem] resize-y py-3',
										'focus-visible:border-[#8b6f47]/55 focus-visible:ring-[#b8956a]/25',
									)}
									placeholder="Detalle del producto, combo u oferta…"
								/>
							</div>

							<div className="mt-8 grid gap-5 sm:grid-cols-2">
								<div className="sm:col-span-2">
									{productKind === 'combo' ? (
										<div className="rounded-md border border-[#b8956a]/22 bg-white/35 p-3">
											<p className="text-xs uppercase tracking-[0.18em] text-[#6b6156]">Categoría fija</p>
											<p className="mt-1 text-sm text-[#1a1410]">Combo (sin subcategoría)</p>
										</div>
									) : (
										<>
											<p className="mb-3 text-xs font-light text-[#6b6156]" style={{ fontFamily: sans }}>
												Las opciones salen de{' '}
												<Link href="/app/categorias" className="text-[#8b6f47] underline underline-offset-2">
													Categorías
												</Link>
												{categoriesLoading ? ' (cargando…)' : null}.
											</p>
											<div className="grid gap-5 sm:grid-cols-2">
												<div>
													<Label htmlFor="cat" className={labelClass} style={{ fontFamily: sans }}>
														Categoría
													</Label>
													<select
														id="cat"
														value={categoryId}
														onChange={(e) => {
															setCategoryId(e.target.value);
															setSubcategoryId('');
														}}
														disabled={categoriesLoading || categoryTree.length === 0}
														className={selectClass}
													>
														<option value="">
															{categoriesLoading
																? 'Cargando…'
																: categoryTree.length === 0
																	? 'Sin categorías en la base'
																	: 'Seleccioná'}
														</option>
														{categoryTree.map((c) => (
															<option key={c.id} value={c.id}>
																{c.name}
															</option>
														))}
													</select>
												</div>
												<div>
													<Label htmlFor="subcat" className={labelClass} style={{ fontFamily: sans }}>
														Subcategoría
													</Label>
													<select
														id="subcat"
														value={subcategoryId}
														onChange={(e) => setSubcategoryId(e.target.value)}
														disabled={
															!categoryId ||
															!selectedCategory ||
															selectedCategory.subcategories.length === 0
														}
														className={selectClass}
													>
														<option value="">
															{!categoryId
																? 'Elegí primero una categoría'
																: !selectedCategory?.subcategories.length
																	? 'Sin subcategorías (opcional)'
																	: 'Seleccioná'}
														</option>
														{(selectedCategory?.subcategories ?? []).map((s) => (
															<option key={s.id} value={s.id}>
																{s.name}
															</option>
														))}
													</select>
												</div>
											</div>
										</>
									)}
								</div>
								<div>
									<Label htmlFor="codigo" className={labelClass} style={{ fontFamily: sans }}>
										Código de producto
									</Label>
									<Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={inputClass} />
								</div>
								<div className="hidden sm:block" aria-hidden />
								<div>
									<Label htmlFor="compra-min" className={labelClass} style={{ fontFamily: sans }}>
										Compra mínima
									</Label>
									<Input
										id="compra-min"
										type="number"
										min={0}
										step={1}
										value={compraMinima}
										onChange={(e) => setCompraMinima(e.target.value)}
										className={inputClass}
										placeholder="—"
									/>
								</div>
								<div>
									<Label htmlFor="compra-max" className={labelClass} style={{ fontFamily: sans }}>
										Compra máxima
									</Label>
									<Input
										id="compra-max"
										type="number"
										min={0}
										step={1}
										value={compraMaxima}
										onChange={(e) => setCompraMaxima(e.target.value)}
										className={inputClass}
										placeholder="—"
									/>
								</div>
							</div>
						</section>
					</div>

					<aside className="min-w-0 space-y-6 lg:sticky lg:top-4 lg:self-start">
						<div className={cn('overflow-hidden', innerCard, 'p-0')}>
							<div className="flex items-start justify-between border-b border-[#b8956a]/15 px-4 pt-4">
								<span className="rounded-sm border border-[#b8956a]/25 bg-[#f5f2ed]/80 px-2 py-0.5 text-xs font-medium text-[#5c5349]">
									{codigo || '—'}
								</span>
							</div>
							<div className="relative mx-auto aspect-square max-h-[240px] w-full max-w-[240px] px-4 pt-4">
								<Image
									src={primaryPreview ?? PLACEHOLDER_IMG}
									alt="Vista previa"
									fill
									className="object-contain"
									sizes="240px"
									unoptimized={Boolean(primaryPreview)}
								/>
							</div>
							{imagePreviewUrls.length > 1 ? (
								<div className="flex justify-center gap-1.5 px-4 pb-2">
									{imagePreviewUrls.map((url, i) => (
										<button
											key={url}
											type="button"
											onClick={() => setPreviewImageIndex(i)}
											className={cn(
												'relative h-10 w-10 overflow-hidden rounded border',
												i === previewImageIndex ? 'border-[#8b6f47]' : 'border-[#b8956a]/25',
											)}
											aria-label={`Ver foto ${i + 1}`}
										>
											<Image src={url} alt="" fill className="object-cover" sizes="40px" unoptimized />
										</button>
									))}
								</div>
							) : null}
							<div className="border-t border-[#b8956a]/15 px-4 py-4 text-center">
								<p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b6156]">Stock {stockLabel}</p>
								<p className="mt-2 line-clamp-2 text-sm font-light text-[#1a1410]" style={{ fontFamily: serif }}>
									{nombre.trim() || 'Sin nombre'}
								</p>
								<p className="mt-2 text-base font-light text-[#8b6f47]" style={{ fontFamily: serif }}>
									{formatMoneyAR(precioCalculadoEfectivo)}
								</p>
							</div>
							<div className="space-y-3 border-t border-[#b8956a]/15 p-4">
								<input
									ref={imagesInputRef}
									type="file"
									accept="image/*"
									multiple
									className="hidden"
									onChange={onImagesChange}
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-full border-[#b8956a]/35 bg-white/40 text-[#2a2520] hover:bg-[#f5f2ed]"
									style={{ fontFamily: sans, fontWeight: 400 }}
									onClick={() => imagesInputRef.current?.click()}
									disabled={imageFiles.length >= MAX_IMAGES}
								>
									{imageFiles.length >= MAX_IMAGES
										? `${MAX_IMAGES} fotos cargadas`
										: imageFiles.length
											? `Agregar foto (${imageFiles.length}/${MAX_IMAGES})`
											: `Elegir fotos (máx. ${MAX_IMAGES})`}
								</Button>
								{imageFiles.length > 0 ? (
									<ul className="space-y-2 text-left text-xs text-[#5c5349]">
										{imageFiles.map((f, i) => (
											<li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
												<span className="truncate">{f.name}</span>
												<button
													type="button"
													className="shrink-0 text-[#8b6f47] underline"
													onClick={() => removeImageAt(i)}
												>
													Quitar
												</button>
											</li>
										))}
									</ul>
								) : null}
								<input
									ref={videoRef}
									type="file"
									accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
									className="hidden"
									onChange={onVideoChange}
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-full border-[#b8956a]/35 bg-white/40 text-[#2a2520] hover:bg-[#f5f2ed]"
									style={{ fontFamily: sans, fontWeight: 400 }}
									onClick={() => videoRef.current?.click()}
								>
									{videoFile ? 'Cambiar video' : 'Elegir video (máx. 1)'}
								</Button>
								{videoPreviewUrl ? (
									<video
										src={videoPreviewUrl}
										controls
										className="mt-2 w-full rounded-md border border-[#b8956a]/20 bg-black/80"
										playsInline
									/>
								) : null}
								{remoteImageUrls.length > 0 ? (
									<div className="text-left">
										<Label className={labelClass}>URLs imagen (Supabase)</Label>
										{remoteImageUrls.map((u, i) => (
											<Input key={u} readOnly value={u} className={cn(inputClass, 'mt-1 text-xs')} />
										))}
									</div>
								) : null}
								{remoteVideoUrl ? (
									<div className="text-left">
										<Label className={labelClass}>URL video (Supabase)</Label>
										<Input readOnly value={remoteVideoUrl} className={cn(inputClass, 'mt-1 text-xs')} />
									</div>
								) : null}
								<p className="text-left text-[10px] font-light leading-relaxed text-[#6b6156]" style={{ fontFamily: sans }}>
									Guardar sube archivos a sorjuana y registra el producto en la base (sesión iniciada).
								</p>
							</div>
						</div>
					</aside>
				</div>

				<div className="mt-12 flex flex-wrap items-center justify-end gap-3 border-t border-[#b8956a]/20 pt-8">
					<Button
						type="button"
						variant="outline"
						className="rounded-sm border-[#b8956a]/45 bg-transparent text-[#2a2520] hover:bg-[#b8956a]/10"
						style={{ fontFamily: sans, fontWeight: 400 }}
						asChild
					>
						<Link href="/app/productos">Cancelar</Link>
					</Button>
					<Button
						type="submit"
						disabled={isSubmitting}
						className="rounded-sm border border-[#6b5340]/25 bg-[#1a1410] px-8 text-[#f5f2ed] shadow-md transition hover:bg-[#2a221c] disabled:opacity-60"
						style={{ fontFamily: sans, fontWeight: 500 }}
					>
						{isSubmitting ? 'Guardando…' : 'Guardar'}
					</Button>
				</div>
			</form>
		</div>
	);
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus, Save, RotateCcw, ExternalLink, Crosshair, Trash2, Upload, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSiteHomeConfigAction, saveHeroSlidesAction } from '@/app/actions/siteHomeConfig';
import { fetchAllProductsForPanelAction } from '@/app/actions/products';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
	broadcastHeroSlidesUpdated,
	DEFAULT_HERO_SLIDES,
	type HeroHotspot,
	type HeroSlide,
	readHeroSlidesFromStorage,
} from '@/lib/heroSlidesConfig';
import { productRowToCatalogProduct, type ProductRow } from '@/lib/data/productCatalog';
import { formatPrecioListaAr } from '@/lib/formatPrice';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

function newHotspotId(slideId: number): string {
	return `hero-h-${slideId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyHotspot(slideId: number): HeroHotspot {
	return {
		id: newHotspotId(slideId),
		top: '45%',
		left: '50%',
		productName: 'Prenda',
		price: 0,
		thumbnailSrc: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&h=400&q=80',
	};
}

const HERO_IMG_MAX_BYTES = 2_400_000;
const HERO_IMG_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/** Reduce tamaño para persistencia; devuelve data URL JPEG. */
function fileToHeroDataUrl(file: File, maxSide: number, jpegQuality: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const objUrl = URL.createObjectURL(file);
		const img = new window.Image();
		img.onload = () => {
			URL.revokeObjectURL(objUrl);
			let w = img.naturalWidth;
			let h = img.naturalHeight;
			if (!w || !h) {
				reject(new Error('dimensiones'));
				return;
			}
			if (w > maxSide || h > maxSide) {
				if (w >= h) {
					h = Math.round((h * maxSide) / w);
					w = maxSide;
				} else {
					w = Math.round((w * maxSide) / h);
					h = maxSide;
				}
			}
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('canvas'));
				return;
			}
			ctx.drawImage(img, 0, 0, w, h);
			const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
			resolve(dataUrl);
		};
		img.onerror = () => {
			URL.revokeObjectURL(objUrl);
			reject(new Error('lectura'));
		};
		img.src = objUrl;
	});
}

type PreviewMode = 'desktop' | 'mobile';

function hotspotPosForPreview(h: HeroHotspot, mode: PreviewMode): { top: string; left: string } {
	if (mode === 'mobile') {
		return { top: h.topMobile ?? h.top, left: h.leftMobile ?? h.left };
	}
	return { top: h.top, left: h.left };
}

function filterProductsForHero(rows: ProductRow[] | null, q: string): ProductRow[] {
	if (!rows?.length) return [];
	const t = q.trim().toLowerCase();
	if (!t) return rows;
	return rows.filter((p) => {
		const name = (p.name ?? '').toLowerCase();
		const code = (p.product_code ?? '').trim().toLowerCase();
		return name.includes(t) || code.includes(t);
	});
}

export function MapaPaginaHeroEditor() {
	const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
	const [slideIndex, setSlideIndex] = useState(0);
	const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
	const [placementHotspotId, setPlacementHotspotId] = useState<string | null>(null);
	const fileMainRef = useRef<HTMLInputElement>(null);
	const fileMobileRef = useRef<HTMLInputElement>(null);
	const [catalogRows, setCatalogRows] = useState<ProductRow[] | null>(null);
	const [catalogLoading, setCatalogLoading] = useState(false);
	const [catalogErr, setCatalogErr] = useState<string | null>(null);
	const [catalogSearchByHotspot, setCatalogSearchByHotspot] = useState<Record<string, string>>({});

	const loadCatalog = useCallback(async () => {
		setCatalogLoading(true);
		setCatalogErr(null);
		try {
			const data = await fetchAllProductsForPanelAction();
			setCatalogRows(data);
		} catch {
			setCatalogErr('No se pudo cargar el catálogo.');
			setCatalogRows([]);
		} finally {
			setCatalogLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadCatalog();
	}, [loadCatalog]);

	useEffect(() => {
		void getSiteHomeConfigAction().then((cfg) => {
			if (cfg.heroSlides?.length) {
				setSlides(cfg.heroSlides);
				return;
			}
			const fromLs = readHeroSlidesFromStorage();
			if (fromLs?.length) setSlides(fromLs);
		});
	}, []);

	const slide = slides[slideIndex];
	const hasMobileImage = Boolean(slide?.imageMobile);
	const activePreview: PreviewMode = hasMobileImage && previewMode === 'mobile' ? 'mobile' : 'desktop';

	const updateSlide = useCallback(
		(partial: Partial<HeroSlide>) => {
			setSlides((prev) =>
				prev.map((s, i) => (i === slideIndex ? { ...s, ...partial } : s)),
			);
		},
		[slideIndex],
	);

	const updateHotspot = useCallback(
		(id: string, partial: Partial<HeroHotspot>) => {
			setSlides((prev) =>
				prev.map((s, i) => {
					if (i !== slideIndex) return s;
					return {
						...s,
						hotspots: s.hotspots.map((h) => (h.id === id ? { ...h, ...partial } : h)),
					};
				}),
			);
		},
		[slideIndex],
	);

	const applyCatalogProduct = useCallback(
		(hotspotId: string, p: ProductRow) => {
			const primary = productRowToCatalogProduct(p).image;
			updateHotspot(hotspotId, {
				catalogProductId: p.id,
				productName: p.name,
				price: p.price,
				thumbnailSrc: primary,
			});
			toast.success('Producto aplicado a este punto +');
		},
		[updateHotspot],
	);

	const clearCatalogProduct = useCallback(
		(hotspotId: string) => {
			updateHotspot(hotspotId, { catalogProductId: undefined });
			toast.message('Vínculo con el catálogo quitado (podés seguir editando nombre y miniatura).');
		},
		[updateHotspot],
	);

	useEffect(() => {
		if (!slide?.imageMobile) setPreviewMode('desktop');
	}, [slide?.imageMobile]);

	const clearMobileImage = useCallback(() => {
		setSlides((prev) =>
			prev.map((s, i) => {
				if (i !== slideIndex) return s;
				return {
					...s,
					imageMobile: undefined,
					hotspots: s.hotspots.map(({ topMobile, leftMobile, ...rest }) => rest),
				};
			}),
		);
		setPreviewMode('desktop');
		setPlacementHotspotId(null);
	}, [slideIndex]);

	const addHotspot = useCallback(() => {
		if (!slide) return;
		const h = emptyHotspot(slide.id);
		setSlides((prev) =>
			prev.map((s, i) => (i === slideIndex ? { ...s, hotspots: [...s.hotspots, h] } : s)),
		);
		setPlacementHotspotId(h.id);
		const vista = activePreview === 'mobile' ? 'Vista celular' : 'Vista PC';
		toast.message(`Tocá la vista previa (${vista}) para colocar el +`);
	}, [slide, slideIndex, activePreview]);

	const removeHotspot = useCallback(
		(id: string) => {
			setSlides((prev) =>
				prev.map((s, i) =>
					i === slideIndex ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== id) } : s,
				),
			);
			setPlacementHotspotId((cur) => (cur === id ? null : cur));
		},
		[slideIndex],
	);

	const onPreviewClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!placementHotspotId || !slide) return;
			const el = e.currentTarget;
			const rect = el.getBoundingClientRect();
			const x = ((e.clientX - rect.left) / rect.width) * 100;
			const y = ((e.clientY - rect.top) / rect.height) * 100;
			const left = `${Math.min(99, Math.max(1, x)).toFixed(1)}%`;
			const top = `${Math.min(99, Math.max(1, y)).toFixed(1)}%`;
			if (activePreview === 'mobile' && slide.imageMobile) {
				updateHotspot(placementHotspotId, { topMobile: top, leftMobile: left });
			} else {
				updateHotspot(placementHotspotId, { left, top });
			}
			setPlacementHotspotId(null);
			toast.success(
				activePreview === 'mobile'
					? 'Posición móvil guardada en este borrador'
					: 'Posición escritorio guardada en este borrador',
			);
		},
		[placementHotspotId, slide, updateHotspot, activePreview],
	);

	const previewSrc = useMemo(() => {
		if (!slide) return '';
		if (activePreview === 'mobile' && slide.imageMobile) return slide.imageMobile;
		return slide.image || slide.imageMobile || '';
	}, [slide, activePreview]);

	const onPickHeroImage = useCallback(
		async (file: File | null, field: 'image' | 'imageMobile') => {
			if (!file) return;
			if (!file.type.startsWith('image/')) {
				toast.error('Elegí un archivo de imagen');
				return;
			}
			if (file.size > HERO_IMG_MAX_BYTES) {
				toast.error('La imagen es demasiado grande (máx. ~2,3 MB). Probá otra más liviana.');
				return;
			}
			try {
				const maxSide = field === 'image' ? 2400 : 1600;
				const q = field === 'image' ? 0.86 : 0.82;
				const dataUrl = await fileToHeroDataUrl(file, maxSide, q);
				if (dataUrl.length > 3_000_000) {
					toast.error('Tras comprimir sigue siendo muy grande. Usá una foto más chica.');
					return;
				}
				if (field === 'image') {
					updateSlide({ image: dataUrl });
					toast.success('Imagen principal cargada');
				} else {
					updateSlide({ imageMobile: dataUrl });
					toast.success(
						'Imagen móvil cargada. Usá «Vista celular» para colocar los + en el teléfono.',
					);
				}
			} catch {
				toast.error('No se pudo leer la imagen');
			}
		},
		[updateSlide],
	);

	const save = useCallback(() => {
		void saveHeroSlidesAction(slides).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo guardar el carrusel. Si las imágenes son muy pesadas, probá otras más livianas.');
				return;
			}
			broadcastHeroSlidesUpdated();
			toast.success('Carrusel guardado en el sitio (visible para todos los visitantes).');
		});
	}, [slides]);

	const resetDefaults = useCallback(() => {
		setSlideIndex(0);
		setPreviewMode('desktop');
		setPlacementHotspotId(null);
		setSlides(DEFAULT_HERO_SLIDES);
		void saveHeroSlidesAction(DEFAULT_HERO_SLIDES).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo guardar el predeterminado.');
				return;
			}
			broadcastHeroSlidesUpdated();
			toast.message('Restaurado al contenido por defecto y guardado en el sitio');
		});
	}, []);

	if (!slide) {
		return (
			<p className="text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
				No hay diapositivas.
			</p>
		);
	}

	return (
		<div className="space-y-8">
			<div className="rounded-xl border border-[#b8956a]/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
				<h2
					className="mb-1 text-lg font-light text-[#1a1410] sm:text-xl"
					style={{ fontFamily: serif }}
				>
					Hero del inicio
				</h2>
				<p className="text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
					La vista previa arranca en formato escritorio. Si cargás una imagen móvil, podés alternar Vista PC y
					Vista celular para colocar los + en cada formato. El botón «Ver catálogo» en el sitio no cambia; el
					enlace depende del filtro.
				</p>

				<div className="mt-4 flex flex-wrap gap-2">
					{slides.map((s, i) => (
						<button
							key={s.id}
							type="button"
							onClick={() => {
								setSlideIndex(i);
								setPlacementHotspotId(null);
								setPreviewMode('desktop');
							}}
							className={cn(
								'rounded-full border px-3 py-1.5 text-xs tracking-wide transition',
								i === slideIndex
									? 'border-[#b8956a] bg-[#b8956a]/15 text-[#1a1410]'
									: 'border-[#b8956a]/25 bg-white/80 text-[#6b6156] hover:border-[#b8956a]/45',
							)}
							style={{ fontFamily: sans, fontWeight: 500 }}
						>
							Slide {i + 1}
						</button>
					))}
				</div>
			</div>

			<div className="grid gap-8 lg:grid-cols-2">
				<div className="space-y-4 rounded-xl border border-[#b8956a]/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
					<h3 className="text-sm font-medium uppercase tracking-[0.2em] text-[#8a7a68]" style={{ fontFamily: sans }}>
						Datos del slide
					</h3>
					<div className="space-y-2">
						<Label htmlFor="hero-title" style={{ fontFamily: sans }}>
							Título
						</Label>
						<Input
							id="hero-title"
							value={slide.title}
							onChange={(e) => updateSlide({ title: e.target.value })}
							className="bg-white/90"
							style={{ fontFamily: sans }}
						/>
					</div>
					<div className="space-y-2">
						<Label style={{ fontFamily: sans }}>Imagen principal (escritorio y base)</Label>
						<input
							ref={fileMainRef}
							type="file"
							accept={HERO_IMG_ACCEPT}
							className="sr-only"
							onChange={(e) => {
								const f = e.target.files?.[0] ?? null;
								void onPickHeroImage(f, 'image');
								e.target.value = '';
							}}
						/>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className="border-[#b8956a]/40"
								onClick={() => fileMainRef.current?.click()}
							>
								<Upload className="mr-2 h-4 w-4" />
								Cargar imagen
							</Button>
							{slide.image ? (
								<span className="text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
									{slide.image.startsWith('data:') ? 'Archivo en el borrador' : 'Predeterminada / enlace'}
								</span>
							) : null}
						</div>
					</div>
					<div className="space-y-2">
						<Label style={{ fontFamily: sans }}>Imagen móvil (opcional)</Label>
						<p className="text-xs text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
							Sin imagen móvil, en el teléfono se usa la principal y un solo juego de posiciones +. Si cargás
							una móvil, habilitamos vista previa tipo celular para ajustar los + aparte.
						</p>
						<input
							ref={fileMobileRef}
							type="file"
							accept={HERO_IMG_ACCEPT}
							className="sr-only"
							onChange={(e) => {
								const f = e.target.files?.[0] ?? null;
								void onPickHeroImage(f, 'imageMobile');
								e.target.value = '';
							}}
						/>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className="border-[#b8956a]/40"
								onClick={() => fileMobileRef.current?.click()}
							>
								<Upload className="mr-2 h-4 w-4" />
								Cargar imagen
							</Button>
							{slide.imageMobile ? (
								<>
									<span className="text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
										Móvil cargada
									</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-8 text-xs text-[#6b6156]"
										onClick={clearMobileImage}
									>
										Quitar móvil
									</Button>
								</>
							) : null}
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="hero-filter" style={{ fontFamily: sans }}>
							Filtro del catálogo (enlace «Ver catálogo»)
						</Label>
						<select
							id="hero-filter"
							value={slide.filter}
							onChange={(e) =>
								updateSlide({ filter: e.target.value as HeroSlide['filter'] })
							}
							className="flex h-10 w-full rounded-md border border-input bg-white/90 px-3 py-2 text-sm"
							style={{ fontFamily: sans }}
						>
							<option value="all">Todo el catálogo</option>
							<option value="italiana">Italiana</option>
							<option value="francesa">Francesa</option>
						</select>
					</div>

					<div className="border-t border-[#b8956a]/20 pt-4">
						<div className="mb-3 flex items-center justify-between gap-2">
							<h3 className="text-sm font-medium uppercase tracking-[0.2em] text-[#8a7a68]" style={{ fontFamily: sans }}>
								Puntos +
							</h3>
							<Button type="button" size="sm" variant="outline" onClick={addHotspot} className="border-[#b8956a]/40">
								Añadir prenda
							</Button>
						</div>
						<p className="mb-3 text-xs text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
							Pulsá «Colocar en vista previa» y tocá la imagen. En Vista PC editás escritorio; con imagen
							móvil cargada, en Vista celular editás las posiciones que verá el visitante en el teléfono.
						</p>
						<ul className="space-y-4">
							{slide.hotspots.map((h) => {
								const linkedCatalogRow = h.catalogProductId
									? catalogRows?.find((r) => r.id === h.catalogProductId)
									: undefined;
								const filteredCatalogForH = filterProductsForHero(
									catalogRows,
									catalogSearchByHotspot[h.id] ?? '',
								);
								return (
								<li
									key={h.id}
									className="rounded-lg border border-[#b8956a]/20 bg-[#faf8f7]/80 p-3"
								>
									<div className="mb-2 flex flex-wrap items-center gap-2">
										<Button
											type="button"
											size="sm"
											variant={placementHotspotId === h.id ? 'default' : 'secondary'}
											className={cn(
												placementHotspotId === h.id && 'bg-[#b8956a] text-[#1a1410] hover:bg-[#c9a578]',
											)}
											onClick={() =>
												setPlacementHotspotId((cur) => (cur === h.id ? null : h.id))
											}
										>
											<Crosshair className="mr-1 h-3.5 w-3.5" />
											Colocar en vista previa
										</Button>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											className="text-red-700/80 hover:bg-red-50 hover:text-red-800"
											onClick={() => removeHotspot(h.id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
									<div className="space-y-2">
										<Label className="text-xs">Producto del catálogo (miniatura y datos)</Label>
										{catalogLoading ? (
											<p className="text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
												Cargando productos…
											</p>
										) : catalogErr ? (
											<p className="text-xs text-red-700">{catalogErr}</p>
										) : (
											<>
												<div className="relative">
													<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a7a68]" />
													<Input
														className="h-9 bg-white pl-8 text-sm"
														placeholder="Buscar por nombre o código…"
														value={catalogSearchByHotspot[h.id] ?? ''}
														onChange={(e) =>
															setCatalogSearchByHotspot((prev) => ({
																...prev,
																[h.id]: e.target.value,
															}))
														}
													/>
												</div>
												{h.catalogProductId ? (
													<div className="flex flex-wrap items-center gap-2">
														<span className="text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
															Vinculado
															{linkedCatalogRow?.name ? ` · ${linkedCatalogRow.name}` : ''}
														</span>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															className="h-7 text-xs"
															onClick={() => clearCatalogProduct(h.id)}
														>
															Quitar vínculo
														</Button>
													</div>
												) : null}
												<ul className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-[#b8956a]/20 bg-white/80 p-1.5">
													{filteredCatalogForH.slice(0, 40).map((p) => {
															const cat = productRowToCatalogProduct(p);
															return (
																<li key={p.id}>
																	<button
																		type="button"
																		className={cn(
																			'flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition hover:bg-[#b8956a]/15',
																			h.catalogProductId === p.id && 'bg-[#b8956a]/20',
																		)}
																		onClick={() => applyCatalogProduct(h.id, p)}
																	>
																		<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-[#b8956a]/25">
																			<Image
																				src={cat.image}
																				alt=""
																				fill
																				className="object-cover"
																				unoptimized
																				sizes="40px"
																			/>
																		</div>
																		<span className="min-w-0 flex-1 font-medium text-[#1a1410]">
																			{p.name}
																		</span>
																		<span className="shrink-0 text-[#6b6156]">
																			{formatPrecioListaAr(p.price)}
																		</span>
																	</button>
																</li>
															);
														})}
												</ul>
												{filteredCatalogForH.length > 40 ? (
													<p
														className="text-[0.65rem] text-[#6b6156]"
														style={{ fontFamily: sans, fontWeight: 300 }}
													>
														Refiná la búsqueda para ver más resultados (mostramos hasta 40).
													</p>
												) : null}
											</>
										)}
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1 sm:col-span-2">
											<Label className="text-xs">Nombre</Label>
											<Input
												value={h.productName}
												onChange={(e) => updateHotspot(h.id, { productName: e.target.value })}
												className="h-9 bg-white text-sm"
											/>
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Precio (número)</Label>
											<Input
												type="number"
												min={0}
												step={0.01}
												value={Number.isFinite(h.price) ? h.price : 0}
												onChange={(e) =>
													updateHotspot(h.id, { price: parseFloat(e.target.value) || 0 })
												}
												className="h-9 bg-white text-sm"
											/>
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Miniatura (URL)</Label>
											<p
												className="text-[0.65rem] text-[#6b6156]"
												style={{ fontFamily: sans, fontWeight: 300 }}
											>
												Si elegís un producto arriba, se rellena sola; podés pegar otra URL si hace falta.
											</p>
											<Input
												value={h.thumbnailSrc}
												onChange={(e) => updateHotspot(h.id, { thumbnailSrc: e.target.value })}
												className="h-9 bg-white text-sm"
											/>
										</div>
										<div className="space-y-1 sm:col-span-2">
											<Label className="text-xs">Posición escritorio (Vista PC)</Label>
											<Input readOnly value={`${h.top} · ${h.left}`} className="h-9 bg-white/80 text-xs" />
										</div>
										{hasMobileImage ? (
											<div className="space-y-1 sm:col-span-2">
												<Label className="text-xs">Posición móvil (Vista celular)</Label>
												<Input
													readOnly
													value={
														h.topMobile != null && h.leftMobile != null
															? `${h.topMobile} · ${h.leftMobile}`
															: `Igual que escritorio (${h.top} · ${h.left})`
													}
													className="h-9 bg-white/80 text-xs"
												/>
											</div>
										) : null}
									</div>
								</li>
							);
							})}
						</ul>
					</div>

					<div className="flex flex-wrap gap-2 border-t border-[#b8956a]/20 pt-4">
						<Button type="button" onClick={save} className="bg-[#1a1410] text-[#f5f2ed] hover:bg-[#2a221c]">
							<Save className="mr-2 h-4 w-4" />
							Guardar en el sitio
						</Button>
						<Button type="button" variant="outline" onClick={resetDefaults} className="border-[#b8956a]/40">
							<RotateCcw className="mr-2 h-4 w-4" />
							Restaurar predeterminado
						</Button>
						<Button asChild variant="outline" className="border-[#b8956a]/40">
							<Link href="/" target="_blank" rel="noopener noreferrer">
								<ExternalLink className="mr-2 h-4 w-4" />
								Ver inicio
							</Link>
						</Button>
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<h3 className="text-sm font-medium uppercase tracking-[0.2em] text-[#8a7a68]" style={{ fontFamily: sans }}>
							Vista previa
						</h3>
						<div className="flex flex-wrap items-center gap-2">
							{hasMobileImage ? (
								<div
									className="inline-flex rounded-lg border border-[#b8956a]/30 bg-[#faf8f7] p-0.5"
									role="tablist"
									aria-label="Formato de vista previa"
								>
									<button
										type="button"
										role="tab"
										aria-selected={activePreview === 'desktop'}
										onClick={() => {
											setPreviewMode('desktop');
											setPlacementHotspotId(null);
										}}
										className={cn(
											'rounded-md px-3 py-1.5 text-xs transition',
											activePreview === 'desktop'
												? 'bg-[#1a1410] text-[#f5f2ed]'
												: 'text-[#6b6156] hover:bg-white/80',
										)}
										style={{ fontFamily: sans, fontWeight: 500 }}
									>
										Vista PC
									</button>
									<button
										type="button"
										role="tab"
										aria-selected={activePreview === 'mobile'}
										onClick={() => {
											setPreviewMode('mobile');
											setPlacementHotspotId(null);
										}}
										className={cn(
											'rounded-md px-3 py-1.5 text-xs transition',
											activePreview === 'mobile'
												? 'bg-[#1a1410] text-[#f5f2ed]'
												: 'text-[#6b6156] hover:bg-white/80',
										)}
										style={{ fontFamily: sans, fontWeight: 500 }}
									>
										Vista celular
									</button>
								</div>
							) : (
								<span className="text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
									Solo escritorio (cargá imagen móvil para comparar)
								</span>
							)}
							{placementHotspotId ? (
								<span className="text-xs text-[#b8956a]" style={{ fontFamily: sans }}>
									Tocá la imagen…
								</span>
							) : null}
						</div>
					</div>
					<div
						className={cn(
							'flex justify-center',
							activePreview === 'mobile' && 'rounded-2xl bg-[#e8e3db]/50 py-6',
						)}
					>
						<div
							onClick={placementHotspotId ? onPreviewClick : undefined}
							className={cn(
								'relative w-full overflow-hidden rounded-xl border border-[#b8956a]/30 bg-[#1a1410] shadow-md',
								activePreview === 'desktop' &&
									'aspect-video max-w-4xl lg:max-w-none',
								activePreview === 'mobile' &&
									'aspect-[9/16] max-w-[min(100%,280px)] rounded-[1.35rem] border-[6px] border-[#2a241c] shadow-xl',
								placementHotspotId && 'cursor-crosshair ring-2 ring-[#b8956a]/60',
							)}
						>
							{previewSrc ? (
								<Image
									src={previewSrc}
									alt="Vista previa hero"
									fill
									unoptimized
									className="object-cover"
									sizes="(max-width: 1024px) 100vw, 50vw"
								/>
							) : (
								<div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm text-white/60">
									Usá «Cargar imagen» para la imagen principal
								</div>
							)}
							<div
								className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
								aria-hidden
							/>
							<div className="pointer-events-none absolute inset-0 z-10">
								{slide.hotspots.map((h) => {
									const pos = hotspotPosForPreview(h, activePreview);
									return (
										<div
											key={h.id}
											className={cn(
												'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg',
												activePreview === 'desktop' ? 'h-9 w-9' : 'h-8 w-8',
												placementHotspotId === h.id && 'ring-2 ring-[#b8956a]',
											)}
											style={{ top: pos.top, left: pos.left }}
										>
											<Plus
												className={activePreview === 'desktop' ? 'h-4 w-4' : 'h-3.5 w-3.5'}
												strokeWidth={2.25}
											/>
										</div>
									);
								})}
							</div>
							<div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-4">
								<p
									className="mb-2 text-balance text-white drop-shadow-md"
									style={{
										fontFamily: sans,
										fontWeight: 700,
										fontSize:
											activePreview === 'mobile'
												? 'clamp(0.75rem, 3.5vw, 1rem)'
												: 'clamp(0.85rem, 2.5vw, 1.25rem)',
										letterSpacing: '0.06em',
									}}
								>
									{slide.title}
								</p>
								<span
									className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[0.5rem] font-semibold tracking-[0.12em] text-[#1a1410] opacity-95 sm:text-[0.55rem]"
									style={{ fontFamily: sans }}
								>
									VER CATÁLOGO
								</span>
							</div>
						</div>
					</div>
					<p className="text-xs text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
						Guardá para publicar en el inicio. En el sitio real, escritorio y teléfono usan las imágenes y
						coordenadas que definiste en cada vista.
					</p>
				</div>
			</div>
		</div>
	);
}

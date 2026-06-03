'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus, Save, RotateCcw, ExternalLink, Crosshair, Trash2, Upload, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSiteHomeConfigAction, saveHeroSlidesAction } from '@/app/actions/siteHomeConfig';
import { fetchAllProductsForPanelAction } from '@/app/actions/products';
import { uploadSorjuanaMedia } from '@/app/actions/storage';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
	broadcastHeroSlidesUpdated,
	DEFAULT_HERO_SLIDES,
	HERO_SLIDES_MAX,
	HERO_SLIDES_MIN,
	resizeHeroSlides,
	type HeroHotspot,
	type HeroSlide,
	readHeroSlidesFromStorage,
	writeHeroSlidesToStorage,
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

/** Mismo límite que `uploadSorjuanaMedia` — las URLs ocupan poco en JSON (no data URLs enormes). */
const HERO_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
const HERO_IMG_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

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
	const [dataEditTab, setDataEditTab] = useState<'desktop' | 'mobile'>('desktop');
	/** Qué coordenadas se escriben al hacer clic en la vista previa (PC vs móvil). */
	const [placementTarget, setPlacementTarget] = useState<'desktop' | 'mobile' | null>(null);
	const [placementHotspotId, setPlacementHotspotId] = useState<string | null>(null);
	const fileMainRef = useRef<HTMLInputElement>(null);
	const fileMobileRef = useRef<HTMLInputElement>(null);
	const [catalogRows, setCatalogRows] = useState<ProductRow[] | null>(null);
	const [catalogLoading, setCatalogLoading] = useState(false);
	const [catalogErr, setCatalogErr] = useState<string | null>(null);
	const [catalogSearchByHotspot, setCatalogSearchByHotspot] = useState<Record<string, string>>({});

	/** Misma proporción ancho/alto que la ventana — el hero real ocupa todo el viewport en escritorio. */
	const [viewportAspect, setViewportAspect] = useState(16 / 9);

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
		const sync = () => {
			setViewportAspect(window.innerWidth / Math.max(1, window.innerHeight));
		};
		sync();
		window.addEventListener('resize', sync);
		return () => window.removeEventListener('resize', sync);
	}, []);

	useEffect(() => {
		void getSiteHomeConfigAction().then((cfg) => {
			if (cfg.heroSlides?.length) {
				setSlides(resizeHeroSlides(cfg.heroSlides, cfg.heroSlides.length));
				return;
			}
			const fromLs = readHeroSlidesFromStorage();
			if (fromLs?.length) setSlides(resizeHeroSlides(fromLs, fromLs.length));
		});
	}, []);

	const setSlideCount = useCallback((count: number) => {
		setSlides((prev) => resizeHeroSlides(prev, count));
		setSlideIndex((cur) => Math.min(cur, count - 1));
		setPlacementHotspotId(null);
		setPlacementTarget(null);
		setPreviewMode('desktop');
		setDataEditTab('desktop');
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
		if (!slide?.imageMobile && previewMode === 'mobile') setPreviewMode('desktop');
	}, [slide?.imageMobile, previewMode]);

	useEffect(() => {
		if (!placementHotspotId) setPlacementTarget(null);
	}, [placementHotspotId]);

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
		setDataEditTab('desktop');
		setPlacementHotspotId(null);
		setPlacementTarget(null);
	}, [slideIndex]);

	const addHotspot = useCallback(() => {
		if (!slide) return;
		const h = emptyHotspot(slide.id);
		setSlides((prev) =>
			prev.map((s, i) => (i === slideIndex ? { ...s, hotspots: [...s.hotspots, h] } : s)),
		);
		setPlacementHotspotId(h.id);
		const target: 'desktop' | 'mobile' =
			dataEditTab === 'mobile' && slide.imageMobile ? 'mobile' : 'desktop';
		setPlacementTarget(target);
		if (target === 'mobile') setPreviewMode('mobile');
		else setPreviewMode('desktop');
		const vista = target === 'mobile' ? 'Vista celular' : 'Vista PC';
		toast.message(`Tocá la vista previa (${vista}) para colocar el +`);
	}, [slide, slideIndex, dataEditTab]);

	const removeHotspot = useCallback(
		(id: string) => {
			setSlides((prev) =>
				prev.map((s, i) =>
					i === slideIndex ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== id) } : s,
				),
			);
			setPlacementHotspotId((cur) => (cur === id ? null : cur));
			setPlacementTarget(null);
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
			const target = placementTarget ?? 'desktop';
			if (target === 'mobile' && slide.imageMobile) {
				updateHotspot(placementHotspotId, { topMobile: top, leftMobile: left });
				toast.success('Posición móvil guardada en este borrador');
			} else {
				updateHotspot(placementHotspotId, { left, top });
				toast.success('Posición escritorio guardada en este borrador');
			}
			setPlacementHotspotId(null);
			setPlacementTarget(null);
		},
		[placementHotspotId, placementTarget, slide, updateHotspot],
	);

	const previewSrc = useMemo(() => {
		if (!slide) return '';
		if (activePreview === 'mobile' && slide.imageMobile) return slide.imageMobile;
		return slide.image || slide.imageMobile || '';
	}, [slide, activePreview]);

	/** Alineado con `HeroCarousel`: escritorio usa objectPositionDesktop; móvil usa objectPositionMobile. */
	const previewObjectPosition = useMemo(() => {
		if (!slide) return 'center center';
		if (activePreview === 'mobile') {
			return slide.objectPositionMobile ?? 'center 22%';
		}
		return slide.objectPositionDesktop ?? 'center center';
	}, [slide, activePreview]);

	const onPickHeroImage = useCallback(
		async (file: File | null, field: 'image' | 'imageMobile') => {
			if (!file) return;
			if (!file.type.startsWith('image/')) {
				toast.error('Elegí un archivo de imagen');
				return;
			}
			if (file.size > HERO_UPLOAD_MAX_BYTES) {
				toast.error('La imagen supera 12 MB (límite del almacenamiento).');
				return;
			}
			try {
				const fd = new FormData();
				fd.append('file', file);
				fd.append('kind', 'image');
				const res = await uploadSorjuanaMedia(fd);
				if (!res.ok) {
					toast.error(res.message);
					return;
				}
				if (field === 'image') {
					updateSlide({ image: res.publicUrl });
					toast.success('Imagen escritorio subida; queda guardada al pulsar Guardar en el sitio.');
				} else {
					updateSlide({ imageMobile: res.publicUrl });
					toast.success(
						'Imagen móvil subida. Usá Vista celular para colocar los +; Guardar para publicar.',
					);
				}
			} catch {
				toast.error('No se pudo subir la imagen');
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
			writeHeroSlidesToStorage(slides);
			broadcastHeroSlidesUpdated();
			toast.success('Carrusel guardado en el sitio (visible para todos los visitantes).');
		});
	}, [slides]);

	const resetDefaults = useCallback(() => {
		setSlideIndex(0);
		setPreviewMode('desktop');
		setDataEditTab('desktop');
		setPlacementHotspotId(null);
		setPlacementTarget(null);
		setSlides(DEFAULT_HERO_SLIDES);
		void saveHeroSlidesAction(DEFAULT_HERO_SLIDES).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo guardar el predeterminado.');
				return;
			}
			writeHeroSlidesToStorage(DEFAULT_HERO_SLIDES);
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
					Editá cada slide abajo: primero título y filtro del catálogo; después alterná Escritorio / Móvil para las
					imágenes y encuadres. Los puntos + tienen botón aparte para PC y para celular (solo si hay foto móvil).
					Guardá para publicar.
				</p>

				<div className="mt-4 flex flex-wrap items-end gap-3">
					<div className="space-y-1.5">
						<Label htmlFor="hero-slide-count" style={{ fontFamily: sans }}>
							Slides en el carrusel
						</Label>
						<select
							id="hero-slide-count"
							className="h-10 min-w-[5.5rem] rounded-md border border-[#b8956a]/30 bg-white px-3 text-sm text-[#1a1410]"
							style={{ fontFamily: sans, fontWeight: 400 }}
							value={slides.length}
							onChange={(e) => setSlideCount(Number(e.target.value))}
						>
							{Array.from({ length: HERO_SLIDES_MAX }, (_, i) => i + HERO_SLIDES_MIN).map((n) => (
								<option key={n} value={n}>
									{n} {n === 1 ? 'slide' : 'slides'}
								</option>
							))}
						</select>
					</div>
					<p className="pb-2 text-xs text-[#8a7a68]" style={{ fontFamily: sans, fontWeight: 300 }}>
						Mínimo {HERO_SLIDES_MIN} · máximo {HERO_SLIDES_MAX}
					</p>
				</div>

				<div className="mt-4 flex flex-wrap gap-2">
					{slides.map((s, i) => (
						<button
							key={s.id}
							type="button"
							onClick={() => {
								setSlideIndex(i);
								setPlacementHotspotId(null);
								setPlacementTarget(null);
								setPreviewMode('desktop');
								setDataEditTab('desktop');
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
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h3 className="text-sm font-medium uppercase tracking-[0.2em] text-[#8a7a68]" style={{ fontFamily: sans }}>
							Datos del slide
						</h3>
						<p className="text-xs text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
							Slide {slideIndex + 1} de {slides.length}
						</p>
					</div>

					<div className="space-y-4 rounded-lg border border-[#b8956a]/18 bg-[#faf8f5]/90 p-4">
						<p className="text-xs leading-relaxed text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
							Vale para todas las vistas: título del hero y destino del botón «Ver catálogo».
						</p>
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
							<Label htmlFor="hero-filter" style={{ fontFamily: sans }}>
								Filtro del catálogo («Ver catálogo»)
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
					</div>

					<div className="space-y-2">
						<p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8a7a68]" style={{ fontFamily: sans }}>
							Imagen y encuadre por dispositivo
						</p>
						<Tabs
							value={dataEditTab}
							onValueChange={(v) => {
								const next = v === 'mobile' ? 'mobile' : 'desktop';
								setDataEditTab(next);
								setPlacementHotspotId(null);
								setPlacementTarget(null);
								if (next === 'mobile' && slide.imageMobile) setPreviewMode('mobile');
								else setPreviewMode('desktop');
							}}
							className="w-full"
						>
							<TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-[#b8956a]/28 bg-[#f5f2ed]/90 p-1">
								<TabsTrigger
									value="desktop"
									className="rounded-md px-3 py-2 text-xs data-[state=active]:bg-[#1a1410] data-[state=active]:text-[#f5f2ed]"
									style={{ fontFamily: sans, fontWeight: 600 }}
								>
									Escritorio
								</TabsTrigger>
								<TabsTrigger
									value="mobile"
									className="rounded-md px-3 py-2 text-xs data-[state=active]:bg-[#1a1410] data-[state=active]:text-[#f5f2ed]"
									style={{ fontFamily: sans, fontWeight: 600 }}
								>
									Móvil
								</TabsTrigger>
							</TabsList>
							<TabsContent value="desktop" className="mt-4 space-y-4 outline-none">
								<p className="text-xs leading-relaxed text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
									Imagen horizontal para PC y tablets grandes. Es la única obligatoria.
								</p>
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
										Cargar imagen escritorio
									</Button>
									{slide.image ? (
										<span className="text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
											{slide.image.startsWith('data:')
												? 'Imagen antigua (data URL) — subí de nuevo para que guarde en el almacenamiento'
												: 'Subida o enlace; pulsar Guardar publica en el sitio'}
										</span>
									) : null}
								</div>
								<div className="space-y-2">
									<Label htmlFor="hero-obj-desktop" style={{ fontFamily: sans }}>
										Encuadre escritorio (object-position)
									</Label>
									<Input
										id="hero-obj-desktop"
										value={slide.objectPositionDesktop ?? ''}
										placeholder="center center"
										onChange={(e) =>
											updateSlide({
												objectPositionDesktop: e.target.value.trim() || undefined,
											})
										}
										className="bg-white/90 text-sm"
										style={{ fontFamily: sans }}
									/>
									<p className="text-[0.65rem] leading-snug text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
										Ej.: <code className="rounded bg-black/[0.06] px-1">center 30%</code>,{' '}
										<code className="rounded bg-black/[0.06] px-1">center top</code>. Vacío = centro.
									</p>
								</div>
							</TabsContent>
							<TabsContent value="mobile" className="mt-4 space-y-4 outline-none">
								<p className="text-xs leading-relaxed text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
									Opcional: foto más vertical solo para teléfono. Si no cargás nada, el sitio usa la imagen de
									escritorio y los mismos + que en PC.
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
										Cargar imagen móvil
									</Button>
									{slide.imageMobile ? (
										<>
											<span className="text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
												Lista
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
								<div className="space-y-2">
									<Label htmlFor="hero-obj-mobile" style={{ fontFamily: sans }}>
										Encuadre móvil (object-position)
									</Label>
									<Input
										id="hero-obj-mobile"
										value={slide.objectPositionMobile ?? ''}
										placeholder="center 22%"
										onChange={(e) =>
											updateSlide({
												objectPositionMobile: e.target.value.trim() || undefined,
											})
										}
										className="bg-white/90 text-sm"
										style={{ fontFamily: sans }}
									/>
								</div>
								{!slide.imageMobile ? (
									<div
										className="rounded-md border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-xs text-[#5c4a38]"
										style={{ fontFamily: sans, fontWeight: 400 }}
									>
										Sin foto móvil, los puntos + del celular comparten posición con escritorio. Cargá una imagen
										móvil para poder colocarlos aparte.
									</div>
								) : null}
							</TabsContent>
						</Tabs>
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
						<p className="mb-3 text-xs leading-relaxed text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
							Elegí <strong className="font-semibold text-[#5c5349]">Colocar · Escritorio</strong> o{' '}
							<strong className="font-semibold text-[#5c5349]">Colocar · Móvil</strong>, después tocá la vista
							previa (derecha). Móvil solo si cargaste foto móvil arriba.
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
											variant={
												placementHotspotId === h.id && placementTarget === 'desktop'
													? 'default'
													: 'secondary'
											}
											className={cn(
												placementHotspotId === h.id &&
													placementTarget === 'desktop' &&
													'bg-[#b8956a] text-[#1a1410] hover:bg-[#c9a578]',
											)}
											onClick={() => {
												if (placementHotspotId === h.id && placementTarget === 'desktop') {
													setPlacementHotspotId(null);
													setPlacementTarget(null);
													return;
												}
												setPlacementHotspotId(h.id);
												setPlacementTarget('desktop');
												setPreviewMode('desktop');
											}}
										>
											<Crosshair className="mr-1 h-3.5 w-3.5" />
											Colocar · Escritorio
										</Button>
										<Button
											type="button"
											size="sm"
											variant={
												placementHotspotId === h.id && placementTarget === 'mobile'
													? 'default'
													: 'secondary'
											}
											disabled={!slide.imageMobile}
											title={
												slide.imageMobile
													? 'Colocar en la vista celular'
													: 'Cargá una imagen móvil en la pestaña Móvil'
											}
											className={cn(
												placementHotspotId === h.id &&
													placementTarget === 'mobile' &&
													'bg-[#b8956a] text-[#1a1410] hover:bg-[#c9a578]',
											)}
											onClick={() => {
												if (!slide.imageMobile) return;
												if (placementHotspotId === h.id && placementTarget === 'mobile') {
													setPlacementHotspotId(null);
													setPlacementTarget(null);
													return;
												}
												setPlacementHotspotId(h.id);
												setPlacementTarget('mobile');
												setPreviewMode('mobile');
											}}
										>
											<Crosshair className="mr-1 h-3.5 w-3.5" />
											Colocar · Móvil
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
											setPlacementTarget(null);
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
											setPlacementTarget(null);
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
									Tocá la imagen para{' '}
									{placementTarget === 'mobile' ? 'posición móvil' : 'posición escritorio'}…
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
								activePreview === 'desktop' && 'max-h-[min(85vh,920px)]',
								activePreview === 'mobile' &&
									'aspect-[9/16] max-w-[min(100%,280px)] rounded-[1.35rem] border-[6px] border-[#2a241c] shadow-xl',
								placementHotspotId && 'cursor-crosshair ring-2 ring-[#b8956a]/60',
							)}
							style={
								activePreview === 'desktop'
									? { aspectRatio: viewportAspect }
									: undefined
							}
						>
							{previewSrc ? (
								<Image
									src={previewSrc}
									alt="Vista previa hero"
									fill
									unoptimized
									className="object-cover"
									style={{ objectPosition: previewObjectPosition }}
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

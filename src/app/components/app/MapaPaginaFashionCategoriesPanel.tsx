'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, RotateCcw, Save, Upload } from 'lucide-react';
import { getSiteHomeConfigAction, saveFashionCategoryPanelsAction } from '@/app/actions/siteHomeConfig';
import { uploadSorjuanaMedia } from '@/app/actions/storage';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
	DEFAULT_FASHION_CATEGORY_PANELS,
	FASHION_CATEGORY_PANEL_COUNT,
	type FashionCategoryPanel,
} from '@/lib/fashionCategoryPanelsConfig';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

const HERO_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
const VIDEO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const IMG_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const VID_ACCEPT = 'video/mp4,video/webm,video/quicktime';

const PANEL_LABELS = [
	'Bloque principal (izquierda · ancho inicial)',
	'Segunda franja',
	'Tercera franja',
	'Cuarta franja',
];

export function MapaPaginaFashionCategoriesPanel() {
	const [panels, setPanels] = useState<FashionCategoryPanel[]>(DEFAULT_FASHION_CATEGORY_PANELS);
	const [activeIdx, setActiveIdx] = useState(0);
	const pendingImgIdxRef = useRef<number | null>(null);
	const pendingVidIdxRef = useRef<number | null>(null);
	const imgInputRef = useRef<HTMLInputElement>(null);
	const vidInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		void getSiteHomeConfigAction().then((cfg) => {
			if (cfg.fashionCategoryPanels?.length === FASHION_CATEGORY_PANEL_COUNT) {
				setPanels(cfg.fashionCategoryPanels);
			}
		});
	}, []);

	const updatePanel = useCallback((index: number, partial: Partial<FashionCategoryPanel>) => {
		setPanels((prev) => prev.map((p, i) => (i === index ? { ...p, ...partial } : p)));
	}, []);

	const onPickImage = useCallback(
		async (file: File | null, idx: number | null) => {
			if (idx === null || !file) return;
			if (!file.type.startsWith('image/')) {
				toast.error('Elegí un archivo de imagen');
				return;
			}
			if (file.size > HERO_UPLOAD_MAX_BYTES) {
				toast.error('La imagen supera 12 MB');
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
				updatePanel(idx, { previewImage: res.publicUrl });
				toast.success('Imagen de portada actualizada (guardá para publicar)');
			} catch {
				toast.error('No se pudo subir la imagen');
			}
		},
		[updatePanel],
	);

	const onPickVideo = useCallback(
		async (file: File | null, idx: number | null) => {
			if (idx === null || !file) return;
			if (!file.type.startsWith('video/')) {
				toast.error('Elegí un archivo de video');
				return;
			}
			if (file.size > VIDEO_UPLOAD_MAX_BYTES) {
				toast.error('El video supera 50 MB');
				return;
			}
			try {
				const fd = new FormData();
				fd.append('file', file);
				fd.append('kind', 'video');
				const res = await uploadSorjuanaMedia(fd);
				if (!res.ok) {
					toast.error(res.message);
					return;
				}
				updatePanel(idx, { videoSrc: res.publicUrl });
				toast.success('Video actualizado (guardá para publicar)');
			} catch {
				toast.error('No se pudo subir el video');
			}
		},
		[updatePanel],
	);

	const save = useCallback(() => {
		for (let i = 0; i < panels.length; i++) {
			const p = panels[i]!;
			if (
				!p.title.trim() ||
				!p.country.trim() ||
				!p.href.trim() ||
				!p.videoSrc.trim() ||
				!p.previewImage.trim()
			) {
				toast.error(`Completá todos los campos del panel ${i + 1}`);
				setActiveIdx(i);
				return;
			}
		}
		void saveFashionCategoryPanelsAction(panels).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo guardar');
				return;
			}
			toast.success('Colección guardada en el sitio');
		});
	}, [panels]);

	const resetDefaults = useCallback(() => {
		setPanels(DEFAULT_FASHION_CATEGORY_PANELS);
		setActiveIdx(0);
		void saveFashionCategoryPanelsAction(DEFAULT_FASHION_CATEGORY_PANELS).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo guardar el predeterminado');
				return;
			}
			toast.message('Restaurado al contenido por defecto y guardado');
		});
	}, []);

	const slide = panels[activeIdx];
	if (!slide) return null;

	return (
		<div className="space-y-8">
			<input
				ref={imgInputRef}
				type="file"
				accept={IMG_ACCEPT}
				className="sr-only"
				onChange={(e) => {
					const f = e.target.files?.[0] ?? null;
					const idx = pendingImgIdxRef.current;
					pendingImgIdxRef.current = null;
					void onPickImage(f, idx);
					e.target.value = '';
				}}
			/>
			<input
				ref={vidInputRef}
				type="file"
				accept={VID_ACCEPT}
				className="sr-only"
				onChange={(e) => {
					const f = e.target.files?.[0] ?? null;
					const idx = pendingVidIdxRef.current;
					pendingVidIdxRef.current = null;
					void onPickVideo(f, idx);
					e.target.value = '';
				}}
			/>

			<div className="rounded-xl border border-[#b8956a]/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
				<h2 className="mb-1 text-lg font-light text-[#1a1410] sm:text-xl" style={{ fontFamily: serif }}>
					Franja «Nuestra colección»
				</h2>
				<p className="text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
					Los cuatro bloques horizontales debajo del hero (en escritorio el primero aparece ancho; al pasar el
					mouse cada columna se expande y reproduce el video). Podés pegar URLs o subir archivos al almacenamiento.
				</p>

				<div className="mt-4 flex flex-wrap gap-2">
					{panels.map((_, i) => (
						<button
							key={`tab-p-${i}`}
							type="button"
							onClick={() => setActiveIdx(i)}
							className={cn(
								'rounded-full border px-3 py-1.5 text-xs tracking-wide transition',
								i === activeIdx
									? 'border-[#b8956a] bg-[#b8956a]/15 text-[#1a1410]'
									: 'border-[#b8956a]/25 bg-white/80 text-[#6b6156] hover:border-[#b8956a]/45',
							)}
							style={{ fontFamily: sans, fontWeight: 500 }}
						>
							{i + 1}. {PANEL_LABELS[i]?.replace(/\s*\(.*\)\s*$/, '') ?? `Panel ${i + 1}`}
						</button>
					))}
				</div>
			</div>

			<div className="grid gap-8 lg:grid-cols-2">
				<div className="space-y-4 rounded-xl border border-[#b8956a]/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8a7a68]" style={{ fontFamily: sans }}>
						{PANEL_LABELS[activeIdx]}
					</p>

					<div className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor={`fc-title-${activeIdx}`} style={{ fontFamily: sans }}>
								Título grande (ej. Elegancia italiana)
							</Label>
							<Input
								id={`fc-title-${activeIdx}`}
								value={slide.title}
								onChange={(e) => updatePanel(activeIdx, { title: e.target.value })}
								className="bg-white/90"
								style={{ fontFamily: sans }}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`fc-country-${activeIdx}`} style={{ fontFamily: sans }}>
								Etiqueta superior (ej. ITALIA)
							</Label>
							<Input
								id={`fc-country-${activeIdx}`}
								value={slide.country}
								onChange={(e) => updatePanel(activeIdx, { country: e.target.value })}
								className="bg-white/90"
								style={{ fontFamily: sans }}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`fc-href-${activeIdx}`} style={{ fontFamily: sans }}>
								Enlace al hacer clic
							</Label>
							<Input
								id={`fc-href-${activeIdx}`}
								value={slide.href}
								onChange={(e) => updatePanel(activeIdx, { href: e.target.value })}
								placeholder="/catalogo o https://..."
								className="bg-white/90"
								style={{ fontFamily: sans }}
							/>
						</div>
					</div>

					<div className="border-t border-[#b8956a]/20 pt-4">
						<h3 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#8a7a68]" style={{ fontFamily: sans }}>
							Imagen de portada (franja cerrada / móvil)
						</h3>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className="border-[#b8956a]/40"
								onClick={() => {
									pendingImgIdxRef.current = activeIdx;
									imgInputRef.current?.click();
								}}
							>
								<Upload className="mr-2 h-4 w-4" />
								Subir imagen
							</Button>
						</div>
						<div className="mt-2 space-y-2">
							<Label htmlFor={`fc-img-url-${activeIdx}`} className="text-xs" style={{ fontFamily: sans }}>
								O pegá URL de imagen
							</Label>
							<Input
								id={`fc-img-url-${activeIdx}`}
								value={slide.previewImage}
								onChange={(e) => updatePanel(activeIdx, { previewImage: e.target.value })}
								className="bg-white/90 text-sm"
								style={{ fontFamily: sans }}
							/>
						</div>
					</div>

					<div className="border-t border-[#b8956a]/20 pt-4">
						<h3 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#8a7a68]" style={{ fontFamily: sans }}>
							Video (franja expandida en escritorio)
						</h3>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className="border-[#b8956a]/40"
								onClick={() => {
									pendingVidIdxRef.current = activeIdx;
									vidInputRef.current?.click();
								}}
							>
								<Upload className="mr-2 h-4 w-4" />
								Subir video
							</Button>
						</div>
						<div className="mt-2 space-y-2">
							<Label htmlFor={`fc-vid-url-${activeIdx}`} className="text-xs" style={{ fontFamily: sans }}>
								O pegá URL del video (MP4 / WebM)
							</Label>
							<Input
								id={`fc-vid-url-${activeIdx}`}
								value={slide.videoSrc}
								onChange={(e) => updatePanel(activeIdx, { videoSrc: e.target.value })}
								className="bg-white/90 text-sm"
								style={{ fontFamily: sans }}
							/>
						</div>
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
							<Link href="/#coleccion" target="_blank" rel="noopener noreferrer">
								<ExternalLink className="mr-2 h-4 w-4" />
								Ver sección en el sitio
							</Link>
						</Button>
					</div>
				</div>

				<div className="space-y-3 rounded-xl border border-[#b8956a]/25 bg-[#faf8f7]/90 p-4 sm:p-6">
					<h3 className="text-sm font-medium uppercase tracking-[0.2em] text-[#8a7a68]" style={{ fontFamily: sans }}>
						Vista rápida · panel {activeIdx + 1}
					</h3>
					<div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[#b8956a]/30 bg-[#1a1410] shadow-inner">
						{slide.previewImage ? (
							<Image
								src={slide.previewImage}
								alt=""
								fill
								unoptimized
								className="object-cover"
								sizes="(max-width: 1024px) 100vw, 480px"
							/>
						) : (
							<div className="flex h-full min-h-[160px] items-center justify-center text-sm text-white/50">
								Sin imagen
							</div>
						)}
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
						<div className="absolute bottom-3 left-3 text-white">
							<p className="text-[10px] tracking-[0.2em] text-[#b8956a]" style={{ fontFamily: sans }}>
								{slide.country}
							</p>
							<p className="text-lg" style={{ fontFamily: serif }}>
								{slide.title}
							</p>
						</div>
					</div>
					<p className="text-xs text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
						El video completo solo se ve en la web al expandir la franja (hover en escritorio).
					</p>
				</div>
			</div>
		</div>
	);
}

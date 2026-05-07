'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import { getSiteHomeConfigAction, saveCategorySpotlightRailAction } from '@/app/actions/siteHomeConfig';
import { uploadSorjuanaMedia } from '@/app/actions/storage';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
	defaultHrefForCategorySlug,
	getDefaultCategorySpotlightRail,
	type CategorySpotlightRailItem,
} from '@/lib/categorySpotlightRailConfig';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

const HERO_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;
const IMG_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const MAX_ITEMS = 12;
const MIN_ITEMS = 1;

function blankItem(): CategorySpotlightRailItem {
	const id = `cat-${Date.now().toString(36)}`;
	return {
		slug: id,
		label: 'Nueva categoría',
		imageUrl:
			'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80',
		href: `/catalogo?categoria=${encodeURIComponent(id)}`,
	};
}

export function MapaPaginaCategorySpotlightRailPanel() {
	const [items, setItems] = useState<CategorySpotlightRailItem[]>(getDefaultCategorySpotlightRail);
	const [activeIdx, setActiveIdx] = useState(0);
	const pendingImgIdxRef = useRef<number | null>(null);
	const imgInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		void getSiteHomeConfigAction().then((cfg) => {
			if (cfg.categorySpotlightRail?.length) {
				setItems(cfg.categorySpotlightRail);
			}
		});
	}, []);

	const updateItem = useCallback((index: number, partial: Partial<CategorySpotlightRailItem>) => {
		setItems((prev) => prev.map((p, i) => (i === index ? { ...p, ...partial } : p)));
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
				updateItem(idx, { imageUrl: res.publicUrl });
				toast.success('Imagen actualizada (guardá para publicar)');
			} catch {
				toast.error('No se pudo subir la imagen');
			}
		},
		[updateItem],
	);

	const save = useCallback(() => {
		const slugs = new Set<string>();
		for (let i = 0; i < items.length; i++) {
			const it = items[i]!;
			const slug = it.slug.trim().toLowerCase();
			if (!/^[a-z0-9-]+$/.test(slug)) {
				toast.error(`Slug inválido en fila ${i + 1}: solo minúsculas, números y guiones.`);
				setActiveIdx(i);
				return;
			}
			if (slugs.has(slug)) {
				toast.error('No puede haber dos ítems con el mismo slug.');
				setActiveIdx(i);
				return;
			}
			slugs.add(slug);
			if (!it.label.trim() || !it.imageUrl.trim() || !it.href.trim()) {
				toast.error(`Completá etiqueta, imagen y enlace en la fila ${i + 1}`);
				setActiveIdx(i);
				return;
			}
		}
		const normalized = items.map((it) => ({
			...it,
			slug: it.slug.trim().toLowerCase(),
			label: it.label.trim(),
			imageUrl: it.imageUrl.trim(),
			href: it.href.trim(),
		}));
		void saveCategorySpotlightRailAction(normalized).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo guardar');
				return;
			}
			setItems(normalized);
			toast.success('Categorías guardadas en el sitio');
		});
	}, [items]);

	const resetDefaults = useCallback(() => {
		const d = getDefaultCategorySpotlightRail();
		setItems(d);
		setActiveIdx(0);
		void saveCategorySpotlightRailAction(d).then((res) => {
			if (!res.ok) {
				toast.error(res.message ?? 'No se pudo guardar el predeterminado');
				return;
			}
			toast.message('Restaurado al contenido por defecto y guardado');
		});
	}, []);

	const addItem = useCallback(() => {
		setItems((prev) => {
			if (prev.length >= MAX_ITEMS) {
				toast.message(`Máximo ${MAX_ITEMS} categorías en el carrusel.`);
				return prev;
			}
			const next = [...prev, blankItem()];
			setActiveIdx(next.length - 1);
			return next;
		});
	}, []);

	const removeItem = useCallback((index: number) => {
		setItems((prev) => {
			if (prev.length <= MIN_ITEMS) {
				toast.message('Tiene que quedar al menos una categoría.');
				return prev;
			}
			const next = prev.filter((_, i) => i !== index);
			setActiveIdx((cur) => {
				let n = cur;
				if (cur === index) n = Math.min(cur, next.length - 1);
				else if (cur > index) n = cur - 1;
				return Math.max(0, Math.min(n, next.length - 1));
			});
			return next;
		});
	}, []);

	const slide = items[activeIdx];
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

			<div className="rounded-xl border border-[#b8956a]/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
				<h2 className="mb-1 text-lg font-light text-[#1a1410] sm:text-xl" style={{ fontFamily: serif }}>
					Explorá por categoría
				</h2>
				<p className="text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
					Los círculos bajo la franja de colección. Podés cambiar foto, texto visible y a dónde lleva el clic
					(catálogo filtrado, otra página o enlace externo).
				</p>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					{items.map((it, i) => (
						<button
							key={`${it.slug}-${i}`}
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
							{i + 1}. {it.label.trim() || it.slug}
						</button>
					))}
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="h-8 border-[#b8956a]/40 text-xs"
						onClick={addItem}
						disabled={items.length >= MAX_ITEMS}
					>
						<Plus className="mr-1 h-3.5 w-3.5" />
						Añadir
					</Button>
				</div>
			</div>

			<div className="grid gap-8 lg:grid-cols-2">
				<div className="space-y-4 rounded-xl border border-[#b8956a]/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8a7a68]" style={{ fontFamily: sans }}>
							Ítem {activeIdx + 1} de {items.length}
						</p>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-8 text-red-700/85 hover:bg-red-50"
							onClick={() => removeItem(activeIdx)}
							disabled={items.length <= MIN_ITEMS}
						>
							<Trash2 className="mr-1 h-3.5 w-3.5" />
							Quitar
						</Button>
					</div>

					<div className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor={`csr-slug-${activeIdx}`} style={{ fontFamily: sans }}>
								Slug interno (sin espacios; coincide con filtro de catálogo si usás la misma categoría)
							</Label>
							<Input
								id={`csr-slug-${activeIdx}`}
								value={slide.slug}
								onChange={(e) =>
									updateItem(activeIdx, { slug: e.target.value.trim().toLowerCase() })
								}
								className="bg-white/90 font-mono text-sm"
								style={{ fontFamily: sans }}
								autoComplete="off"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`csr-label-${activeIdx}`} style={{ fontFamily: sans }}>
								Texto debajo del círculo
							</Label>
							<Input
								id={`csr-label-${activeIdx}`}
								value={slide.label}
								onChange={(e) => updateItem(activeIdx, { label: e.target.value })}
								className="bg-white/90"
								style={{ fontFamily: sans }}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`csr-href-${activeIdx}`} style={{ fontFamily: sans }}>
								Enlace al hacer clic
							</Label>
							<Input
								id={`csr-href-${activeIdx}`}
								value={slide.href}
								onChange={(e) => updateItem(activeIdx, { href: e.target.value })}
								placeholder="/catalogo?categoria=remeras"
								className="bg-white/90"
								style={{ fontFamily: sans }}
							/>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 px-2 text-xs text-[#6b6156]"
								onClick={() =>
									updateItem(activeIdx, { href: defaultHrefForCategorySlug(slide.slug) })
								}
							>
								Sugerir enlace según slug
							</Button>
						</div>
					</div>

					<div className="border-t border-[#b8956a]/20 pt-4">
						<h3 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#8a7a68]" style={{ fontFamily: sans }}>
							Imagen del círculo
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
							<Label htmlFor={`csr-img-${activeIdx}`} className="text-xs" style={{ fontFamily: sans }}>
								O pegá URL
							</Label>
							<Input
								id={`csr-img-${activeIdx}`}
								value={slide.imageUrl}
								onChange={(e) => updateItem(activeIdx, { imageUrl: e.target.value })}
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
							<Link href="/" target="_blank" rel="noopener noreferrer">
								<ExternalLink className="mr-2 h-4 w-4" />
								Ver inicio
							</Link>
						</Button>
					</div>
				</div>

				<div className="space-y-3 rounded-xl border border-[#b8956a]/25 bg-[#faf8f7]/90 p-4 sm:p-6">
					<h3 className="text-sm font-medium uppercase tracking-[0.2em] text-[#8a7a68]" style={{ fontFamily: sans }}>
						Vista rápida
					</h3>
					<div className="flex justify-center">
						<div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-[#b8956a]/40 bg-[#f5f2ed] shadow-inner">
							{slide.imageUrl ? (
								<Image
									src={slide.imageUrl}
									alt=""
									fill
									unoptimized
									className="object-cover"
									sizes="112px"
								/>
							) : null}
						</div>
					</div>
					<p className="text-center text-sm font-medium text-[#1a1410]" style={{ fontFamily: sans }}>
						{slide.label}
					</p>
					<p className="text-center text-[11px] text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
						{slide.href}
					</p>
				</div>
			</div>
		</div>
	);
}

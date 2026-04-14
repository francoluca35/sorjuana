'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { insertProductAction } from '@/app/actions/products';
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
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { cn } from '@/app/components/ui/utils';

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

function parseOptionalNonNegInt(raw: string): number | null {
	const t = raw.trim();
	if (!t) return null;
	const n = parseInt(t, 10);
	return Number.isFinite(n) ? Math.max(0, n) : null;
}

export default function ProductForm() {
	const router = useRouter();
	const imagesInputRef = useRef<HTMLInputElement>(null);
	const videoRef = useRef<HTMLInputElement>(null);

	const [productKind, setProductKind] = useState<'producto' | 'combo' | 'ofertas'>('producto');
	const [nombre, setNombre] = useState('');
	const [stock, setStock] = useState('');
	const [sizeRows, setSizeRows] = useState<SizeInventoryRow[]>([]);
	const [costoInicial, setCostoInicial] = useState('');
	const [precioBase, setPrecioBase] = useState('');
	const [impuestoAplica, setImpuestoAplica] = useState<'no' | 'si'>('no');
	const [impuestoPorcentaje, setImpuestoPorcentaje] = useState('21');
	const [descripcion, setDescripcion] = useState('');

	const initCode = useMemo(() => String(2000 + Math.floor(Math.random() * 7000)), []);
	const [codigo, setCodigo] = useState(initCode);
	const [categoria, setCategoria] = useState('');
	const [compraMinima, setCompraMinima] = useState('');
	const [compraMaxima, setCompraMaxima] = useState('');

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

	const precioTotal = useMemo(() => {
		const base = parseMoneyInput(precioBase);
		if (impuestoAplica !== 'si') return Math.round(base);
		const pct = parseFloat(impuestoPorcentaje.replace(',', '.')) || 0;
		return Math.round(base * (1 + Math.max(0, pct) / 100));
	}, [precioBase, impuestoAplica, impuestoPorcentaje]);

	const sizesNormalized = useMemo(() => normalizeSizeInventoryForDb(sizeRows), [sizeRows]);
	const stockTotalComputed =
		sizesNormalized.length > 0
			? sumSizeInventoryQty(sizesNormalized)
			: Math.max(0, Math.floor(parseInt(stock, 10) || 0));

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

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (isSubmitting) return;

		const nameTrim = nombre.trim();
		if (!nameTrim) {
			toast.error('Completá el nombre del producto.');
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

			const basePrice = parseMoneyInput(precioBase);
			const cost = parseMoneyInput(costoInicial);
			const sizesNorm = normalizeSizeInventoryForDb(sizeRows);
			const stockN =
				sizesNorm.length > 0 ? sumSizeInventoryQty(sizesNorm) : Math.max(0, Math.floor(parseInt(stock, 10) || 0));
			const taxPct =
				impuestoAplica === 'si' ? parseFloat(impuestoPorcentaje.replace(',', '.')) || 0 : null;

			const ins = await insertProductAction({
				kind: productKind,
				name: nameTrim,
				stock: stockN,
				cost,
				basePrice,
				price: precioTotal,
				taxApplies: impuestoAplica === 'si',
				taxPercent: taxPct,
				description: descripcion.trim() || null,
				productCode: codigo.trim() || null,
				category: categoria.trim() || null,
				minOrderQty: parseOptionalNonNegInt(compraMinima),
				maxOrderQty: parseOptionalNonNegInt(compraMaxima),
				imageUrls: uploadedImages,
				videoUrl: finalVideoUrl,
				compareAtPrice: null,
				sizeInventory: sizeRows,
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
								<div className="sm:col-span-2">
									<div className={cn(innerCard, 'mt-0')}>
										<SizeInventoryEditor
											rows={sizeRows}
											onChange={setSizeRows}
											disabled={isSubmitting}
											idPrefix="carga"
											totalAccentClassName="text-[#b8956a]"
										/>
										{sizesNormalized.length === 0 ? (
											<div className="mt-5">
												<Label htmlFor="stock" className={labelClass} style={{ fontFamily: sans }}>
													Stock total (solo si no usás talles arriba)
												</Label>
												<Input
													id="stock"
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
										) : (
											<p className="mt-4 text-xs font-light text-[#6b6156]" style={{ fontFamily: sans }}>
												El stock guardado será la suma de los talles ({stockTotalComputed} unidades). Para usar un
												solo número sin talles, quitá todas las filas del listado.
											</p>
										)}
									</div>
								</div>
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
							</div>

							<div className={cn('mt-8', innerCard)}>
								<div className="flex flex-col gap-4">
									<div className="min-w-0 flex-1">
										<Label className={labelClass} style={{ fontFamily: sans }}>
											Precio base
										</Label>
										<Input
											inputMode="decimal"
											value={precioBase}
											onChange={(e) => setPrecioBase(e.target.value)}
											className={cn(inputClass, 'mt-0 bg-white/70')}
											placeholder="0"
										/>
									</div>
									<div>
										<p className={labelClass} style={{ fontFamily: sans }}>
											Impuesto
										</p>
										<RadioGroup
											value={impuestoAplica}
											onValueChange={(v) => setImpuestoAplica(v as 'no' | 'si')}
											className="mt-2 flex flex-wrap gap-6"
										>
											<div className="flex items-center gap-2.5">
												<RadioGroupItem value="no" id="imp-no" className="border-[#8b6f47] text-[#b8956a]" />
												<Label htmlFor="imp-no" className="cursor-pointer text-sm font-light text-[#3d3835]">
													No
												</Label>
											</div>
											<div className="flex items-center gap-2.5">
												<RadioGroupItem value="si" id="imp-si" className="border-[#8b6f47] text-[#b8956a]" />
												<Label htmlFor="imp-si" className="cursor-pointer text-sm font-light text-[#3d3835]">
													Sí
												</Label>
											</div>
										</RadioGroup>
									</div>
									{impuestoAplica === 'si' ? (
										<div className="grid gap-4 sm:grid-cols-2 sm:items-end">
											<div>
												<Label htmlFor="imp-pct" className={labelClass} style={{ fontFamily: sans }}>
													Porcentaje de impuesto (%)
												</Label>
												<Input
													id="imp-pct"
													inputMode="decimal"
													value={impuestoPorcentaje}
													onChange={(e) => setImpuestoPorcentaje(e.target.value)}
													className={cn(inputClass, 'bg-white/70')}
													placeholder="21"
												/>
											</div>
											<div>
												<Label className={labelClass} style={{ fontFamily: sans }}>
													Precio total (calculado)
												</Label>
												<div className="flex h-10 items-center rounded-md border border-[#b8956a]/35 bg-[#fffdfb]/80 px-3 text-sm font-medium text-[#1a1410] backdrop-blur-sm">
													{formatMoneyAR(precioTotal)}
												</div>
											</div>
										</div>
									) : (
										<div>
											<Label className={labelClass} style={{ fontFamily: sans }}>
												Precio total
											</Label>
											<div className="mt-1.5 flex h-10 items-center rounded-md border border-[#b8956a]/35 bg-[#fffdfb]/80 px-3 text-sm font-medium text-[#1a1410] backdrop-blur-sm">
												{formatMoneyAR(precioTotal)}
											</div>
										</div>
									)}
								</div>
							</div>

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
								<div>
									<Label htmlFor="codigo" className={labelClass} style={{ fontFamily: sans }}>
										Código de producto
									</Label>
									<Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={inputClass} />
								</div>
								<div>
									<Label htmlFor="cat" className={labelClass} style={{ fontFamily: sans }}>
										Categoría
									</Label>
									<select id="cat" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={selectClass}>
										<option value="">Seleccioná</option>
										<option value="remeras">Remeras</option>
										<option value="pantalones">Pantalones</option>
										<option value="vestidos">Vestidos</option>
										<option value="abrigos">Abrigos</option>
										<option value="accesorios">Accesorios</option>
									</select>
								</div>
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
									{formatMoneyAR(precioTotal)}
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

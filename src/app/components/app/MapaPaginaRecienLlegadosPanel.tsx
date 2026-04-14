'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Package, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { fetchRecentProductsAction } from '@/app/actions/products';
import { displayCategoryLabel, type ProductRow } from '@/lib/data/productCatalog';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { cn } from '@/app/components/ui/utils';
import {
	RECENT_ARRIVALS_IDS_STORAGE_KEY,
	RECENT_ARRIVALS_MAX,
	broadcastRecentArrivalsSelectionUpdated,
	parseStoredProductIds,
	serializeProductIds,
} from '@/lib/recentArrivalsSelection';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

function formatFecha(iso: string) {
	try {
		return new Date(iso).toLocaleString('es-AR', {
			dateStyle: 'short',
			timeStyle: 'short',
		});
	} catch {
		return iso;
	}
}

export function MapaPaginaRecienLlegadosPanel() {
	const [rows, setRows] = useState<ProductRow[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const load = useCallback(async () => {
		setLoading(true);
		setErr(null);
		try {
			const data = await fetchRecentProductsAction(80);
			setRows(data);
		} catch {
			setErr('No se pudo cargar la lista.');
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		if (typeof window === 'undefined' || !rows) return;
		const raw = localStorage.getItem(RECENT_ARRIVALS_IDS_STORAGE_KEY);
		const parsed = parseStoredProductIds(raw);
		const valid = new Set(rows.map((r) => r.id));
		setSelectedIds(parsed.filter((id) => valid.has(id)));
	}, [rows]);

	function toggleProduct(id: string) {
		setSelectedIds((prev) => {
			if (prev.includes(id)) {
				return prev.filter((x) => x !== id);
			}
			if (prev.length >= RECENT_ARRIVALS_MAX) {
				toast.message(`Solo podés elegir hasta ${RECENT_ARRIVALS_MAX} productos para el inicio.`);
				return prev;
			}
			return [...prev, id];
		});
	}

	function moveSelected(index: number, delta: -1 | 1) {
		setSelectedIds((prev) => {
			const j = index + delta;
			if (j < 0 || j >= prev.length) return prev;
			const next = [...prev];
			const t = next[index]!;
			next[index] = next[j]!;
			next[j] = t;
			return next;
		});
	}

	function saveSelection() {
		if (typeof window === 'undefined') return;
		localStorage.setItem(RECENT_ARRIVALS_IDS_STORAGE_KEY, serializeProductIds(selectedIds));
		broadcastRecentArrivalsSelectionUpdated();
		toast.success('Selección guardada. La home mostrará estos productos en ese orden.');
	}

	function clearSelection() {
		setSelectedIds([]);
		if (typeof window !== 'undefined') {
			localStorage.removeItem(RECENT_ARRIVALS_IDS_STORAGE_KEY);
			broadcastRecentArrivalsSelectionUpdated();
		}
		toast.success('Listo: en el inicio se mostrarán los 6 más recientes por fecha de alta.');
	}

	const selectedRows = selectedIds
		.map((id) => rows?.find((r) => r.id === id))
		.filter((r): r is ProductRow => Boolean(r));

	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-[#b8956a]/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-6">
				<h2
					className="mb-1 text-lg font-light text-[#1a1410] sm:text-xl"
					style={{ fontFamily: serif }}
				>
					Recién llegados
				</h2>
				<p className="text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
					Elegí hasta {RECENT_ARRIVALS_MAX} productos para la sección pública &quot;Recién llegados&quot; del
					inicio. Si no guardás ninguna selección (o la limpiás), se muestran automáticamente los{' '}
					{RECENT_ARRIVALS_MAX} más nuevos por fecha de alta.
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={loading}
						onClick={() => void load()}
						className="border-[#b8956a]/40"
					>
						<RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
						Actualizar lista
					</Button>
					<Button
						type="button"
						size="sm"
						className="bg-[#1a1410] text-[#f5f2ed] hover:bg-[#2a221c]"
						onClick={saveSelection}
						disabled={loading || !rows?.length}
					>
						Guardar selección ({selectedIds.length}/{RECENT_ARRIVALS_MAX})
					</Button>
					<Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={loading}>
						Usar los 6 más recientes (automático)
					</Button>
				</div>
			</div>

			{selectedIds.length > 0 ? (
				<div className="rounded-xl border border-[#b8956a]/20 bg-[#faf8f7]/90 p-4 sm:p-5">
					<p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#6b6156]" style={{ fontFamily: sans }}>
						Orden en la home
					</p>
					<ul className="space-y-2">
						{selectedRows.map((p, idx) => (
							<li
								key={p.id}
								className="flex items-center gap-2 rounded-lg border border-[#b8956a]/15 bg-white/80 px-3 py-2 text-sm text-[#1a1410]"
								style={{ fontFamily: sans }}
							>
								<span className="w-6 shrink-0 text-xs text-[#8a7a68]">{idx + 1}.</span>
								<span className="min-w-0 flex-1 truncate font-light">{p.name}</span>
								<div className="flex shrink-0 gap-0.5">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										disabled={idx === 0}
										aria-label="Subir"
										onClick={() => moveSelected(idx, -1)}
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										disabled={idx === selectedRows.length - 1}
										aria-label="Bajar"
										onClick={() => moveSelected(idx, 1)}
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
								</div>
							</li>
						))}
					</ul>
				</div>
			) : null}

			{err ? (
				<p className="text-sm text-red-800/90" style={{ fontFamily: sans }}>
					{err}
				</p>
			) : null}

			{loading && rows === null ? (
				<p className="text-sm text-[#6b6156]" style={{ fontFamily: sans, fontWeight: 300 }}>
					Cargando productos…
				</p>
			) : null}

			{!loading && rows && rows.length === 0 ? (
				<div
					className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#b8956a]/35 bg-[#faf8f7]/80 px-6 py-16 text-center"
					style={{ fontFamily: sans }}
				>
					<Package className="h-10 w-10 text-[#b8956a]/70" strokeWidth={1.25} />
					<p className="max-w-md text-sm text-[#6b6156]">
						No hay filas en la tabla pública{' '}
						<span className="font-mono text-xs text-[#1a1410]">products</span>. Aplicá la migración en
						Supabase y cargá artículos para verlos acá y en el inicio.
					</p>
				</div>
			) : null}

			{rows && rows.length > 0 ? (
				<div className="overflow-x-auto rounded-xl border border-[#b8956a]/25 bg-white/80 shadow-sm">
					<table className="w-full min-w-[720px] text-left text-sm">
						<thead>
							<tr className="border-b border-[#b8956a]/20 bg-[#faf8f7]/90">
								<th className="w-12 px-3 py-3 font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
									Inicio
								</th>
								<th className="px-4 py-3 font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
									Orden
								</th>
								<th className="px-4 py-3 font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
									Imagen
								</th>
								<th className="px-4 py-3 font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
									Nombre
								</th>
								<th className="px-4 py-3 font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
									Categoría
								</th>
								<th className="px-4 py-3 font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
									Precio
								</th>
								<th className="px-4 py-3 font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
									Alta
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((p, i) => {
								const price = Number(p.price);
								const compare = p.compare_at_price != null ? Number(p.compare_at_price) : null;
								const img =
									p.image_urls?.[0]?.trim() || p.image_url?.trim() || '/Assets/logo-b.png';
								const checked = selectedIds.includes(p.id);
								const atCap = !checked && selectedIds.length >= RECENT_ARRIVALS_MAX;
								return (
									<tr key={p.id} className="border-b border-[#b8956a]/10 last:border-0">
										<td className="px-3 py-3">
											<Checkbox
												checked={checked}
												disabled={atCap}
												onCheckedChange={() => toggleProduct(p.id)}
												aria-label={checked ? 'Quitar del inicio' : 'Mostrar en el inicio'}
											/>
										</td>
										<td className="px-4 py-3 text-[#8a7a68]" style={{ fontFamily: sans }}>
											{i + 1}
										</td>
										<td className="px-4 py-2">
											<div className="relative h-12 w-10 overflow-hidden rounded border border-[#b8956a]/20 bg-[#f5f2ed]">
												<Image
													src={img}
													alt=""
													fill
													unoptimized
													className="object-cover"
													sizes="40px"
												/>
											</div>
										</td>
										<td className="max-w-[220px] px-4 py-3 text-[#1a1410]" style={{ fontFamily: sans }}>
											{p.name}
										</td>
										<td className="px-4 py-3 text-[#6b6156]" style={{ fontFamily: sans }}>
											{displayCategoryLabel(p.category)}
										</td>
										<td className="px-4 py-3 text-[#1a1410]" style={{ fontFamily: sans }}>
											${' '}
											{Number.isFinite(price)
												? price.toLocaleString('es-AR', { maximumFractionDigits: 0 })
												: '—'}
											{compare != null && Number.isFinite(compare) && compare > price ? (
												<span className="ml-2 text-xs text-[#6b6156] line-through">
													${compare.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
												</span>
											) : null}
										</td>
										<td className="whitespace-nowrap px-4 py-3 text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
											{formatFecha(p.created_at)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : null}
		</div>
	);
}

'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { downloadPaymentReceiptPdf } from '@/lib/receipt/paymentReceiptPdf';
import { AppPanel } from '@/app/components/app/AppPanel';
import { VentasOrderActions, VentasOrderStatusBadge } from '@/app/components/app/VentasOrderActions';
import { cn } from '@/app/components/ui/utils';
import { Input } from '@/app/components/ui/input';
import type { SalesOrderRow, SalesOrderStatus } from '@/lib/data/salesOrders';

function orderStatusTone(status: SalesOrderStatus) {
	switch (status) {
		case 'pending':
			return {
				card: 'border-amber-400/80 bg-amber-50/95 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]',
				header: 'border-b border-amber-300/90 bg-amber-100/85',
				lines: 'divide-amber-200/70',
				footer: 'border-t border-amber-300/90 bg-amber-50/90',
				muted: 'text-amber-950/75',
				strong: 'text-amber-950',
				accentSize: 'text-amber-900',
			};
		case 'paid':
			return {
				card: 'border-emerald-500/70 bg-emerald-50/95 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]',
				header: 'border-b border-emerald-300/90 bg-emerald-100/85',
				lines: 'divide-emerald-200/70',
				footer: 'border-t border-emerald-300/90 bg-emerald-50/90',
				muted: 'text-emerald-950/75',
				strong: 'text-emerald-950',
				accentSize: 'text-emerald-900',
			};
		case 'cancelled':
			return {
				card: 'border-red-500/70 bg-red-50/95 shadow-[0_0_0_1px_rgba(239,68,68,0.28)]',
				header: 'border-b border-red-300/90 bg-red-100/85',
				lines: 'divide-red-200/70',
				footer: 'border-t border-red-300/90 bg-red-50/90',
				muted: 'text-red-950/75',
				strong: 'text-red-950',
				accentSize: 'text-red-900',
			};
		default:
			return {
				card: 'border-[#b8956a]/30 bg-white/90 shadow-sm',
				header: 'border-b border-[#1a1410]/8 bg-[#f5f2ed]/80',
				lines: 'divide-[#1a1410]/6',
				footer: 'border-t border-[#1a1410]/8 bg-[#faf8f6]',
				muted: 'text-[#5c5349]',
				strong: 'text-[#1a1410]',
				accentSize: 'text-[#a34963]',
			};
	}
}

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

function formatMoney(n: number) {
	return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SnapshotItem = {
	product_id?: string;
	product_code?: string;
	name?: string;
	size?: string;
	qty?: number;
	unit_price?: number;
	line_total?: number;
};

function parseItems(raw: unknown): SnapshotItem[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((x) => x && typeof x === 'object') as SnapshotItem[];
}

function itemsSearchBlob(items: unknown): string {
	const lines = parseItems(items);
	return lines
		.map((line) => {
			const parts = [
				line.product_code,
				line.name,
				line.size,
				line.qty != null ? String(line.qty) : '',
			].filter(Boolean);
			return parts.join(' ');
		})
		.join(' ');
}

function orderMatchesQuery(o: SalesOrderRow, q: string): boolean {
	const needle = q.trim().toLowerCase();
	if (!needle) return true;
	const blob = [
		o.id,
		o.customer_name,
		o.customer_phone,
		o.customer_locality,
		o.customer_address,
		o.status,
		itemsSearchBlob(o.items),
	].join(' ');
	return blob.toLowerCase().includes(needle);
}

function orderInDateRange(o: SalesOrderRow, fromStr: string, toStr: string): boolean {
	const d = new Date(o.created_at);
	if (fromStr) {
		const from = new Date(`${fromStr}T00:00:00`);
		if (d < from) return false;
	}
	if (toStr) {
		const to = new Date(`${toStr}T23:59:59.999`);
		if (d > to) return false;
	}
	return true;
}

function formatItemsExcel(items: unknown): string {
	const lines = parseItems(items);
	return lines
		.map((line) => {
			const code = line.product_code?.trim() ? `[${line.product_code}] ` : '';
			const size = line.size?.trim() ? ` T.${line.size}` : '';
			return `${code}${line.name ?? '—'}${size} ×${line.qty ?? 0}`;
		})
		.join(' | ');
}

function exportToExcel(orders: SalesOrderRow[]) {
	const rows = orders.map((o) => ({
		ID: o.id,
		Fecha: new Date(o.created_at).toLocaleString('es-AR'),
		Estado: o.status,
		Cliente: o.customer_name,
		Teléfono: o.customer_phone,
		Localidad: o.customer_locality,
		Dirección: o.customer_address,
		Total: Number(o.total_amount) || 0,
		Productos: formatItemsExcel(o.items),
	}));
	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
	const name = `ventas-${new Date().toISOString().slice(0, 10)}.xlsx`;
	XLSX.writeFile(wb, name);
}

type Props = {
	orders: SalesOrderRow[];
};

export function VentasPanel({ orders }: Props) {
	const [query, setQuery] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');

	const filtered = useMemo(() => {
		return orders.filter(
			(o) => orderInDateRange(o, dateFrom, dateTo) && orderMatchesQuery(o, query),
		);
	}, [orders, dateFrom, dateTo, query]);

	return (
		<AppPanel>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<h1 className="text-2xl font-light text-[#1a1410] sm:text-3xl" style={{ fontFamily: serif }}>
					Ventas
				</h1>
				<div className="flex w-full flex-col gap-3 sm:max-w-none sm:flex-1 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
					<div className="relative min-w-[min(100%,16rem)] flex-1 sm:max-w-xs">
						<Search
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7f72]"
							aria-hidden
						/>
						<Input
							type="search"
							placeholder="Buscar cliente, teléfono, producto…"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="h-10 border-[#b8956a]/35 bg-white/90 pl-9 text-[#1a1410] placeholder:text-[#8a7f72]"
							style={{ fontFamily: sans }}
							aria-label="Buscar ventas"
						/>
					</div>
					<div className="flex flex-wrap items-end gap-2">
						<label className="flex flex-col gap-1">
							<span className="text-xs font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
								Desde
							</span>
							<Input
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="h-10 w-[11.5rem] border-[#b8956a]/35 bg-white/90"
								style={{ fontFamily: sans }}
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-xs font-medium text-[#6b6156]" style={{ fontFamily: sans }}>
								Hasta
							</span>
							<Input
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="h-10 w-[11.5rem] border-[#b8956a]/35 bg-white/90"
								style={{ fontFamily: sans }}
							/>
						</label>
					</div>
					<button
						type="button"
						onClick={() => exportToExcel(filtered)}
						disabled={filtered.length === 0}
						className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#b8956a]/50 bg-[#1a1410] px-4 text-sm font-medium text-[#faf8f6] transition hover:bg-[#2a2218] disabled:pointer-events-none disabled:opacity-40"
						style={{ fontFamily: sans }}
					>
						<Download className="size-4 shrink-0" aria-hidden />
						Descargar Excel
					</button>
				</div>
			</div>

			{orders.length === 0 ? (
				<p
					className="rounded-lg border border-[#b8956a]/25 bg-white/80 px-5 py-8 text-center text-sm text-[#6b6156]"
					style={{ fontFamily: sans }}
				>
					Aún no hay ventas registradas.
				</p>
			) : filtered.length === 0 ? (
				<p
					className="rounded-lg border border-[#b8956a]/25 bg-white/80 px-5 py-8 text-center text-sm text-[#6b6156]"
					style={{ fontFamily: sans }}
				>
					No hay ventas que coincidan con la búsqueda o el rango de fechas.
				</p>
			) : (
				<ul className="space-y-5">
					{filtered.map((o) => {
						const lines = parseItems(o.items);
						const when = new Date(o.created_at);
						const tone = orderStatusTone(o.status);
						return (
							<li key={o.id} className={cn('border shadow-sm', tone.card)}>
								<div className={cn('px-4 py-3 sm:px-5', tone.header)}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex min-w-0 flex-wrap items-center gap-2">
											<p className={cn('text-lg', tone.strong)} style={{ fontFamily: serif, fontWeight: 600 }}>
												{o.customer_name}
											</p>
											<VentasOrderStatusBadge status={o.status} />
										</div>
										<time
											className={cn('text-xs tabular-nums', tone.muted)}
											style={{ fontFamily: sans }}
											dateTime={o.created_at}
										>
											{when.toLocaleString('es-AR', {
												dateStyle: 'short',
												timeStyle: 'short',
											})}
										</time>
									</div>
									<p className={cn('mt-1 text-sm', tone.muted)} style={{ fontFamily: sans, fontWeight: 300 }}>
										<span className={cn('font-medium', tone.strong)}>{o.customer_phone}</span>
										{' · '}
										{o.customer_locality}
									</p>
									<p className={cn('mt-0.5 text-sm', tone.muted)} style={{ fontFamily: sans, fontWeight: 300 }}>
										{o.customer_address}
									</p>
								</div>
								<ul className={cn('divide-y px-4 py-2 sm:px-5', tone.lines)}>
									{lines.map((line, idx) => (
										<li key={`${o.id}-${idx}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
											<div className="min-w-0 flex-1" style={{ fontFamily: sans }}>
												<span className={cn('font-medium', tone.strong)}>
													{line.product_code?.trim() ? `[${line.product_code}] ` : null}
													{line.name ?? '—'}
												</span>
												{line.size?.trim() ? (
													<span className={tone.accentSize}> · Talle {line.size}</span>
												) : null}
												<span className={tone.muted}> ×{line.qty ?? 0}</span>
											</div>
											<div className={cn('shrink-0 tabular-nums', tone.strong)} style={{ fontFamily: sans }}>
												{formatMoney(Number(line.line_total) || 0)}
											</div>
										</li>
									))}
								</ul>
								<div
									className={cn(
										'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5',
										tone.footer,
										o.status === 'pending' || o.status === 'paid'
											? 'sm:justify-between'
											: 'sm:justify-end',
									)}
								>
									<div className="flex flex-wrap items-center gap-2">
										{o.status === 'pending' ? <VentasOrderActions orderId={o.id} /> : null}
										{o.status === 'paid' ? (
											<button
												type="button"
												onClick={() => {
													void downloadPaymentReceiptPdf(o)
														.then(() => toast.success('Comprobante descargado.'))
														.catch((err) => {
															console.error(err);
															toast.error('No se pudo generar el comprobante.');
														});
												}}
												className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-700/35 bg-white/90 px-3.5 text-sm font-medium text-emerald-950 shadow-sm transition hover:bg-emerald-100/90"
												style={{ fontFamily: sans }}
											>
												<FileText className="size-4 shrink-0" aria-hidden />
												Comprobante PDF
											</button>
										) : null}
									</div>
									<p className={cn('text-base font-semibold', tone.strong)} style={{ fontFamily: serif }}>
										Total {formatMoney(Number(o.total_amount) || 0)}
									</p>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</AppPanel>
	);
}

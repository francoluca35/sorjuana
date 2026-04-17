import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchSalesReportsData } from '@/lib/data/salesReports';
import { AppPanel } from '@/app/components/app/AppPanel';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

function fmt(n: number) {
	return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtQty(n: number) {
	return n.toLocaleString('es-AR');
}

export async function InformesVentasPage() {
	if (
		!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
		!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
	) {
		redirect('/login');
	}

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect('/login');

	const r = await fetchSalesReportsData(supabase);

	const tableWrap = 'w-full overflow-x-auto rounded-lg border border-[#b8956a]/25 bg-white/80';
	const th = 'border-b border-[#b8956a]/20 bg-[#f5f2ed]/90 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[#5c5349]';
	const td = 'border-b border-[#1a1410]/6 px-3 py-2.5 text-sm text-[#1a1410]';

	return (
		<AppPanel className="mx-auto max-w-5xl min-w-0">
			<header className="mb-8 border-b border-[#b8956a]/20 pb-6">
				<h1 className="text-2xl font-light text-[#1a1410] sm:text-3xl" style={{ fontFamily: serif }}>
					Informes de ventas
				</h1>
				<p className="mt-2 max-w-3xl text-sm text-[#6b6156]" style={{ fontFamily: sans }}>
					Resumen por período (pedidos <strong>pagados</strong>, montos en pesos). La semana son los{' '}
					<strong>últimos 7 días</strong> (calendario Argentina). &quot;Último mes&quot; en lo más vendido ={' '}
					<strong>últimos 30 días</strong>.
				</p>
			</header>

			<section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[
					{ t: 'Ventas del día', v: r.ventasDia, p: r.pedidosDia, sub: 'Hoy (AR)' },
					{ t: 'Ventas de la semana', v: r.ventasSemana, p: r.pedidosSemana, sub: 'Últimos 7 días' },
					{ t: 'Ventas del mes', v: r.ventasMes, p: r.pedidosMes, sub: 'Mes calendario actual' },
					{ t: 'Ventas del año', v: r.ventasAnio, p: r.pedidosAnio, sub: 'Año calendario actual' },
				].map((x) => (
					<div
						key={x.t}
						className="rounded-xl border border-[#b8956a]/30 bg-[#faf8f6]/90 px-4 py-4 shadow-sm"
						style={{ fontFamily: sans }}
					>
						<p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b6f47]">{x.t}</p>
						<p className="mt-2 text-xl font-semibold text-[#1a1410]">{fmt(x.v)}</p>
						<p className="mt-1 text-xs text-[#6b6156]">
							{x.p} {x.p === 1 ? 'pedido' : 'pedidos'} · {x.sub}
						</p>
					</div>
				))}
			</section>

			<section className="mb-10">
				<h2 className="mb-4 text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
					Ventas / ganancias
				</h2>
				<div className="space-y-4 rounded-xl border border-[#b8956a]/25 bg-white/85 p-5 sm:p-6" style={{ fontFamily: sans }}>
					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6156]">Ingresos por ventas pagadas (registrado en pedido)</p>
							<p className="mt-1 text-lg font-semibold text-[#1a1410]">{fmt(r.ingresosTotalesPagados)}</p>
						</div>
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6156]">Costo de lo vendido (Σ costo × unidades vendidas)</p>
							<p className="mt-1 text-lg font-semibold text-[#1a1410]">{fmt(r.costoMercaderiaVendida)}</p>
						</div>
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6156]">Margen bruto sobre vendido</p>
							<p className="mt-1 text-lg font-semibold text-emerald-900">{fmt(r.margenBrutoVendido)}</p>
						</div>
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6156]">Inversión en stock actual (costo × stock)</p>
							<p className="mt-1 text-lg font-semibold text-[#1a1410]">{fmt(r.inversionStockActual)}</p>
						</div>
					</div>

					<div className="border-t border-[#b8956a]/20 pt-4">
						<p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6156]">
							Referencia: ingreso si todo se cobrara a precio transferencia / efectivo o a precio tarjeta (según producto hoy)
						</p>
						<div className="mt-2 grid gap-2 sm:grid-cols-2">
							<p className="text-sm text-[#2a2520]">
								<span className="text-[#6b6156]">Hipótesis efectivo/transfer: </span>
								{fmt(r.ingresoHipoteticoEfectivo)}
							</p>
							<p className="text-sm text-[#2a2520]">
								<span className="text-[#6b6156]">Hipótesis tarjeta (lista): </span>
								{fmt(r.ingresoHipoteticoTarjeta)}
							</p>
						</div>
					</div>

					<div className="rounded-lg border border-[#b8956a]/30 bg-[#f5f2ed]/80 px-4 py-3">
						<p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b6156]">
							Saldo: ingresos acumulados (pagos) − inversión en stock actual
						</p>
						<p
							className={`mt-1 text-xl font-semibold ${r.saldoVentasMenosInversionStock < 0 ? 'text-amber-900' : 'text-emerald-900'}`}
						>
							{fmt(r.saldoVentasMenosInversionStock)}
						</p>
						{r.saldoNegativoPorStock && r.noteSaldo ? (
							<p className="mt-3 text-xs leading-relaxed text-[#5c5349]">{r.noteSaldo}</p>
						) : null}
					</div>
				</div>
			</section>

			<section className="mb-10">
				<h2 className="mb-4 text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
					Lo más vendido (últimos 30 días)
				</h2>
				<div className={tableWrap}>
					<table className="w-full min-w-[420px] border-collapse text-left" style={{ fontFamily: sans }}>
						<thead>
							<tr>
								<th className={th}>Producto</th>
								<th className={th}>Unidades</th>
								<th className={th}>Ventas</th>
							</tr>
						</thead>
						<tbody>
							{r.topMes.length === 0 ? (
								<tr>
									<td colSpan={3} className={`${td} text-center text-[#6b6156]`}>
										Sin datos en el período.
									</td>
								</tr>
							) : (
								r.topMes.map((row) => (
									<tr key={row.productId}>
										<td className={td}>{row.name}</td>
										<td className={`${td} tabular-nums`}>{fmtQty(row.unidades)}</td>
										<td className={`${td} tabular-nums`}>{fmt(row.ventas)}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>

			<section className="mb-10 grid gap-8 lg:grid-cols-2">
				<div>
					<h2 className="text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
						Ventas por categoría
					</h2>
					<p className="mb-4 text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
						Todas las ventas pagadas acumuladas (líneas de pedido).
					</p>
					<div className={tableWrap}>
						<table className="w-full min-w-[320px] border-collapse text-left" style={{ fontFamily: sans }}>
							<thead>
								<tr>
									<th className={th}>Categoría</th>
									<th className={th}>Líneas</th>
									<th className={th}>Importe</th>
								</tr>
							</thead>
							<tbody>
								{r.byCategory.length === 0 ? (
									<tr>
										<td colSpan={3} className={`${td} text-center text-[#6b6156]`}>
											Sin datos.
										</td>
									</tr>
								) : (
									r.byCategory.map((row) => (
										<tr key={row.category}>
											<td className={td}>{row.category}</td>
											<td className={`${td} tabular-nums`}>{fmtQty(row.pedidosLineas)}</td>
											<td className={`${td} tabular-nums`}>{fmt(row.ventas)}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
				<div>
					<h2 className="text-lg font-light text-[#1a1410]" style={{ fontFamily: serif }}>
						Ventas por talle
					</h2>
					<p className="mb-4 text-xs text-[#6b6156]" style={{ fontFamily: sans }}>
						Todas las ventas pagadas acumuladas.
					</p>
					<div className={tableWrap}>
						<table className="w-full min-w-[320px] border-collapse text-left" style={{ fontFamily: sans }}>
							<thead>
								<tr>
									<th className={th}>Talle</th>
									<th className={th}>Unidades</th>
									<th className={th}>Importe</th>
								</tr>
							</thead>
							<tbody>
								{r.bySize.length === 0 ? (
									<tr>
										<td colSpan={3} className={`${td} text-center text-[#6b6156]`}>
											Sin datos.
										</td>
									</tr>
								) : (
									r.bySize.map((row) => (
										<tr key={row.size}>
											<td className={td}>{row.size}</td>
											<td className={`${td} tabular-nums`}>{fmtQty(row.unidades)}</td>
											<td className={`${td} tabular-nums`}>{fmt(row.ventas)}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		</AppPanel>
	);
}

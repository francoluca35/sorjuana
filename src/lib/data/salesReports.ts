import type { SupabaseClient } from '@supabase/supabase-js';

const TZ = 'America/Argentina/Buenos_Aires';

export function toBaYmd(iso: string): string {
	return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

function getLast7DayKeysBa(): string[] {
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	const keys: string[] = [];
	for (let i = 6; i >= 0; i--) {
		const t = Date.now() - i * 86400000;
		keys.push(fmt.format(new Date(t)));
	}
	return keys;
}

function monthPrefixBa(): string {
	return new Date().toLocaleDateString('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).slice(0, 7);
}

function yearPrefixBa(): string {
	return new Date().toLocaleDateString('en-CA', { timeZone: TZ, year: 'numeric' }).slice(0, 4);
}

type OrderRow = {
	created_at: string;
	total_amount: number | string | null;
	items: unknown;
	status: string;
};

export type OrderLineSnap = {
	product_id?: string;
	name?: string;
	size?: string;
	qty?: number;
	line_total?: number;
	unit_price?: number;
};

export function parseOrderLines(raw: unknown): OrderLineSnap[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((x) => x && typeof x === 'object') as OrderLineSnap[];
}

type ProductRow = {
	id: string;
	name: string;
	category: string | null;
	cost: number | string | null;
	price: number | string | null;
	transfer_price: number | string | null;
	final_transfer_price: number | string | null;
	stock: number | string | null;
};

function num(n: unknown, fallback = 0): number {
	const x = Number(n);
	return Number.isFinite(x) ? x : fallback;
}

function effectiveUnitPrice(p: ProductRow): number {
	const ft = num(p.final_transfer_price, NaN);
	const tr = num(p.transfer_price, NaN);
	const list = num(p.price, 0);
	if (Number.isFinite(ft) && ft > 0) return ft;
	if (Number.isFinite(tr) && tr > 0) return tr;
	return list;
}

function cardUnitPrice(p: ProductRow): number {
	return num(p.price, 0);
}

export type SalesReportsData = {
	ventasDia: number;
	ventasSemana: number;
	ventasMes: number;
	ventasAnio: number;
	pedidosDia: number;
	pedidosSemana: number;
	pedidosMes: number;
	pedidosAnio: number;
	byCategory: { category: string; ventas: number; pedidosLineas: number }[];
	bySize: { size: string; ventas: number; unidades: number }[];
	topMes: { productId: string; name: string; unidades: number; ventas: number }[];
	ingresosTotalesPagados: number;
	costoMercaderiaVendida: number;
	margenBrutoVendido: number;
	ingresoHipoteticoEfectivo: number;
	ingresoHipoteticoTarjeta: number;
	inversionStockActual: number;
	saldoVentasMenosInversionStock: number;
	saldoNegativoPorStock: boolean;
	noteSaldo: string;
};

export async function fetchSalesReportsData(supabase: SupabaseClient): Promise<SalesReportsData> {
	const [{ data: ordersData, error: ordersErr }, { data: productsData, error: prodErr }] = await Promise.all([
		supabase.from('sales_orders').select('created_at, total_amount, items, status'),
		supabase.from('products').select('id, name, category, cost, price, transfer_price, final_transfer_price, stock'),
	]);

	if (ordersErr) console.error('fetchSalesReportsData orders', ordersErr.message);
	if (prodErr) console.error('fetchSalesReportsData products', prodErr.message);

	const orders = (ordersData ?? []) as OrderRow[];
	const products = (productsData ?? []) as ProductRow[];
	const productMap = new Map(products.map((p) => [p.id, p]));

	const paid = orders.filter((o) => (o.status ?? 'pending') === 'paid');
	const todayYmd = toBaYmd(new Date().toISOString());
	const weekKeys = new Set(getLast7DayKeysBa());
	const monthP = monthPrefixBa();
	const yearP = yearPrefixBa();

	let ventasDia = 0;
	let pedidosDia = 0;
	let ventasSemana = 0;
	let pedidosSemana = 0;
	let ventasMes = 0;
	let pedidosMes = 0;
	let ventasAnio = 0;
	let pedidosAnio = 0;

	const catMap = new Map<string, { ventas: number; pedidosLineas: number }>();
	const sizeMap = new Map<string, { ventas: number; unidades: number }>();
	const topMonthMap = new Map<string, { name: string; unidades: number; ventas: number }>();

	const now = Date.now();
	const month30 = now - 30 * 86400000;

	let ingresosTotalesPagados = 0;
	let costoMercaderiaVendida = 0;
	let ingresoHipoteticoEfectivo = 0;
	let ingresoHipoteticoTarjeta = 0;

	for (const o of paid) {
		const ymd = toBaYmd(o.created_at);
		const amt = num(o.total_amount, 0);
		ingresosTotalesPagados += amt;

		if (ymd === todayYmd) {
			ventasDia += amt;
			pedidosDia += 1;
		}
		if (weekKeys.has(ymd)) {
			ventasSemana += amt;
			pedidosSemana += 1;
		}
		if (ymd.startsWith(monthP)) {
			ventasMes += amt;
			pedidosMes += 1;
		}
		if (ymd.startsWith(yearP)) {
			ventasAnio += amt;
			pedidosAnio += 1;
		}

		const t = new Date(o.created_at).getTime();
		const inTopMonth = t >= month30;

		const lines = parseOrderLines(o.items);
		for (const line of lines) {
			const pid = line.product_id;
			const qty = Math.max(0, Math.floor(num(line.qty, 0)));
			const lineTotal = num(line.line_total, 0);
			const p = pid ? productMap.get(pid) : undefined;
			const costUnit = p ? num(p.cost, 0) : 0;
			costoMercaderiaVendida += costUnit * qty;
			if (p) {
				ingresoHipoteticoEfectivo += qty * effectiveUnitPrice(p);
				ingresoHipoteticoTarjeta += qty * cardUnitPrice(p);
			} else {
				ingresoHipoteticoTarjeta += lineTotal;
				ingresoHipoteticoEfectivo += lineTotal;
			}

			const cat = (p?.category?.trim() || 'Sin categoría').trim() || 'Sin categoría';
			const c = catMap.get(cat) ?? { ventas: 0, pedidosLineas: 0 };
			c.ventas += lineTotal;
			c.pedidosLineas += 1;
			catMap.set(cat, c);

			const sz = (line.size?.trim() || 'Sin talle').trim() || 'Sin talle';
			const s = sizeMap.get(sz) ?? { ventas: 0, unidades: 0 };
			s.ventas += lineTotal;
			s.unidades += qty;
			sizeMap.set(sz, s);

			if (inTopMonth && pid) {
				const nm = line.name?.trim() || p?.name || '—';
				const tm = topMonthMap.get(pid) ?? { name: nm, unidades: 0, ventas: 0 };
				tm.unidades += qty;
				tm.ventas += lineTotal;
				tm.name = nm;
				topMonthMap.set(pid, tm);
			}
		}
	}

	const margenBrutoVendido = ingresosTotalesPagados - costoMercaderiaVendida;

	let inversionStockActual = 0;
	for (const p of products) {
		const units = Math.max(0, Math.floor(num(p.stock, 0)));
		inversionStockActual += num(p.cost, 0) * units;
	}

	const saldoVentasMenosInversionStock = ingresosTotalesPagados - inversionStockActual;
	const saldoNegativoPorStock = saldoVentasMenosInversionStock < 0;

	const noteSaldo = saldoNegativoPorStock
		? 'Este valor puede ser negativo aunque las ventas vayan bien: restamos a los cobros acumulados el costo de lo que aún tenés en stock (costo × unidades actuales). Si no vendiste todo el inventario, el saldo puede quedar por debajo de cero sin que signifique pérdida en caja: refleja capital en mercadería todavía no liquidada.'
		: '';

	const byCategory = Array.from(catMap.entries())
		.map(([category, v]) => ({ category, ...v }))
		.sort((a, b) => b.ventas - a.ventas);

	const bySize = Array.from(sizeMap.entries())
		.map(([size, v]) => ({ size, ...v }))
		.sort((a, b) => b.unidades - a.unidades);

	const topMes = Array.from(topMonthMap.entries())
		.map(([productId, v]) => ({ productId, ...v }))
		.sort((a, b) => b.unidades - a.unidades)
		.slice(0, 15);

	return {
		ventasDia,
		ventasSemana,
		ventasMes,
		ventasAnio,
		pedidosDia,
		pedidosSemana,
		pedidosMes,
		pedidosAnio,
		byCategory,
		bySize,
		topMes,
		ingresosTotalesPagados,
		costoMercaderiaVendida,
		margenBrutoVendido,
		ingresoHipoteticoEfectivo,
		ingresoHipoteticoTarjeta,
		inversionStockActual,
		saldoVentasMenosInversionStock,
		saldoNegativoPorStock,
		noteSaldo,
	};
}

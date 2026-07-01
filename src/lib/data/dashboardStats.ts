import {
	fetchAllSalesOrdersForReports,
	fetchPaidSalesOrdersForDashboard,
} from '@/lib/firebase/orders';
import {
	fetchProductsStockAndCost,
	fetchProductsStockOnly,
} from '@/lib/firebase/products';

const TZ = 'America/Argentina/Buenos_Aires';

function ymdInTimeZone(d: Date, timeZone: string): string {
	return d.toLocaleDateString('en-CA', { timeZone });
}

export function getLast7DayKeys(): string[] {
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	const keys: string[] = [];
	for (let i = 6; i >= 0; i--) {
		const t = Date.now() - i * 24 * 60 * 60 * 1000;
		keys.push(fmt.format(new Date(t)));
	}
	return keys;
}

function getPrevious7DayKeys(): string[] {
	const fmt = new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	const keys: string[] = [];
	for (let i = 13; i >= 7; i--) {
		const t = Date.now() - i * 24 * 60 * 60 * 1000;
		keys.push(fmt.format(new Date(t)));
	}
	return keys;
}

type OrderRow = {
	created_at: string;
	total_amount: number | string | null;
	grand_total?: number | string | null;
	items: unknown;
	status: string;
};

function orderAmount(o: OrderRow): number {
	const grand = Number(o.grand_total);
	if (Number.isFinite(grand) && grand >= 0) return grand;
	return Number(o.total_amount) || 0;
}

function parseItems(raw: unknown): { product_id?: string; qty?: number }[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((x) => x && typeof x === 'object') as { product_id?: string; qty?: number }[];
}

function orderCost(items: unknown, costById: Map<string, number>): number {
	let c = 0;
	for (const line of parseItems(items)) {
		const id = line.product_id;
		const q = Math.max(0, Math.floor(Number(line.qty) || 0));
		if (!id || q <= 0) continue;
		c += (costById.get(id) ?? 0) * q;
	}
	return c;
}

function pctBadge(current: number, previous: number): string {
	if (previous <= 0 && current <= 0) return '=';
	if (previous <= 0) return '+100%';
	const p = Math.round(((current - previous) / previous) * 100);
	if (p === 0) return '=';
	return `${p > 0 ? '+' : ''}${p}%`;
}

export type DashboardStats = {
	ingresos: number;
	pedidos: number;
	ventasRealizadas: number;
	stock: number;
	sparkIngresos: number[];
	sparkPedidos: number[];
	sparkVentas: number[];
	sparkStock: number[];
	badgeIngresos: string;
	badgePedidos: string;
	badgeVentas: string;
	badgeStock: string;
	weeklyDayLabels: string[];
	dailyVentasCount: number[];
	dailyGanancia: number[];
	weekVsPrevLabel: string;
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
	const [allOrders, paidOrders, stockRows, costRows] = await Promise.all([
		fetchAllSalesOrdersForReports(),
		fetchPaidSalesOrdersForDashboard(),
		fetchProductsStockOnly(),
		fetchProductsStockAndCost(),
	]);

	const costById = new Map<string, number>();
	for (const row of costRows) {
		costById.set(row.id, Math.max(0, Number(row.cost) || 0));
	}

	const ingresos = paidOrders.reduce((s, o) => s + orderAmount(o as OrderRow), 0);
	const pedidos = allOrders.length;
	const ventasRealizadas = paidOrders.length;
	const stock = stockRows.reduce((s, p) => s + Math.max(0, Math.floor(Number(p.stock) || 0)), 0);

	const last7 = getLast7DayKeys();
	const prev7 = getPrevious7DayKeys();
	const setLast = new Set(last7);
	const setPrev = new Set(prev7);

	const zeroFill = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
	const dailyIngresos = { ...zeroFill(last7) };
	const dailyPedidos = { ...zeroFill(last7) };
	const dailyVentas = { ...zeroFill(last7) };
	const dailyGanancia = { ...zeroFill(last7) };

	const ingresosPrev = { ...zeroFill(prev7) };
	const pedidosThis = { ...zeroFill(last7) };
	const pedidosPrev = { ...zeroFill(prev7) };
	const dailyVentasPrev = { ...zeroFill(prev7) };

	for (const o of allOrders as OrderRow[]) {
		const day = ymdInTimeZone(new Date(o.created_at), TZ);
		if (setLast.has(day)) {
			dailyPedidos[day] = (dailyPedidos[day] ?? 0) + 1;
			pedidosThis[day] = (pedidosThis[day] ?? 0) + 1;
		}
		if (setPrev.has(day)) {
			pedidosPrev[day] = (pedidosPrev[day] ?? 0) + 1;
		}
	}

	for (const o of paidOrders as OrderRow[]) {
		const day = ymdInTimeZone(new Date(o.created_at), TZ);
		const amt = orderAmount(o);
		const profit = amt - orderCost(o.items, costById);
		if (setLast.has(day)) {
			dailyIngresos[day] = (dailyIngresos[day] ?? 0) + amt;
			dailyVentas[day] = (dailyVentas[day] ?? 0) + 1;
			dailyGanancia[day] = (dailyGanancia[day] ?? 0) + profit;
		}
		if (setPrev.has(day)) {
			ingresosPrev[day] = (ingresosPrev[day] ?? 0) + amt;
			dailyVentasPrev[day] = (dailyVentasPrev[day] ?? 0) + 1;
		}
	}

	const sumRec = (rec: Record<string, number>, keys: string[]) =>
		keys.reduce((s, k) => s + (rec[k] ?? 0), 0);

	const tIngresos = sumRec(dailyIngresos, last7);
	const pIngresos = sumRec(ingresosPrev, prev7);
	const tPed = sumRec(pedidosThis, last7);
	const pPed = sumRec(pedidosPrev, prev7);
	const tVent = sumRec(dailyVentas, last7);
	const pVent = sumRec(dailyVentasPrev, prev7);

	const weeklyDayLabels = last7.map((ymd) =>
		new Intl.DateTimeFormat('es-AR', { timeZone: TZ, weekday: 'short' }).format(new Date(`${ymd}T15:00:00-03:00`)),
	);

	return {
		ingresos,
		pedidos,
		ventasRealizadas,
		stock,
		sparkIngresos: last7.map((k) => dailyIngresos[k] ?? 0),
		sparkPedidos: last7.map((k) => dailyPedidos[k] ?? 0),
		sparkVentas: last7.map((k) => dailyVentas[k] ?? 0),
		sparkStock: last7.map(() => stock),
		badgeIngresos: pctBadge(tIngresos, pIngresos),
		badgePedidos: pctBadge(tPed, pPed),
		badgeVentas: pctBadge(tVent, pVent),
		badgeStock: '=',
		weeklyDayLabels,
		dailyVentasCount: last7.map((k) => dailyVentas[k] ?? 0),
		dailyGanancia: last7.map((k) => dailyGanancia[k] ?? 0),
		weekVsPrevLabel: 'Últimos 7 días vs. 7 anteriores',
	};
}

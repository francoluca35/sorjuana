import type { SizeInventoryRow } from '@/lib/data/productSizes';
import { COLLECTIONS, getAdminDb } from '@/lib/firebase/admin';

export type CheckoutPaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta';

export type CheckoutItemOut = {
	product_id: string;
	product_code: string;
	name: string;
	size: string;
	qty: number;
	unit_price: number;
	line_total: number;
};

export type CheckoutOrderMeta = {
	payment_method: CheckoutPaymentMethod;
	shipping_postal_code?: string;
	shipping_cost_ars?: number;
};

function sumSizeInventoryQty(inv: SizeInventoryRow[]): number {
	return inv.reduce((s, r) => s + Math.max(0, Math.floor(Number(r.qty) || 0)), 0);
}

function assertSizeInventoryAvailable(
	inv: SizeInventoryRow[],
	size: string,
	reqQty: number,
	productName: string,
): void {
	const sz = size.trim();
	if (!sz) throw new Error(`Falta talle: ${productName}`);

	let found = false;
	for (const e of inv) {
		if (String(e.size).trim() === sz) {
			found = true;
			const available = Math.floor(Number(e.qty) || 0);
			if (available < reqQty) throw new Error(`Stock insuficiente: ${productName} (${sz})`);
			return;
		}
	}

	if (!found) throw new Error(`Talle no disponible: ${sz}`);
}

function deductSizeInventory(
	inv: SizeInventoryRow[],
	size: string,
	reqQty: number,
	productName: string,
): SizeInventoryRow[] {
	const sz = size.trim();
	if (!sz) throw new Error(`Falta talle: ${productName}`);

	let found = false;
	const next = inv.map((e) => {
		if (String(e.size).trim() === sz) {
			found = true;
			const newQty = Math.floor(Number(e.qty) || 0) - reqQty;
			if (newQty < 0) throw new Error(`Stock insuficiente: ${productName} (${sz})`);
			return { size: e.size, qty: newQty };
		}
		return e;
	});

	if (!found) throw new Error(`Talle no disponible: ${sz}`);
	return next;
}

function restoreSizeInventory(
	inv: SizeInventoryRow[],
	size: string,
	reqQty: number,
): SizeInventoryRow[] {
	const sz = size.trim();
	if (!sz) throw new Error('Datos de talle inconsistentes en el pedido');

	let found = false;
	const next = inv.map((e) => {
		if (String(e.size).trim() === sz) {
			found = true;
			return { size: e.size, qty: Math.floor(Number(e.qty) || 0) + reqQty };
		}
		return e;
	});

	if (!found) {
		next.push({ size: sz, qty: reqQty });
	}
	return next;
}

type OrderLine = {
	product_id?: string;
	size?: string;
	qty?: number;
};

function stockWasDeductedAtCheckout(order: Record<string, unknown>): boolean {
	return order.stock_deducted_at_checkout !== false;
}

async function deductStockForLines(
	tx: FirebaseFirestore.Transaction,
	db: FirebaseFirestore.Firestore,
	lines: OrderLine[],
): Promise<void> {
	for (const line of lines) {
		const productId = String(line.product_id ?? '').trim();
		const reqQty = Math.max(1, Math.floor(Number(line.qty) || 0));
		const sz = String(line.size ?? '').trim();

		if (!productId) throw new Error('Producto inválido en el pedido');

		const ref = db.collection(COLLECTIONS.products).doc(productId);
		const snap = await tx.get(ref);
		if (!snap.exists) throw new Error('Producto no encontrado');

		const prod = snap.data()!;
		const productName = String(prod.name ?? 'Producto');
		const sizeInv = Array.isArray(prod.size_inventory) ? (prod.size_inventory as SizeInventoryRow[]) : [];

		if (sizeInv.length > 0) {
			const newInv = deductSizeInventory(sizeInv, sz, reqQty, productName);
			tx.update(ref, {
				size_inventory: newInv,
				stock: sumSizeInventoryQty(newInv),
			});
		} else {
			const stock = Math.floor(Number(prod.stock) || 0);
			if (stock < reqQty) throw new Error(`Stock insuficiente: ${productName}`);
			tx.update(ref, { stock: stock - reqQty });
		}
	}
}

async function restoreStockForLines(
	tx: FirebaseFirestore.Transaction,
	db: FirebaseFirestore.Firestore,
	lines: OrderLine[],
): Promise<void> {
	for (const line of lines) {
		const productId = String(line.product_id ?? '').trim();
		const reqQty = Math.max(1, Math.floor(Number(line.qty) || 0));
		const sz = String(line.size ?? '').trim();

		const prodRef = db.collection(COLLECTIONS.products).doc(productId);
		const prodSnap = await tx.get(prodRef);
		if (!prodSnap.exists) throw new Error('Producto no encontrado en catálogo');

		const prod = prodSnap.data()!;
		const sizeInv = Array.isArray(prod.size_inventory) ? (prod.size_inventory as SizeInventoryRow[]) : [];

		if (sizeInv.length > 0) {
			const newInv = restoreSizeInventory(sizeInv, sz, reqQty);
			tx.update(prodRef, {
				size_inventory: newInv,
				stock: sumSizeInventoryQty(newInv),
			});
		} else {
			const stock = Math.floor(Number(prod.stock) || 0);
			tx.update(prodRef, { stock: stock + reqQty });
		}
	}
}

export async function checkoutReserve(
	customer: {
		name: string;
		phone: string;
		locality: string;
		address: string;
	},
	items: CheckoutItemOut[],
	meta: CheckoutOrderMeta,
): Promise<{ ok: true; order_id: string; total: number; items: CheckoutItemOut[] }> {
	if (!items.length) throw new Error('Carrito vacío');

	const name = customer.name.trim();
	const phone = customer.phone.trim();
	const locality = customer.locality.trim();
	const address = customer.address.trim();

	if (name.length < 2 || phone.length < 6 || locality.length < 2 || address.length < 4) {
		throw new Error('Completá todos los datos de contacto.');
	}

	const db = getAdminDb();
	const orderId = crypto.randomUUID();
	const shippingCost =
		meta.shipping_cost_ars != null && meta.shipping_cost_ars >= 0
			? Math.round(meta.shipping_cost_ars)
			: null;
	const shippingCp = meta.shipping_postal_code?.trim() || null;
	const productsTotal = items.reduce((sum, line) => sum + line.line_total, 0);
	const grandTotal = productsTotal + (shippingCost ?? 0);

	await db.runTransaction(async (tx) => {
		for (const line of items) {
			const productId = String(line.product_id ?? '').trim();
			const reqQty = Math.max(1, Math.floor(Number(line.qty) || 0));
			const sz = line.size?.trim() ?? '';

			if (!productId) throw new Error('Producto inválido');

			const ref = db.collection(COLLECTIONS.products).doc(productId);
			const snap = await tx.get(ref);
			if (!snap.exists) throw new Error('Producto no encontrado');

			const prod = snap.data()!;
			const productName = String(prod.name ?? 'Producto');
			const sizeInv = Array.isArray(prod.size_inventory) ? (prod.size_inventory as SizeInventoryRow[]) : [];

			if (sizeInv.length > 0) {
				assertSizeInventoryAvailable(sizeInv, sz, reqQty, productName);
			} else {
				const stock = Math.floor(Number(prod.stock) || 0);
				if (stock < reqQty) throw new Error(`Stock insuficiente: ${productName}`);
			}
		}

		const orderRef = db.collection(COLLECTIONS.salesOrders).doc(orderId);
		tx.set(orderRef, {
			created_at: new Date().toISOString(),
			customer_name: name,
			customer_phone: phone,
			customer_locality: locality,
			customer_address: address,
			items,
			total_amount: productsTotal,
			grand_total: grandTotal,
			shipping_postal_code: shippingCp,
			shipping_cost_ars: shippingCost,
			payment_method: meta.payment_method,
			status: 'pending',
			stock_deducted_at_checkout: false,
			stock_deducted: false,
		});
	});

	return { ok: true, order_id: orderId, total: productsTotal, items };
}

export async function markSalesOrderPaid(orderId: string): Promise<void> {
	const db = getAdminDb();
	const ref = db.collection(COLLECTIONS.salesOrders).doc(orderId);

	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		if (!snap.exists) throw new Error('Pedido no encontrado o ya procesado');

		const ord = snap.data()!;
		const status = String(ord.status ?? '');
		if (status !== 'pending') throw new Error('Pedido no encontrado o ya procesado');

		const lines = Array.isArray(ord.items) ? ord.items : [];
		const alreadyDeducted = ord.stock_deducted === true;
		const legacyCheckoutDeduction = stockWasDeductedAtCheckout(ord);

		if (!alreadyDeducted && !legacyCheckoutDeduction) {
			await deductStockForLines(tx, db, lines);
		}

		tx.update(ref, {
			status: 'paid',
			paid_at: new Date().toISOString(),
			stock_deducted: true,
		});
	});
}

export async function cancelSalesOrderRestoreStock(orderId: string): Promise<void> {
	const db = getAdminDb();
	const orderRef = db.collection(COLLECTIONS.salesOrders).doc(orderId);

	await db.runTransaction(async (tx) => {
		const orderSnap = await tx.get(orderRef);
		if (!orderSnap.exists) throw new Error('Pedido no encontrado');

		const ord = orderSnap.data()!;
		if (String(ord.status) !== 'pending') throw new Error('El pedido ya fue procesado');

		const lines = Array.isArray(ord.items) ? ord.items : [];
		const shouldRestore =
			ord.stock_deducted === true || stockWasDeductedAtCheckout(ord);

		if (shouldRestore) {
			await restoreStockForLines(tx, db, lines);
		}

		tx.update(orderRef, { status: 'cancelled' });
	});
}

export async function fetchSalesOrderItems(orderId: string): Promise<unknown | null> {
	const snap = await getAdminDb().collection(COLLECTIONS.salesOrders).doc(orderId).get();
	if (!snap.exists) return null;
	return snap.data()?.items ?? null;
}

export async function fetchSalesOrders(limit = 100) {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.salesOrders)
		.orderBy('created_at', 'desc')
		.limit(limit)
		.get();

	return snap.docs.map((d) => {
		const data = d.data();
		const totalAmount = Number(data.total_amount) || 0;
		const grandTotal =
			data.grand_total != null ? Number(data.grand_total) || totalAmount : totalAmount;
		const rawStatus = String(data.status ?? 'pending').trim().toLowerCase();
		const status: 'pending' | 'paid' | 'cancelled' =
			rawStatus === 'paid' || rawStatus === 'cancelled' || rawStatus === 'pending'
				? rawStatus
				: 'pending';

		return {
			id: d.id,
			created_at: String(data.created_at ?? ''),
			customer_name: String(data.customer_name ?? ''),
			customer_phone: String(data.customer_phone ?? ''),
			customer_locality: String(data.customer_locality ?? ''),
			customer_address: String(data.customer_address ?? ''),
			items: data.items ?? [],
			total_amount: totalAmount,
			grand_total: grandTotal,
			shipping_postal_code: data.shipping_postal_code != null ? String(data.shipping_postal_code) : null,
			shipping_cost_ars: data.shipping_cost_ars != null ? Number(data.shipping_cost_ars) : null,
			payment_method:
				data.payment_method != null
					? (String(data.payment_method) as CheckoutPaymentMethod)
					: null,
			status,
			paid_at: data.paid_at != null ? String(data.paid_at) : null,
		};
	});
}

export async function fetchAllSalesOrdersForReports() {
	const snap = await getAdminDb().collection(COLLECTIONS.salesOrders).orderBy('created_at', 'desc').get();
	return snap.docs.map((d) => {
		const data = d.data();
		return {
			created_at: String(data.created_at ?? ''),
			total_amount: data.total_amount ?? 0,
			grand_total: data.grand_total ?? data.total_amount ?? 0,
			items: data.items ?? [],
			status: String(data.status ?? 'pending'),
		};
	});
}

export async function fetchPaidSalesOrdersForDashboard() {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.salesOrders)
		.where('status', '==', 'paid')
		.get();
	return snap.docs.map((d) => {
		const data = d.data();
		return {
			created_at: String(data.created_at ?? ''),
			total_amount: data.total_amount ?? 0,
			grand_total: data.grand_total ?? data.total_amount ?? 0,
			items: data.items ?? [],
			status: 'paid' as const,
		};
	});
}

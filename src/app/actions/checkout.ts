'use server';

import { revalidatePath } from 'next/cache';
import { checkoutReserve, type CheckoutItemOut } from '@/lib/firebase/orders';
import { siteWhatsAppUrl } from '@/app/config/contact';

export type CheckoutLineInput = {
	productId: string;
	size?: string | null;
	qty: number;
};

export type CheckoutPaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta';

export type CheckoutDisplayLineInput = {
	productId: string;
	productCode?: string | null;
	name: string;
	size?: string | null;
	qty: number;
	discountedUnitPrice: number;
	listUnitPrice: number;
};

export type CheckoutCustomerInput = {
	name: string;
	phone: string;
	locality: string;
	address: string;
	shippingPostalCode?: string;
	shippingCostArs?: number;
};

function formatMoney(n: number) {
	return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatOrderRef(orderId: string) {
	return orderId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function buildWhatsAppUrl(args: {
	orderId: string;
	customerName: string;
	customerPhone: string;
	customerLocality: string;
	customerAddress: string;
	paymentMethod: CheckoutPaymentMethod;
	items: {
		product_code: string;
		name: string;
		size: string;
		qty: number;
		unit_price: number;
		line_total: number;
	}[];
	total: number;
	shippingPostalCode?: string;
	shippingCostArs?: number;
}) {
	const paymentMethodLabel =
		args.paymentMethod === 'tarjeta'
			? 'Tarjeta'
			: args.paymentMethod === 'transferencia'
				? 'Transferencia'
				: 'Efectivo';

	const lines = args.items.map((l) => {
		const code = l.product_code?.trim() ? ` [${l.product_code}]` : '';
		const talla = l.size?.trim() ? ` — Talle: ${l.size}` : '';
		return `•${code} ${l.name}${talla} ×${l.qty} — ${formatMoney(l.unit_price)} c/u → ${formatMoney(l.line_total)}`;
	});

	const shippingLine =
		args.shippingCostArs != null &&
		args.shippingCostArs >= 0 &&
		args.shippingPostalCode?.trim()
			? `\nEnvío estimado (CP ${args.shippingPostalCode.trim()}): ${formatMoney(args.shippingCostArs)}`
			: '';

	const grandTotal =
		args.total + (args.shippingCostArs != null && args.shippingCostArs >= 0 ? args.shippingCostArs : 0);

	const body = `Hola, soy ${args.customerName.trim()}. Quiero confirmar este pedido:

Ref. pedido: #${formatOrderRef(args.orderId)}

Datos de contacto:
• Teléfono: ${args.customerPhone.trim()}
• Localidad: ${args.customerLocality.trim()}
• Dirección: ${args.customerAddress.trim()}

Productos:
${lines.join('\n')}

Método de pago: ${paymentMethodLabel}

Subtotal productos: ${formatMoney(args.total)}${shippingLine}

Total: ${formatMoney(grandTotal)}

Envío el comprobante de pago cuando lo realice. Gracias.`;

	let phone = '5491159795700';
	try {
		const u = new URL(
			siteWhatsAppUrl.startsWith('http') ? siteWhatsAppUrl : `https://${siteWhatsAppUrl}`,
		);
		phone = u.pathname.replace(/^\//, '').split('/')[0] || u.hostname || phone;
	} catch {
		/* ignore */
	}
	return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
}

function buildPricedItems(
	lines: CheckoutLineInput[],
	displayLines: CheckoutDisplayLineInput[],
	paymentMethod: CheckoutPaymentMethod,
): CheckoutItemOut[] {
	const displayByKey = new Map<string, CheckoutDisplayLineInput>();
	for (const line of displayLines) {
		const key = `${line.productId}__${String(line.size ?? '').trim()}`;
		displayByKey.set(key, line);
	}

	return lines.map((line) => {
		const productId = String(line.productId ?? '').trim();
		const size = String(line.size ?? '').trim();
		const qty = Math.max(1, Math.floor(Number(line.qty) || 0));
		const display = displayByKey.get(`${productId}__${size}`);

		const discountedUnitPrice = Math.max(0, Number(display?.discountedUnitPrice) || 0);
		const listUnitPrice = Math.max(0, Number(display?.listUnitPrice) || 0);
		const unitPrice =
			paymentMethod === 'tarjeta'
				? listUnitPrice > 0
					? listUnitPrice
					: discountedUnitPrice
				: discountedUnitPrice;

		return {
			product_id: productId,
			product_code: String(display?.productCode ?? '').trim(),
			name: String(display?.name ?? 'Producto').trim() || 'Producto',
			size,
			qty,
			unit_price: unitPrice,
			line_total: unitPrice * qty,
		};
	});
}

export async function checkoutAndReserve(
	customer: CheckoutCustomerInput,
	lines: CheckoutLineInput[],
	paymentMethod: CheckoutPaymentMethod,
	displayLines: CheckoutDisplayLineInput[],
): Promise<
	| { ok: true; orderId: string; whatsappUrl: string; total: number }
	| { ok: false; error: string }
> {
	if (!lines.length) {
		return { ok: false, error: 'El carrito está vacío.' };
	}
	if (!['efectivo', 'transferencia', 'tarjeta'].includes(paymentMethod)) {
		return { ok: false, error: 'Método de pago inválido.' };
	}

	const pricedItems = buildPricedItems(lines, displayLines, paymentMethod).filter(
		(line) => line.product_id && line.name,
	);

	if (!pricedItems.length) {
		return { ok: false, error: 'No se pudieron procesar los productos del carrito.' };
	}

	try {
		const row = await checkoutReserve(
			customer,
			pricedItems,
			{
				payment_method: paymentMethod,
				shipping_postal_code: customer.shippingPostalCode,
				shipping_cost_ars: customer.shippingCostArs,
			},
		);

		const whatsappUrl = buildWhatsAppUrl({
			orderId: row.order_id,
			customerName: customer.name,
			customerPhone: customer.phone,
			customerLocality: customer.locality,
			customerAddress: customer.address,
			paymentMethod,
			items: pricedItems.map((line) => ({
				product_code: line.product_code,
				name: line.name,
				size: line.size,
				qty: line.qty,
				unit_price: line.unit_price,
				line_total: line.line_total,
			})),
			total: row.total,
			shippingPostalCode: customer.shippingPostalCode,
			shippingCostArs: customer.shippingCostArs,
		});

		revalidatePath('/catalogo');
		revalidatePath('/');
		revalidatePath('/app/ventas');
		revalidatePath('/app/productos');

		return {
			ok: true,
			orderId: row.order_id,
			whatsappUrl,
			total: row.total + (customer.shippingCostArs ?? 0),
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'No se pudo completar el pedido.';
		return { ok: false, error: msg.replace(/^ERROR:\s*/i, '').trim() || msg };
	}
}

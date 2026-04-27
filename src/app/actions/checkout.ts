'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/service';
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
};

function formatMoney(n: number) {
	return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildWhatsAppUrl(args: {
	customerName: string;
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
	const body = `Hola, soy ${args.customerName.trim()}, quiero comprar estos productos:

${lines.join('\n')}

Método de pago: ${paymentMethodLabel}

Total: ${formatMoney(args.total)}`;

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

	const payload = lines.map((l) => ({
		product_id: l.productId,
		size: l.size ?? null,
		qty: l.qty,
	}));

	let supabase;
	try {
		supabase = createServiceRoleClient();
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : 'Error de configuración del servidor.',
		};
	}

	const { data, error } = await supabase.rpc('checkout_reserve', {
		p_customer_name: customer.name.trim(),
		p_customer_phone: customer.phone.trim(),
		p_customer_locality: customer.locality.trim(),
		p_customer_address: customer.address.trim(),
		p_items: payload,
	});

	if (error) {
		const msg = error.message || 'No se pudo completar el pedido.';
		const friendly = msg.replace(/^ERROR:\s*/i, '').replace(/^P0001:\s*/i, '').trim();
		return { ok: false, error: friendly || msg };
	}

	const row = data as Record<string, unknown> | null;
	if (!row || row.ok !== true) {
		return { ok: false, error: 'Respuesta inválida del servidor.' };
	}

	const safeDisplayLines = displayLines
		.filter((l) => l && typeof l === 'object')
		.map((l) => {
			const qty = Math.max(1, Math.floor(Number(l.qty) || 0));
			const discountedUnitPrice = Math.max(0, Number(l.discountedUnitPrice) || 0);
			const listUnitPrice = Math.max(0, Number(l.listUnitPrice) || 0);
			const unitPrice =
				paymentMethod === 'tarjeta'
					? listUnitPrice > 0
						? listUnitPrice
						: discountedUnitPrice
					: discountedUnitPrice;
			return {
				product_code: String(l.productCode ?? '').trim(),
				name: String(l.name ?? '').trim(),
				size: String(l.size ?? '').trim(),
				qty,
				unit_price: unitPrice,
				line_total: unitPrice * qty,
			};
		})
		.filter((l) => l.name.length > 0);

	const whatsappItems =
		safeDisplayLines.length > 0
			? safeDisplayLines
			: lines.map((l) => ({
					product_code: '',
					name: 'Producto',
					size: String(l.size ?? '').trim(),
					qty: Math.max(1, Math.floor(Number(l.qty) || 0)),
					unit_price: 0,
					line_total: 0,
				}));
	const whatsappTotal = whatsappItems.reduce((sum, l) => sum + l.line_total, 0);

	const whatsappUrl = buildWhatsAppUrl({
		customerName: customer.name,
		paymentMethod,
		items: whatsappItems,
		total: whatsappTotal,
	});

	revalidatePath('/catalogo');
	revalidatePath('/');
	revalidatePath('/app/ventas');
	revalidatePath('/app/productos');

	return {
		ok: true,
		orderId: String(row.order_id ?? ''),
		whatsappUrl,
		total: whatsappTotal,
	};
}

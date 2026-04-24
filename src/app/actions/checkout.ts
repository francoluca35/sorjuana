'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { siteWhatsAppUrl } from '@/app/config/contact';

export type CheckoutLineInput = {
	productId: string;
	size?: string | null;
	qty: number;
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
	const lines = args.items.map((l) => {
		const code = l.product_code?.trim() ? ` [${l.product_code}]` : '';
		const talla = l.size?.trim() ? ` — Talle: ${l.size}` : '';
		return `•${code} ${l.name}${talla} ×${l.qty} — ${formatMoney(l.unit_price)} c/u → ${formatMoney(l.line_total)}`;
	});
	const body = `Hola, soy ${args.customerName.trim()}, quiero comprar estos productos:

${lines.join('\n')}

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
): Promise<
	| { ok: true; orderId: string; whatsappUrl: string; total: number }
	| { ok: false; error: string }
> {
	if (!lines.length) {
		return { ok: false, error: 'El carrito está vacío.' };
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

	const itemsRaw = row.items;
	const itemsArr = Array.isArray(itemsRaw) ? itemsRaw : [];

	const whatsappUrl = buildWhatsAppUrl({
		customerName: customer.name,
		items: itemsArr.map((it) => {
			const i = it as Record<string, unknown>;
			return {
				product_code: String(i.product_code ?? ''),
				name: String(i.name ?? ''),
				size: String(i.size ?? ''),
				qty: Number(i.qty) || 0,
				unit_price: Number(i.unit_price) || 0,
				line_total: Number(i.line_total) || 0,
			};
		}),
		total: Number(row.total) || 0,
	});

	revalidatePath('/catalogo');
	revalidatePath('/');
	revalidatePath('/app/ventas');
	revalidatePath('/app/productos');

	return {
		ok: true,
		orderId: String(row.order_id ?? ''),
		whatsappUrl,
		total: Number(row.total) || 0,
	};
}

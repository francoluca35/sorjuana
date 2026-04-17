'use server';

import { revalidatePath } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/service';
import {
	buildPaymentPaidLinesMessage,
	buildWaMePrefilledUrl,
	getPaymentNotifyPhoneDigits,
	sendWhatsAppCloudText,
} from '@/lib/whatsapp/paymentPaidMessage';

function mapRpcError(message: string): string {
	return message.replace(/^ERROR:\s*/i, '').replace(/^P0001:\s*/i, '').trim();
}

export type MarkSalesOrderPaidResult =
	| {
			ok: true;
			/** true solo si WhatsApp Cloud API (Meta) envió el mensaje sin abrir la app */
			sentAutomatically: boolean;
			/** Si no hubo envío API, el cliente puede abrir esta URL (sigue haciendo falta “Enviar” en WhatsApp) */
			fallbackUrl?: string;
			/** Aviso si la API falló pero el pedido sí se marcó pagado */
			notifyWarning?: string;
	  }
	| { ok: false; error: string };

export async function markSalesOrderPaid(orderId: string): Promise<MarkSalesOrderPaidResult> {
	if (!orderId?.trim()) return { ok: false, error: 'Pedido inválido.' };
	let supabase;
	try {
		supabase = createServiceRoleClient();
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Configuración del servidor.' };
	}
	const { error } = await supabase.rpc('mark_sales_order_paid', { p_order_id: orderId });
	if (error) {
		return { ok: false, error: mapRpcError(error.message) };
	}

	const { data: orderRow, error: fetchErr } = await supabase
		.from('sales_orders')
		.select('items')
		.eq('id', orderId)
		.maybeSingle();

	if (fetchErr || !orderRow) {
		revalidatePath('/app/ventas');
		revalidatePath('/catalogo');
		revalidatePath('/');
		revalidatePath('/app/productos');
		return {
			ok: true,
			sentAutomatically: false,
			notifyWarning: 'Pedido pagado, pero no se pudo armar el aviso de WhatsApp.',
		};
	}

	const bodyLines = buildPaymentPaidLinesMessage(orderRow.items);
	const body = bodyLines.trim()
		? `Pago confirmado\n\n${bodyLines}`
		: 'Pago confirmado (sin ítems en el pedido).';

	const notifyTo = getPaymentNotifyPhoneDigits();
	const cloud = await sendWhatsAppCloudText({ toDigits: notifyTo, body });

	revalidatePath('/app/ventas');
	revalidatePath('/catalogo');
	revalidatePath('/');
	revalidatePath('/app/productos');

	if (cloud.ok) {
		return { ok: true, sentAutomatically: true };
	}

	const fallbackUrl = buildWaMePrefilledUrl(notifyTo, body);

	let notifyWarning: string;
	if (cloud.reason === 'not_configured') {
		notifyWarning =
			'No hay WhatsApp Cloud API en el servidor: solo se puede abrir el chat con el texto (vos enviás en WhatsApp). Para envío automático sin tocar Enviar, agregá WHATSAPP_CLOUD_ACCESS_TOKEN y WHATSAPP_CLOUD_PHONE_NUMBER_ID en .env.local (Meta) y reiniciá.';
	} else {
		notifyWarning = `El pedido quedó pagado. La API de Meta no envió el mensaje: ${cloud.reason}. Se abrió el chat con el texto por si querés reenviar a mano.`;
	}

	return {
		ok: true,
		sentAutomatically: false,
		fallbackUrl,
		notifyWarning,
	};
}

export async function cancelSalesOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
	if (!orderId?.trim()) return { ok: false, error: 'Pedido inválido.' };
	let supabase;
	try {
		supabase = createServiceRoleClient();
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Configuración del servidor.' };
	}
	const { error } = await supabase.rpc('cancel_sales_order_restore_stock', { p_order_id: orderId });
	if (error) {
		return { ok: false, error: mapRpcError(error.message) };
	}
	revalidatePath('/app/ventas');
	revalidatePath('/catalogo');
	revalidatePath('/');
	revalidatePath('/app/productos');
	return { ok: true };
}

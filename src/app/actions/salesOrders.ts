'use server';

import { revalidatePath } from 'next/cache';
import {
	cancelSalesOrderRestoreStock,
	fetchSalesOrderItems,
	markSalesOrderPaid as markSalesOrderPaidFirestore,
} from '@/lib/firebase/orders';
import {
	buildPaymentPaidLinesMessage,
	buildWaMePrefilledUrl,
	getPaymentNotifyPhoneDigits,
	sendWhatsAppCloudText,
} from '@/lib/whatsapp/paymentPaidMessage';

export type MarkSalesOrderPaidResult =
	| {
			ok: true;
			sentAutomatically: boolean;
			fallbackUrl?: string;
			notifyWarning?: string;
	  }
	| { ok: false; error: string };

export async function markSalesOrderPaid(orderId: string): Promise<MarkSalesOrderPaidResult> {
	if (!orderId?.trim()) return { ok: false, error: 'Pedido inválido.' };

	try {
		await markSalesOrderPaidFirestore(orderId);
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Error al marcar pagado.' };
	}

	const orderItems = await fetchSalesOrderItems(orderId);

	if (!orderItems) {
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

	const bodyLines = buildPaymentPaidLinesMessage(orderItems);
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

	try {
		await cancelSalesOrderRestoreStock(orderId);
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Error al cancelar.' };
	}

	revalidatePath('/app/ventas');
	revalidatePath('/catalogo');
	revalidatePath('/');
	revalidatePath('/app/productos');
	return { ok: true };
}

/** Destinatario por defecto: +54 11 3119-9882 (mismo número del local). */
const DEFAULT_PAYMENT_NOTIFY_DIGITS = '541131199882';

type SnapshotItem = {
	product_code?: string;
	name?: string;
	size?: string;
	qty?: number;
};

/**
 * Formato por ítem: cod:[6876], nombre de prenda: Remera Gris, talle y cantidad: Talle XL ×2
 */
export function buildPaymentPaidLinesMessage(items: unknown): string {
	const arr = Array.isArray(items) ? items : [];
	const lines: string[] = [];
	for (const raw of arr) {
		if (!raw || typeof raw !== 'object') continue;
		const i = raw as SnapshotItem;
		const code = String(i.product_code ?? '').trim() || '—';
		const name = String(i.name ?? '').trim() || '—';
		const qty = Math.max(1, Math.floor(Number(i.qty) || 0));
		const sz = String(i.size ?? '').trim();
		const talleYCant = sz
			? `Talle ${sz} ×${qty}`
			: `×${qty}`;
		lines.push(
			`cod:[${code}], nombre de prenda: ${name}, talle y cantidad: ${talleYCant}`,
		);
	}
	return lines.join('\n\n');
}

export function digitsFromWaMeUrl(url: string): string {
	try {
		const u = new URL(url.startsWith('http') ? url : `https://${url}`);
		const path = u.pathname.replace(/^\//, '').split('/')[0] || '';
		const d = path.replace(/\D/g, '');
		if (d.length >= 10) return d;
		return u.hostname.replace(/\D/g, '');
	} catch {
		return '';
	}
}

/** URL wa.me para abrir el chat con el texto (sigue requiriendo “Enviar” en la app). */
export function buildWaMePrefilledUrl(phoneDigits: string, text: string): string {
	const d = phoneDigits.replace(/\D/g, '');
	return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

/** Destinatario del aviso de “Pago”: +541131199882 salvo `WHATSAPP_PAYMENT_NOTIFY_TO`. */
export function getPaymentNotifyPhoneDigits(): string {
	const fromEnv = process.env.WHATSAPP_PAYMENT_NOTIFY_TO?.replace(/\D/g, '');
	if (fromEnv && fromEnv.length >= 10) return fromEnv;
	return DEFAULT_PAYMENT_NOTIFY_DIGITS;
}

/**
 * Envío server-side vía WhatsApp Cloud API (Meta). Requiere token y Phone Number ID.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */
export async function sendWhatsAppCloudText(args: {
	toDigits: string;
	body: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
	const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
	const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
	if (!token?.trim() || !phoneNumberId?.trim()) {
		return { ok: false, reason: 'not_configured' };
	}

	const to = args.toDigits.replace(/\D/g, '');
	if (to.length < 10) {
		return { ok: false, reason: 'invalid_phone' };
	}

	const version = process.env.WHATSAPP_CLOUD_API_VERSION?.trim() || 'v21.0';
	const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: { body: args.body, preview_url: false },
		}),
	});

	const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok) {
		const err = json.error as Record<string, unknown> | undefined;
		const msg = err?.message ?? JSON.stringify(json);
		return { ok: false, reason: typeof msg === 'string' ? msg : 'api_error' };
	}

	return { ok: true };
}

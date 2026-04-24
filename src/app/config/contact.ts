/** WhatsApp del local (solo dígitos en wa.me: país + número sin +). */
export const siteWhatsAppUrl = 'https://wa.me/5491159795700';

/** Número en dígitos para armar enlaces `wa.me` con texto. */
export function siteWhatsAppPhoneDigits(): string {
	try {
		const u = new URL(siteWhatsAppUrl.startsWith('http') ? siteWhatsAppUrl : `https://${siteWhatsAppUrl}`);
		const fromPath = u.pathname.replace(/^\//, '').split('/')[0];
		return fromPath?.replace(/\D/g, '') || '5491159795700';
	} catch {
		return '5491159795700';
	}
}

export function whatsAppLinkWithMessage(message: string): string {
	return `https://wa.me/${siteWhatsAppPhoneDigits()}?text=${encodeURIComponent(message)}`;
}

/** WhatsApp del local (solo dígitos en wa.me: país + número sin +). */
export const siteWhatsAppUrl = 'https://wa.me/5491159795700';

/** Teléfono visible en contacto, footer, etc. */
export const sitePhoneDisplay = '+54 9 11 5979-5700';

/** Mapa embebido (sección contacto del inicio). */
export const siteMapEmbedUrl =
	'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3281.393235218527!2d-58.728829624124764!3d-34.670023561003106!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcbffa0b897767%3A0x2659569657260835!2sESI%2C%20Juncal%20417%2C%20B1722%20Merlo%2C%20Provincia%20de%20Buenos%20Aires!5e0!3m2!1ses-419!2sar!4v1780525051427!5m2!1ses-419!2sar';

export const siteAddressLines = [
	'ESI, Juncal 417',
	'B1722 Merlo, Buenos Aires',
	'Argentina',
] as const;

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

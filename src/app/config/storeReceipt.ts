import { siteWhatsAppUrl } from '@/app/config/contact';

/** Datos del local para comprobantes y documentos. Editá aquí para reflejar la información real. */
function phoneFromWhatsAppUrl(url: string): string {
	const digits = url.replace(/\D/g, '');
	if (digits.startsWith('549') && digits.length >= 13) {
		const area = digits.slice(3, 5);
		const first = digits.slice(5, 9);
		const second = digits.slice(9, 13);
		if (area && first && second) {
			return `+54 9 ${area} ${first}-${second}`;
		}
	}
	if (digits.startsWith('54') && digits.length >= 10) {
		const rest = digits.slice(2);
		if (rest.length >= 10) {
			const area = rest.slice(0, 2);
			const num = rest.slice(2);
			return `+54 ${area} ${num.slice(0, 4)} ${num.slice(4)}`;
		}
	}
	return `+${digits}`;
}

export const storeReceiptConfig = {
	legalName: 'Sor Juana Liberté',
	tagline: 'Moda italiana y francesa',
	subtitle: 'Elegancia europea · Merlo, Buenos Aires, Argentina',
	addressLines: ['Merlo, Provincia de Buenos Aires', 'Argentina'] as const,
	phoneDisplay: phoneFromWhatsAppUrl(siteWhatsAppUrl),
	whatsappUrl: siteWhatsAppUrl,
	emails: ['info@sorjuana.com', 'ventas@sorjuana.com'] as const,
	hours: 'Lunes a sábado · 10:00 — 20:00 h',
	/** Logo del comprobante PDF en `public`. */
	logoPath: '/Assets/logo-pdf.png',
	since: '2015',
} as const;

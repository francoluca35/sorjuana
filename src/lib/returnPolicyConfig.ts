import {
	LEGAL_PAGE_SECTION_MAX,
	LEGAL_PAGE_SECTION_MIN,
	normalizeLegalPage,
	parseLegalPageFromJson,
	type LegalPageConfig,
	type LegalPageSection,
} from '@/lib/legalPageConfig';

export type ReturnPolicySection = LegalPageSection;
export type ReturnPolicyConfig = LegalPageConfig;

export const RETURN_POLICY_SECTION_MIN = LEGAL_PAGE_SECTION_MIN;
export const RETURN_POLICY_SECTION_MAX = LEGAL_PAGE_SECTION_MAX;

export const DEFAULT_RETURN_POLICY: ReturnPolicyConfig = {
	pageTitle: 'Política de Cambios y Devoluciones',
	intro:
		'En Sor Juana Liberté, queremos que estés conforme con tu compra. Por eso, ofrecemos la posibilidad de realizar cambios bajo las siguientes condiciones:',
	whatsappHref: 'https://wa.me/5491159795700',
	whatsappLabel: '+54 9 11 5979-5700',
	sections: [
		{
			title: 'Plazo de cambios',
			paragraphs: [
				'Aceptamos cambios dentro de los **15 días hábiles** desde realizada la compra. Pasado ese período, no será posible gestionar cambios o devoluciones.',
			],
		},
		{
			title: 'Condiciones del producto',
			paragraphs: ['Para poder realizar un cambio o devolución, el artículo debe estar:'],
			items: ['Sin uso', 'En perfectas condiciones', 'Con su embalaje original'],
		},
		{
			title: 'Modalidad de cambios',
			paragraphs: [
				'Los cambios y devoluciones podrán realizarse en tiendas físicas o coordinarse por otros medios de contacto.',
			],
		},
		{
			title: 'Costos de envío',
			paragraphs: [
				'Todos los costos de envío asociados a cambios o devoluciones corren por cuenta del cliente.',
			],
		},
		{
			title: 'Proceso de gestión',
			paragraphs: [
				'Para iniciar un cambio o devolución, es necesario comunicarse previamente vía WhatsApp al {whatsapp} para consultar la disponibilidad del artículo.',
				'Al momento de gestionar el cambio o devolución, se deberá presentar:',
			],
			items: ['Número de pedido', 'Recibo o comprobante de compra'],
		},
	],
};

export function parseReturnPolicyFromJson(data: unknown): ReturnPolicyConfig | null {
	return parseLegalPageFromJson(data);
}

export function normalizeReturnPolicy(input: ReturnPolicyConfig): ReturnPolicyConfig {
	return normalizeLegalPage(input, DEFAULT_RETURN_POLICY);
}

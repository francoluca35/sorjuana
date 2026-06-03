import {
	normalizeLegalPage,
	parseLegalPageFromJson,
	type LegalPageConfig,
	type LegalPageSection,
} from '@/lib/legalPageConfig';

export type TermsConditionsSection = LegalPageSection;
export type TermsConditionsConfig = LegalPageConfig;

export const TERMS_SECTION_MIN = 1;
export const TERMS_SECTION_MAX = 12;

export const DEFAULT_TERMS_CONDITIONS: TermsConditionsConfig = {
	pageTitle: 'Términos y Condiciones',
	intro:
		'Al utilizar el sitio web de Sor Juana Liberté y realizar compras, aceptás los siguientes términos y condiciones. Te recomendamos leerlos antes de confirmar tu pedido.',
	whatsappHref: 'https://wa.me/5491159795700',
	whatsappLabel: '+54 9 11 5979-5700',
	sections: [
		{
			title: 'Uso del sitio',
			paragraphs: [
				'El contenido publicado (textos, imágenes, precios y disponibilidad) puede modificarse sin previo aviso. Las fotos son ilustrativas y pueden presentar variaciones de color o detalle respecto del producto real.',
			],
		},
		{
			title: 'Precios y pagos',
			paragraphs: [
				'Los precios están expresados en pesos argentinos. Las promociones, descuentos por medio de pago y cuotas informadas en el sitio aplican según las condiciones vigentes al momento de la compra.',
			],
		},
		{
			title: 'Pedidos y stock',
			paragraphs: [
				'La confirmación del pedido está sujeta a disponibilidad de stock. Nos reservamos el derecho de cancelar o modificar un pedido ante errores de carga o falta de stock, contactándote para ofrecer alternativas.',
			],
		},
		{
			title: 'Envíos',
			paragraphs: [
				'Realizamos envíos a todo el país desde Merlo, Buenos Aires. Los plazos y costos de envío se informan durante el proceso de compra y pueden variar según la localidad de destino.',
			],
		},
		{
			title: 'Cambios y devoluciones',
			paragraphs: [
				'Las condiciones de cambios y devoluciones se rigen por nuestra política específica publicada en el sitio. Para consultas podés escribirnos por WhatsApp al {whatsapp}.',
			],
		},
		{
			title: 'Contacto',
			paragraphs: [
				'Ante cualquier duda sobre estos términos, podés comunicarte con nosotros por WhatsApp al {whatsapp} o en nuestros canales oficiales de atención.',
			],
		},
	],
};

export function parseTermsConditionsFromJson(data: unknown): TermsConditionsConfig | null {
	return parseLegalPageFromJson(data);
}

export function normalizeTermsConditions(input: TermsConditionsConfig): TermsConditionsConfig {
	return normalizeLegalPage(input, DEFAULT_TERMS_CONDITIONS);
}

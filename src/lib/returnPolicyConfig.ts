export type ReturnPolicySection = {
	title: string;
	/** Un párrafo por línea. Usá `{whatsapp}` para el enlace y `**texto**` para negrita. */
	paragraphs: string[];
	/** Ítems de lista con viñetas (opcional). */
	items?: string[];
};

export type ReturnPolicyConfig = {
	pageTitle: string;
	intro: string;
	whatsappHref: string;
	whatsappLabel: string;
	sections: ReturnPolicySection[];
};

export const RETURN_POLICY_SECTION_MIN = 1;
export const RETURN_POLICY_SECTION_MAX = 12;

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

function parseSection(raw: unknown): ReturnPolicySection | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const title = typeof o.title === 'string' ? o.title.trim() : '';
	if (!title) return null;

	const paragraphsRaw = Array.isArray(o.paragraphs) ? o.paragraphs : [];
	const paragraphs = paragraphsRaw
		.filter((p): p is string => typeof p === 'string')
		.map((p) => p.trim())
		.filter(Boolean);
	if (paragraphs.length === 0) return null;

	let items: string[] | undefined;
	if (Array.isArray(o.items)) {
		const parsedItems = o.items
			.filter((i): i is string => typeof i === 'string')
			.map((i) => i.trim())
			.filter(Boolean);
		if (parsedItems.length > 0) items = parsedItems;
	}

	return { title, paragraphs, items };
}

export function parseReturnPolicyFromJson(data: unknown): ReturnPolicyConfig | null {
	if (!data || typeof data !== 'object') return null;
	const o = data as Record<string, unknown>;
	const pageTitle = typeof o.pageTitle === 'string' ? o.pageTitle.trim() : '';
	const intro = typeof o.intro === 'string' ? o.intro.trim() : '';
	const whatsappHref = typeof o.whatsappHref === 'string' ? o.whatsappHref.trim() : '';
	const whatsappLabel = typeof o.whatsappLabel === 'string' ? o.whatsappLabel.trim() : '';
	if (!pageTitle || !intro || !whatsappHref || !whatsappLabel) return null;
	if (!Array.isArray(o.sections) || o.sections.length < RETURN_POLICY_SECTION_MIN) return null;
	if (o.sections.length > RETURN_POLICY_SECTION_MAX) return null;

	const sections: ReturnPolicySection[] = [];
	for (const item of o.sections) {
		const section = parseSection(item);
		if (!section) return null;
		sections.push(section);
	}

	return { pageTitle, intro, whatsappHref, whatsappLabel, sections };
}

export function normalizeReturnPolicy(input: ReturnPolicyConfig): ReturnPolicyConfig {
	const sections = input.sections
		.map((section) => ({
			title: section.title.trim(),
			paragraphs: section.paragraphs.map((p) => p.trim()).filter(Boolean),
			items: section.items?.map((i) => i.trim()).filter(Boolean),
		}))
		.filter((section) => section.title && section.paragraphs.length > 0)
		.slice(0, RETURN_POLICY_SECTION_MAX)
		.map((section) => ({
			...section,
			items: section.items?.length ? section.items : undefined,
		}));

	if (sections.length < RETURN_POLICY_SECTION_MIN) {
		return DEFAULT_RETURN_POLICY;
	}

	return {
		pageTitle: input.pageTitle.trim() || DEFAULT_RETURN_POLICY.pageTitle,
		intro: input.intro.trim() || DEFAULT_RETURN_POLICY.intro,
		whatsappHref: input.whatsappHref.trim() || DEFAULT_RETURN_POLICY.whatsappHref,
		whatsappLabel: input.whatsappLabel.trim() || DEFAULT_RETURN_POLICY.whatsappLabel,
		sections,
	};
}

export type LegalPageSection = {
	title: string;
	/** Un párrafo por línea. Usá `{whatsapp}` para el enlace y `**texto**` para negrita. */
	paragraphs: string[];
	/** Ítems de lista con viñetas (opcional). */
	items?: string[];
};

export type LegalPageConfig = {
	pageTitle: string;
	intro: string;
	whatsappHref: string;
	whatsappLabel: string;
	sections: LegalPageSection[];
};

export const LEGAL_PAGE_SECTION_MIN = 1;
export const LEGAL_PAGE_SECTION_MAX = 12;

function parseSection(raw: unknown): LegalPageSection | null {
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

export function parseLegalPageFromJson(data: unknown): LegalPageConfig | null {
	if (!data || typeof data !== 'object') return null;
	const o = data as Record<string, unknown>;
	const pageTitle = typeof o.pageTitle === 'string' ? o.pageTitle.trim() : '';
	const intro = typeof o.intro === 'string' ? o.intro.trim() : '';
	const whatsappHref = typeof o.whatsappHref === 'string' ? o.whatsappHref.trim() : '';
	const whatsappLabel = typeof o.whatsappLabel === 'string' ? o.whatsappLabel.trim() : '';
	if (!pageTitle || !intro || !whatsappHref || !whatsappLabel) return null;
	if (!Array.isArray(o.sections) || o.sections.length < LEGAL_PAGE_SECTION_MIN) return null;
	if (o.sections.length > LEGAL_PAGE_SECTION_MAX) return null;

	const sections: LegalPageSection[] = [];
	for (const item of o.sections) {
		const section = parseSection(item);
		if (!section) return null;
		sections.push(section);
	}

	return { pageTitle, intro, whatsappHref, whatsappLabel, sections };
}

export function normalizeLegalPage(input: LegalPageConfig, fallback: LegalPageConfig): LegalPageConfig {
	const sections = input.sections
		.map((section) => ({
			title: section.title.trim(),
			paragraphs: section.paragraphs.map((p) => p.trim()).filter(Boolean),
			items: section.items?.map((i) => i.trim()).filter(Boolean),
		}))
		.filter((section) => section.title && section.paragraphs.length > 0)
		.slice(0, LEGAL_PAGE_SECTION_MAX)
		.map((section) => ({
			...section,
			items: section.items?.length ? section.items : undefined,
		}));

	if (sections.length < LEGAL_PAGE_SECTION_MIN) {
		return fallback;
	}

	return {
		pageTitle: input.pageTitle.trim() || fallback.pageTitle,
		intro: input.intro.trim() || fallback.intro,
		whatsappHref: input.whatsappHref.trim() || fallback.whatsappHref,
		whatsappLabel: input.whatsappLabel.trim() || fallback.whatsappLabel,
		sections,
	};
}

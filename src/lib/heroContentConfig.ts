export type HeroAlignX = 'left' | 'center' | 'right';
export type HeroAlignY = 'top' | 'center' | 'bottom';

export type HeroContentConfig = {
	primaryCtaLabel: string;
	primaryCtaHref: string;
	secondaryCtaLabel: string;
	secondaryCtaHref: string;
	/** Posición horizontal del bloque de botones sobre el banner. */
	contentAlignX: HeroAlignX;
	/** Posición vertical del bloque de botones sobre el banner. */
	contentAlignY: HeroAlignY;
};

export const DEFAULT_HERO_CONTENT: HeroContentConfig = {
	primaryCtaLabel: 'Ver catálogo',
	primaryCtaHref: '/catalogo',
	secondaryCtaLabel: 'Más vendidos',
	secondaryCtaHref: '/#destacados',
	contentAlignX: 'right',
	contentAlignY: 'bottom',
};

export const HERO_CONTENT_UPDATED_EVENT = 'sj-hero-content-updated';

function parseAlignX(value: unknown): HeroAlignX {
	return value === 'left' || value === 'center' || value === 'right'
		? value
		: DEFAULT_HERO_CONTENT.contentAlignX;
}

function parseAlignY(value: unknown): HeroAlignY {
	return value === 'top' || value === 'center' || value === 'bottom'
		? value
		: DEFAULT_HERO_CONTENT.contentAlignY;
}

export function parseHeroContentFromJson(data: unknown): HeroContentConfig | null {
	if (!data || typeof data !== 'object') return null;
	const o = data as Record<string, unknown>;
	const primaryCtaLabel = typeof o.primaryCtaLabel === 'string' ? o.primaryCtaLabel.trim() : '';
	const primaryCtaHref =
		typeof o.primaryCtaHref === 'string' && o.primaryCtaHref.trim()
			? o.primaryCtaHref.trim()
			: '/catalogo';
	const secondaryCtaLabel = typeof o.secondaryCtaLabel === 'string' ? o.secondaryCtaLabel.trim() : '';
	const secondaryCtaHref = typeof o.secondaryCtaHref === 'string' ? o.secondaryCtaHref.trim() : '';
	if (!primaryCtaLabel || !secondaryCtaLabel || !secondaryCtaHref) return null;
	return {
		primaryCtaLabel,
		primaryCtaHref,
		secondaryCtaLabel,
		secondaryCtaHref,
		contentAlignX: parseAlignX(o.contentAlignX),
		contentAlignY: parseAlignY(o.contentAlignY),
	};
}

export function normalizeHeroContent(input: HeroContentConfig): HeroContentConfig {
	return {
		primaryCtaLabel: input.primaryCtaLabel.trim() || DEFAULT_HERO_CONTENT.primaryCtaLabel,
		primaryCtaHref: input.primaryCtaHref.trim() || DEFAULT_HERO_CONTENT.primaryCtaHref,
		secondaryCtaLabel: input.secondaryCtaLabel.trim() || DEFAULT_HERO_CONTENT.secondaryCtaLabel,
		secondaryCtaHref: input.secondaryCtaHref.trim() || DEFAULT_HERO_CONTENT.secondaryCtaHref,
		contentAlignX: parseAlignX(input.contentAlignX),
		contentAlignY: parseAlignY(input.contentAlignY),
	};
}

export function broadcastHeroContentUpdated(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(HERO_CONTENT_UPDATED_EVENT));
}

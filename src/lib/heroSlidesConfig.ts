export type HeroHotspot = {
	id: string;
	top: string;
	left: string;
	/** Si hay `imageMobile` en el slide, en celular se usan estas coords; si no, `top`/`left`. */
	topMobile?: string;
	leftMobile?: string;
	/** UUID en `products.id` cuando el hotspot se eligió desde el catálogo (carrito / coherencia). */
	catalogProductId?: string;
	productName: string;
	price: number;
	thumbnailSrc: string;
};

export type HeroSlide = {
	id: number;
	title: string;
	image: string;
	imageMobile?: string;
	filter: 'all' | 'italiana' | 'francesa';
	hotspots: HeroHotspot[];
	objectPositionMobile?: string;
	objectPositionDesktop?: string;
};

export const HERO_SLIDES_STORAGE_KEY = 'sj-hero-slides-v1';

export const HERO_SLIDES_UPDATED_EVENT = 'sj-hero-slides-updated';

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
	{
		id: 1,
		title: 'ALTA COSTURA FRANCESA',
		image:
			'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=3840&q=90',
		objectPositionMobile: 'center 20%',
		objectPositionDesktop: 'center center',
		filter: 'francesa',
		hotspots: [
			{
				id: 'hero-h1a',
				top: '36%',
				left: '44%',
				productName: 'Blusa encaje Saint-Germain',
				price: 189,
				thumbnailSrc:
					'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=400&h=400&q=88',
			},
			{
				id: 'hero-h1b',
				top: '58%',
				left: '48%',
				productName: 'Pantalón pinzas Marais',
				price: 219,
				thumbnailSrc:
					'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=400&h=400&q=88',
			},
		],
	},
	{
		id: 2,
		title: 'MODA ITALIANA 26',
		image:
			'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=3840&q=90',
		objectPositionMobile: 'center 24%',
		objectPositionDesktop: 'center 15%',
		filter: 'italiana',
		hotspots: [
			{
				id: 'hero-h2a',
				top: '40%',
				left: '50%',
				productName: 'Vestido seda Lake Como',
				price: 289,
				thumbnailSrc:
					'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&h=400&q=88',
			},
			{
				id: 'hero-h2b',
				top: '52%',
				left: '38%',
				productName: 'Cinturón piel Toscana',
				price: 95,
				thumbnailSrc:
					'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=400&h=400&q=88',
			},
		],
	},
	{
		id: 3,
		title: 'COSTURA FRANCESA 26',
		image:
			'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=3840&q=90',
		objectPositionMobile: 'center 26%',
		objectPositionDesktop: 'center center',
		filter: 'francesa',
		hotspots: [
			{
				id: 'hero-h3a',
				top: '34%',
				left: '42%',
				productName: 'Abrigo lana Champagne',
				price: 420,
				thumbnailSrc:
					'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=400&h=400&q=88',
			},
			{
				id: 'hero-h3b',
				top: '48%',
				left: '55%',
				productName: 'Pañuelo seda Lyon',
				price: 78,
				thumbnailSrc:
					'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=400&h=400&q=88',
			},
		],
	},
	{
		id: 4,
		title: 'DOLCE VITA',
		image:
			'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=3840&q=90',
		objectPositionMobile: 'center 22%',
		objectPositionDesktop: 'center 30%',
		filter: 'italiana',
		hotspots: [
			{
				id: 'hero-h4a',
				top: '38%',
				left: '46%',
				productName: 'Blazer ligero Napoli',
				price: 265,
				thumbnailSrc:
					'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=400&h=400&q=88',
			},
			{
				id: 'hero-h4b',
				top: '55%',
				left: '44%',
				productName: 'Pantalón cropped Capri',
				price: 175,
				thumbnailSrc:
					'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=400&h=400&q=88',
			},
		],
	},
];

function isFilter(v: unknown): v is HeroSlide['filter'] {
	return v === 'all' || v === 'italiana' || v === 'francesa';
}

function parseHotspot(raw: unknown): HeroHotspot | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === 'string' ? o.id : '';
	const top = typeof o.top === 'string' ? o.top : '';
	const left = typeof o.left === 'string' ? o.left : '';
	const productName = typeof o.productName === 'string' ? o.productName : '';
	const price = typeof o.price === 'number' && Number.isFinite(o.price) ? o.price : NaN;
	const thumbnailSrc = typeof o.thumbnailSrc === 'string' ? o.thumbnailSrc : '';
	if (!id || !top || !left || !productName || !thumbnailSrc || Number.isNaN(price)) return null;
	const topMobile = typeof o.topMobile === 'string' ? o.topMobile : undefined;
	const leftMobile = typeof o.leftMobile === 'string' ? o.leftMobile : undefined;
	const catalogProductId =
		typeof o.catalogProductId === 'string' && o.catalogProductId.trim()
			? o.catalogProductId.trim()
			: undefined;
	return { id, top, left, topMobile, leftMobile, catalogProductId, productName, price, thumbnailSrc };
}

function parseSlide(raw: unknown): HeroSlide | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === 'number' && Number.isFinite(o.id) ? o.id : NaN;
	const title = typeof o.title === 'string' ? o.title : '';
	const image = typeof o.image === 'string' ? o.image : '';
	const filter = o.filter;
	if (!title || !image || !isFilter(filter) || Number.isNaN(id)) return null;
	const imageMobile = typeof o.imageMobile === 'string' ? o.imageMobile : undefined;
	const objectPositionMobile =
		typeof o.objectPositionMobile === 'string' ? o.objectPositionMobile : undefined;
	const objectPositionDesktop =
		typeof o.objectPositionDesktop === 'string' ? o.objectPositionDesktop : undefined;
	const rawHotspots = o.hotspots;
	const hotspots: HeroHotspot[] = [];
	if (Array.isArray(rawHotspots)) {
		for (const h of rawHotspots) {
			const parsed = parseHotspot(h);
			if (parsed) hotspots.push(parsed);
		}
	}
	return {
		id,
		title,
		image,
		imageMobile,
		filter,
		hotspots,
		objectPositionMobile,
		objectPositionDesktop,
	};
}

export function parseHeroSlidesFromJson(data: unknown): HeroSlide[] | null {
	if (!Array.isArray(data) || data.length === 0) return null;
	const out: HeroSlide[] = [];
	for (const item of data) {
		const s = parseSlide(item);
		if (s) out.push(s);
	}
	return out.length ? out : null;
}

export function readHeroSlidesFromStorage(): HeroSlide[] | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(HERO_SLIDES_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		return parseHeroSlidesFromJson(parsed);
	} catch {
		return null;
	}
}

export function writeHeroSlidesToStorage(slides: HeroSlide[]): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(HERO_SLIDES_STORAGE_KEY, JSON.stringify(slides));
		window.dispatchEvent(new CustomEvent(HERO_SLIDES_UPDATED_EVENT));
	} catch {
		/* ignore */
	}
}

export function broadcastHeroSlidesUpdated(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(HERO_SLIDES_UPDATED_EVENT));
}

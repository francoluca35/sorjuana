export type FashionCategoryPanel = {
	title: string;
	country: string;
	href: string;
	videoSrc: string;
	previewImage: string;
};

export const FASHION_CATEGORY_PANEL_COUNT = 4;

export const DEFAULT_FASHION_CATEGORY_PANELS: FashionCategoryPanel[] = [
	{
		title: 'Elegancia italiana',
		country: 'ITALIA',
		href: '/catalogo?filter=italiana',
		videoSrc:
			'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594156/modern-fashion-store/video/italia.mp4',
		previewImage:
			'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1280&q=80',
	},
	{
		title: 'Chic frances',
		country: 'FRANCIA',
		href: '/catalogo?filter=francesa',
		videoSrc:
			'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594029/modern-fashion-store/video/francia.mp4',
		previewImage:
			'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1280&q=80',
	},
	{
		title: 'Accesorios premium',
		country: 'EUROPA',
		href: '/catalogo',
		videoSrc:
			'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594108/modern-fashion-store/video/italia-m.mp4',
		previewImage:
			'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1280&q=80',
	},
	{
		title: 'Looks urbanos',
		country: 'COLECCION',
		href: '/catalogo',
		videoSrc: 'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594296/francia-m_gxsq71.mp4',
		previewImage:
			'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1280&q=80',
	},
];

function parsePanel(raw: unknown): FashionCategoryPanel | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const title = typeof o.title === 'string' ? o.title.trim() : '';
	const country = typeof o.country === 'string' ? o.country.trim() : '';
	let href = typeof o.href === 'string' ? o.href.trim() : '';
	const videoSrc = typeof o.videoSrc === 'string' ? o.videoSrc.trim() : '';
	const previewImage = typeof o.previewImage === 'string' ? o.previewImage.trim() : '';
	if (!title || !country || !href || !videoSrc || !previewImage) return null;
	if (!href.startsWith('/') && !href.startsWith('http://') && !href.startsWith('https://')) {
		href = `/${href.replace(/^\//, '')}`;
	}
	return { title, country, href, videoSrc, previewImage };
}

/** Devuelve null si el JSON no es válido o no son exactamente cuatro paneles. */
export function parseFashionCategoryPanelsFromJson(data: unknown): FashionCategoryPanel[] | null {
	if (!Array.isArray(data) || data.length !== FASHION_CATEGORY_PANEL_COUNT) return null;
	const out: FashionCategoryPanel[] = [];
	for (const item of data) {
		const p = parsePanel(item);
		if (!p) return null;
		out.push(p);
	}
	return out;
}

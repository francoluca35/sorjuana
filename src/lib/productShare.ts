import { whatsAppLinkWithMessage } from '@/app/config/contact';
import { formatPrecioListaAr } from '@/lib/formatPrice';
import { getCanonicalUrl } from '@/lib/seo';

export const PRODUCT_QUERY_PARAM = 'producto';

export function buildProductCatalogPath(productId: string): string {
	const params = new URLSearchParams();
	params.set(PRODUCT_QUERY_PARAM, productId.trim());
	return `/catalogo?${params.toString()}`;
}

export function buildProductShareUrl(productId: string): string {
	return getCanonicalUrl(buildProductCatalogPath(productId));
}

export function buildProductShareText(name: string, price?: number): string {
	const trimmedName = name.trim();
	const pricePart = price != null && price > 0 ? ` — ${formatPrecioListaAr(price)}` : '';
	return `${trimmedName}${pricePart} | Sor Juana`;
}

export async function shareProductLink(args: {
	productId: string;
	name: string;
	price?: number;
}): Promise<'shared' | 'copied' | 'whatsapp' | 'cancelled'> {
	const url = buildProductShareUrl(args.productId);
	const text = buildProductShareText(args.name, args.price);
	const payload = `${text}\n${url}`;

	try {
		if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
			await navigator.share({
				title: args.name.trim(),
				text,
				url,
			});
			return 'shared';
		}
	} catch (err) {
		if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
	}

	try {
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(payload);
			return 'copied';
		}
	} catch {
		/* fallback below */
	}

	if (typeof window !== 'undefined') {
		window.open(whatsAppLinkWithMessage(payload), '_blank', 'noopener,noreferrer');
		return 'whatsapp';
	}

	return 'cancelled';
}

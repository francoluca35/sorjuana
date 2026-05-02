const FALLBACK_SITE_URL = 'https://sorjuanaliberte.com';

export function getSiteUrl() {
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
	if (!siteUrl) return FALLBACK_SITE_URL;

	try {
		return new URL(siteUrl).toString().replace(/\/$/, '');
	} catch {
		return FALLBACK_SITE_URL;
	}
}

export function getCanonicalUrl(pathname: string) {
	return new URL(pathname, getSiteUrl()).toString();
}

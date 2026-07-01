import { configureCloudinary, getCloudinaryCloudName } from '@/lib/cloudinary/config';
import type { ProductRow } from '@/lib/data/productCatalog';

const PRODUCT_MEDIA_PREFIX = 'modern-fashion-store/products/';

export type CloudinaryAssetRef = {
	publicId: string;
	resourceType: 'image' | 'video';
};

export function extractProductMediaFromUrl(url: string): CloudinaryAssetRef | null {
	const trimmed = url.trim();
	if (!trimmed.includes('res.cloudinary.com')) return null;

	const cloudName = getCloudinaryCloudName();
	if (!trimmed.includes(`res.cloudinary.com/${cloudName}/`)) return null;

	const prefixIdx = trimmed.indexOf(PRODUCT_MEDIA_PREFIX);
	if (prefixIdx === -1) return null;

	const fromPrefix = trimmed.slice(prefixIdx).split('?')[0] ?? '';
	const publicId = fromPrefix.replace(/\.[^/.]+$/, '');
	if (!publicId.startsWith(PRODUCT_MEDIA_PREFIX.slice(0, -1))) return null;

	const resourceType = trimmed.includes('/video/upload/') ? 'video' : 'image';
	return { publicId, resourceType };
}

export function collectProductMediaUrls(products: ProductRow[]): string[] {
	const urls = new Set<string>();
	for (const product of products) {
		const main = product.image_url?.trim();
		if (main) urls.add(main);
		for (const url of product.image_urls ?? []) {
			const u = url?.trim();
			if (u) urls.add(u);
		}
		const video = product.video_url?.trim();
		if (video) urls.add(video);
	}
	return [...urls];
}

export async function deleteCloudinaryAsset(ref: CloudinaryAssetRef): Promise<void> {
	const cloudinary = configureCloudinary();
	const result = await cloudinary.uploader.destroy(ref.publicId, { resource_type: ref.resourceType });
	if (result.result !== 'ok' && result.result !== 'not found') {
		throw new Error(`No se pudo borrar ${ref.publicId} en Cloudinary (${result.result}).`);
	}
}

export async function deleteProductMediaFromCloudinary(
	urls: string[],
): Promise<{ deleted: number; skipped: number; failed: number }> {
	const assets = new Map<string, CloudinaryAssetRef>();
	for (const url of urls) {
		const ref = extractProductMediaFromUrl(url);
		if (!ref) continue;
		assets.set(`${ref.resourceType}:${ref.publicId}`, ref);
	}

	let deleted = 0;
	let failed = 0;
	const skipped = urls.length - assets.size;

	for (const ref of assets.values()) {
		try {
			await deleteCloudinaryAsset(ref);
			deleted += 1;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes('Not found') || msg.includes('not found')) {
				deleted += 1;
				continue;
			}
			console.error('[deleteProductMediaFromCloudinary]', ref.publicId, e);
			failed += 1;
		}
	}

	return { deleted, skipped, failed };
}

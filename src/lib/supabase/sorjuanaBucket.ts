/** Bucket de Storage en Supabase (migración `20260414180000_storage_sorjuana.sql`). */
export const SORJUANA_BUCKET = 'sorjuana' as const;

export type SorjuanaMediaKind = 'image' | 'video';

function safeExt(fileName: string, mime: string): string {
	const fromName = fileName.split('.').pop();
	if (fromName && /^[a-zA-Z0-9]{1,8}$/.test(fromName)) return fromName.toLowerCase();
	if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
	if (mime === 'image/png') return 'png';
	if (mime === 'image/webp') return 'webp';
	if (mime === 'image/gif') return 'gif';
	if (mime === 'video/mp4') return 'mp4';
	if (mime === 'video/webm') return 'webm';
	if (mime === 'video/quicktime') return 'mov';
	return 'bin';
}

/**
 * Ruta dentro del bucket: `images|videos/{userId}/{timestamp}_{uuid}.{ext}`
 */
export function buildSorjuanaObjectPath(
	kind: SorjuanaMediaKind,
	userId: string,
	fileName: string,
	mime: string,
): string {
	const base = kind === 'video' ? 'videos' : 'images';
	const ext = safeExt(fileName, mime);
	const stamp = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
	const baseName = fileName.replace(/\.[^/.]+$/, '').slice(0, 60).replace(/[^\w\-]+/g, '_') || 'archivo';
	return `${base}/${userId}/${stamp}_${baseName}.${ext}`;
}

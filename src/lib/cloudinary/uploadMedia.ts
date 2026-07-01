import { configureCloudinary } from '@/lib/cloudinary/config';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/jpg',
]);

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export type CloudinaryUploadResult =
	| { ok: true; publicUrl: string; path: string }
	| { ok: false; message: string };

type UploadKind = 'image' | 'video';

function validateFile(file: File, kind: UploadKind): { ok: true } | { ok: false; message: string } {
	const mime = (file.type || '').toLowerCase();
	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	const maxBytes = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

	if (file.size > maxBytes) {
		return {
			ok: false,
			message:
				kind === 'video'
					? 'El video supera el límite de 50 MB.'
					: 'La imagen supera el límite de 12 MB.',
		};
	}

	const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
	const videoExts = new Set(['mp4', 'webm', 'mov']);

	if (kind === 'image') {
		const okMime = !mime || IMAGE_TYPES.has(mime);
		const okExt = imageExts.has(ext);
		if (!okMime && !okExt) {
			return { ok: false, message: 'Formato de imagen no permitido (JPEG, PNG, WebP o GIF).' };
		}
	}
	if (kind === 'video') {
		const okMime = !mime || VIDEO_TYPES.has(mime);
		const okExt = videoExts.has(ext);
		if (!okMime && !okExt) {
			return { ok: false, message: 'Formato de video no permitido (MP4, WebM o MOV).' };
		}
	}

	return { ok: true };
}

export async function uploadToCloudinary(
	file: File,
	options: { folder: string; kind: UploadKind },
): Promise<CloudinaryUploadResult> {
	const validation = validateFile(file, options.kind);
	if (!validation.ok) return validation;

	try {
		const cloudinary = configureCloudinary();
		const buffer = Buffer.from(await file.arrayBuffer());
		const resourceType = options.kind === 'video' ? 'video' : 'image';

		const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						folder: options.folder,
						resource_type: resourceType,
						overwrite: false,
					},
					(error, res) => {
						if (error || !res) {
							reject(error ?? new Error('Cloudinary no devolvió respuesta.'));
						} else {
							resolve(res as { secure_url: string; public_id: string });
						}
					},
				)
				.end(buffer);
		});

		return { ok: true, publicUrl: result.secure_url, path: result.public_id };
	} catch (e) {
		const raw = e instanceof Error ? e.message : 'Error al subir a Cloudinary.';
		const msg = raw.includes('Invalid API Key') || raw.includes('401')
			? 'Cloudinary rechazó la subida: revisá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en .env.local.'
			: raw;
		return { ok: false, message: msg };
	}
}

export async function uploadFromFormData(
	formData: FormData,
	options: { folder: string; kind: UploadKind },
): Promise<CloudinaryUploadResult> {
	const file = formData.get('file');
	if (!file || typeof file === 'string' || !(file instanceof File) || file.size === 0) {
		return { ok: false, message: 'No se recibió ningún archivo válido.' };
	}
	return uploadToCloudinary(file, options);
}

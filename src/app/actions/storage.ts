'use server';

import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@/lib/supabase/server';
import {
	SORJUANA_BUCKET,
	buildSorjuanaObjectPath,
	type SorjuanaMediaKind,
} from '@/lib/supabase/sorjuanaBucket';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const IMAGE_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/jpg',
]);

const VIDEO_TYPES = new Set([
	'video/mp4',
	'video/webm',
	'video/quicktime',
]);

export type UploadSorjuanaResult =
	| { ok: true; publicUrl: string; path: string }
	| { ok: false; message: string };

/**
 * Sube un archivo al bucket `sorjuana`. Requiere sesión autenticada (políticas RLS).
 * Enviar FormData con: `file` (File), `kind`: `image` | `video`.
 */
export async function uploadSorjuanaMedia(formData: FormData): Promise<UploadSorjuanaResult> {
	try {
		return await uploadSorjuanaMediaInner(formData);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error inesperado al subir el archivo.';
		return { ok: false, message: msg };
	}
}

async function uploadSorjuanaMediaInner(formData: FormData): Promise<UploadSorjuanaResult> {
	const kindRaw = formData.get('kind');
	const kind: SorjuanaMediaKind = kindRaw === 'video' ? 'video' : 'image';
	const file = formData.get('file');

	if (!file || typeof file === 'string') {
		return { ok: false, message: 'No se recibió ningún archivo.' };
	}

	if (!(file instanceof File) || file.size === 0) {
		return { ok: false, message: 'El archivo está vacío.' };
	}

	const mime = (file.type || '').toLowerCase();
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

	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
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

	const supabase = await createClient();
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return { ok: false, message: 'Tenés que iniciar sesión para subir archivos.' };
	}

	const path = buildSorjuanaObjectPath(kind, user.id, file.name, mime);
	const { error } = await supabase.storage.from(SORJUANA_BUCKET).upload(path, file, {
		contentType: mime || undefined,
		upsert: false,
	});

	if (error) {
		return { ok: false, message: error.message };
	}

	const { data: pub } = supabase.storage.from(SORJUANA_BUCKET).getPublicUrl(path);
	return { ok: true, publicUrl: pub.publicUrl, path };
}

/**
 * Sube una imagen a Cloudinary (público) sin depender del storage de Supabase.
 * Pensado para el hero: solo requiere sesión iniciada (la auth de la app funciona)
 * y las credenciales de Cloudinary ya configuradas en el entorno.
 * Enviar FormData con `file` (File de imagen).
 */
export async function uploadHeroImageToCloudinary(
	formData: FormData,
): Promise<UploadSorjuanaResult> {
	try {
		const file = formData.get('file');
		if (!file || typeof file === 'string' || !(file instanceof File) || file.size === 0) {
			return { ok: false, message: 'No se recibió ninguna imagen válida.' };
		}

		const mime = (file.type || '').toLowerCase();
		if (file.size > MAX_IMAGE_BYTES) {
			return { ok: false, message: 'La imagen supera el límite de 12 MB.' };
		}

		const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
		const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
		const okMime = !mime || IMAGE_TYPES.has(mime);
		const okExt = imageExts.has(ext);
		if (!okMime && !okExt) {
			return { ok: false, message: 'Formato de imagen no permitido (JPEG, PNG, WebP o GIF).' };
		}

		const supabase = await createClient();
		const {
			data: { user },
			error: userErr,
		} = await supabase.auth.getUser();
		if (userErr || !user) {
			return { ok: false, message: 'Tenés que iniciar sesión para subir imágenes.' };
		}

		const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
		const apiKey = process.env.CLOUDINARY_API_KEY;
		const apiSecret = process.env.CLOUDINARY_API_SECRET;
		if (!cloudName || !apiKey || !apiSecret) {
			return { ok: false, message: 'Faltan las credenciales de Cloudinary en el servidor.' };
		}

		cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

		const buffer = Buffer.from(await file.arrayBuffer());
		const result = await new Promise<{ secure_url: string; public_id: string }>(
			(resolve, reject) => {
				cloudinary.uploader
					.upload_stream(
						{
							folder: 'modern-fashion-store/hero',
							resource_type: 'image',
							overwrite: true,
							invalidate: true,
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
			},
		);

		return { ok: true, publicUrl: result.secure_url, path: result.public_id };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al subir la imagen a Cloudinary.';
		return { ok: false, message: msg };
	}
}

'use server';

import { getSessionUser } from '@/lib/firebase/auth-server';
import { uploadFromFormData, type CloudinaryUploadResult } from '@/lib/cloudinary/uploadMedia';

export type UploadSorjuanaResult = CloudinaryUploadResult;

const PRODUCT_MEDIA_FOLDER = 'modern-fashion-store/products';
const HERO_MEDIA_FOLDER = 'modern-fashion-store/hero';
const COLLECTION_COVERS_FOLDER = 'modern-fashion-store/collection/covers';
const COLLECTION_VIDEOS_FOLDER = 'modern-fashion-store/collection/videos';
const CATEGORY_SPOTLIGHT_FOLDER = 'modern-fashion-store/category-spotlights';

/**
 * Sube imagen o video de producto a Cloudinary.
 * Devuelve `publicUrl` (URL HTTPS) para guardar en Firestore (`image_url` / `image_urls` / `video_url`).
 */
export async function uploadProductMedia(formData: FormData): Promise<UploadSorjuanaResult> {
	try {
		const user = await getSessionUser();
		if (!user) {
			return { ok: false, message: 'Tenés que iniciar sesión para subir archivos.' };
		}

		const kindRaw = formData.get('kind');
		const kind = kindRaw === 'video' ? 'video' : 'image';
		return uploadFromFormData(formData, {
			folder: PRODUCT_MEDIA_FOLDER,
			kind,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error inesperado al subir el archivo.';
		return { ok: false, message: msg };
	}
}

/** Alias histórico del panel — misma lógica que `uploadProductMedia`. */
export async function uploadSorjuanaMedia(formData: FormData): Promise<UploadSorjuanaResult> {
	return uploadProductMedia(formData);
}

/** Sube imagen del hero a Cloudinary. */
export async function uploadHeroImageToCloudinary(formData: FormData): Promise<UploadSorjuanaResult> {
	try {
		const user = await getSessionUser();
		if (!user) {
			return { ok: false, message: 'Tenés que iniciar sesión para subir imágenes.' };
		}

		return uploadFromFormData(formData, {
			folder: HERO_MEDIA_FOLDER,
			kind: 'image',
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al subir la imagen a Cloudinary.';
		return { ok: false, message: msg };
	}
}

/** Portada de franja cerrada / móvil en «Nuestra colección». */
export async function uploadCollectionCoverToCloudinary(formData: FormData): Promise<UploadSorjuanaResult> {
	try {
		const user = await getSessionUser();
		if (!user) {
			return { ok: false, message: 'Tenés que iniciar sesión para subir imágenes.' };
		}

		return uploadFromFormData(formData, {
			folder: COLLECTION_COVERS_FOLDER,
			kind: 'image',
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al subir la portada a Cloudinary.';
		return { ok: false, message: msg };
	}
}

/** Video de franja expandida (hover escritorio) en «Nuestra colección». */
export async function uploadCollectionVideoToCloudinary(formData: FormData): Promise<UploadSorjuanaResult> {
	try {
		const user = await getSessionUser();
		if (!user) {
			return { ok: false, message: 'Tenés que iniciar sesión para subir videos.' };
		}

		return uploadFromFormData(formData, {
			folder: COLLECTION_VIDEOS_FOLDER,
			kind: 'video',
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al subir el video a Cloudinary.';
		return { ok: false, message: msg };
	}
}

/** Imagen de círculo en «Explorá por categoría». */
export async function uploadCategorySpotlightImageToCloudinary(
	formData: FormData,
): Promise<UploadSorjuanaResult> {
	try {
		const user = await getSessionUser();
		if (!user) {
			return { ok: false, message: 'Tenés que iniciar sesión para subir imágenes.' };
		}

		return uploadFromFormData(formData, {
			folder: CATEGORY_SPOTLIGHT_FOLDER,
			kind: 'image',
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al subir la imagen a Cloudinary.';
		return { ok: false, message: msg };
	}
}

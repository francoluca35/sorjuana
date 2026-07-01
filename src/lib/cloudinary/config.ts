import { v2 as cloudinary } from 'cloudinary';

export function configureCloudinary() {
	const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
	const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
	const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

	if (!cloudName || !apiKey || !apiSecret) {
		throw new Error('Faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.');
	}

	cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
	return cloudinary;
}

export function getCloudinaryCloudName(): string {
	return process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? 'rw8rnhpp';
}

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initAdminApp(): App {
	if (getApps().length > 0) {
		return getApps()[0]!;
	}

	const projectId =
		process.env.FIREBASE_PROJECT_ID?.trim() ||
		process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
	const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();
	let privateKey = privateKeyRaw?.replace(/\\n/g, '\n');
	if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
		privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n');
	}

	if (!projectId || !clientEmail || !privateKey) {
		throw new Error(
			'Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY (cuenta de servicio de Firebase).',
		);
	}

	return initializeApp({
		credential: cert({ projectId, clientEmail, privateKey }),
		projectId,
	});
}

export function getAdminApp(): App {
	return initAdminApp();
}

export function getAdminDb() {
	return getFirestore(getAdminApp());
}

export function getAdminAuth() {
	return getAuth(getAdminApp());
}

export const COLLECTIONS = {
	products: 'products',
	salesOrders: 'sales_orders',
	profiles: 'profiles',
	usernameIndex: 'username_index',
	siteHomeConfig: 'site_home_config',
	priceSettings: 'price_settings',
	shopCategories: 'shop_categories',
	shopSubcategories: 'shop_subcategories',
} as const;

export const SINGLETON_DOCS = {
	siteHome: 'main',
	priceSettings: 'main',
} as const;

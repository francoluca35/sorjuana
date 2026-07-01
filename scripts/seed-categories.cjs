/**
 * Carga categorías y subcategorías iniciales en Firestore.
 * Ejecutá: npm run seed:categories
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const admin = require('firebase-admin');

function initAdmin() {
	if (admin.apps.length) return admin.app();
	const projectId =
		process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
	if (privateKey?.startsWith('"') && privateKey.endsWith('"')) {
		privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n');
	}
	if (!projectId || !clientEmail || !privateKey) {
		console.error('Faltan credenciales Firebase Admin en .env.local');
		process.exit(1);
	}
	return admin.initializeApp({
		credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
		projectId,
	});
}

function slugify(input) {
	return String(input)
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'categoria';
}

const SEED = [
	{
		name: 'Francés',
		subcategories: ['Pantalón', 'Remera', 'Vestido', 'Accesorios'],
	},
	{
		name: 'Italiano',
		subcategories: ['Pantalón', 'Remera', 'Vestido', 'Accesorios'],
	},
	{
		name: 'Chic europeo',
		subcategories: ['Pantalón', 'Remera', 'Vestido'],
	},
];

async function main() {
	initAdmin();
	const db = admin.firestore();
	const now = new Date().toISOString();

	for (let i = 0; i < SEED.length; i++) {
		const cat = SEED[i];
		const catSlug = slugify(cat.name);

		const existing = await db
			.collection('shop_categories')
			.where('slug', '==', catSlug)
			.limit(1)
			.get();

		let catId;
		if (!existing.empty) {
			catId = existing.docs[0].id;
			console.log('Categoría ya existe:', cat.name);
		} else {
			const ref = db.collection('shop_categories').doc();
			catId = ref.id;
			await ref.set({
				name: cat.name,
				slug: catSlug,
				sort_order: i + 1,
				created_at: now,
				updated_at: now,
			});
			console.log('Categoría creada:', cat.name, '→', catSlug);
		}

		for (let j = 0; j < cat.subcategories.length; j++) {
			const subName = cat.subcategories[j];
			const subSlug = slugify(subName);

			const subExisting = await db
				.collection('shop_subcategories')
				.where('category_id', '==', catId)
				.where('slug', '==', subSlug)
				.limit(1)
				.get();

			if (!subExisting.empty) {
				console.log('  Sub ya existe:', subName);
				continue;
			}

			await db.collection('shop_subcategories').doc().set({
				category_id: catId,
				name: subName,
				slug: subSlug,
				sort_order: j + 1,
				created_at: now,
				updated_at: now,
			});
			console.log('  Subcategoría creada:', subName, '→', `${catSlug}/${subSlug}`);
		}
	}

	console.log('Listo. Revisá Firestore: shop_categories y shop_subcategories.');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

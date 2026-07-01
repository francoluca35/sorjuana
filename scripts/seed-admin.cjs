/**
 * Crea el usuario admin en Firebase Auth y el perfil en Firestore.
 * Definí en .env.local:
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *   FIREBASE_SEED_EMAIL
 *   FIREBASE_SEED_USERNAME
 *   FIREBASE_SEED_PASSWORD
 * Ejecutá: npm run seed:admin
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const admin = require('firebase-admin');

function initAdmin() {
	if (admin.apps.length) return admin.app();
	const projectId =
		process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
	if (!projectId || !clientEmail || !privateKey) {
		console.error(
			'Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en .env.local',
		);
		process.exit(1);
	}
	return admin.initializeApp({
		credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
		projectId,
	});
}

async function main() {
	initAdmin();
	const auth = admin.auth();
	const db = admin.firestore();

	const email = process.env.FIREBASE_SEED_EMAIL;
	const username = process.env.FIREBASE_SEED_USERNAME;
	const password = process.env.FIREBASE_SEED_PASSWORD;
	const role = process.env.FIREBASE_SEED_ROLE || 'admin';

	if (!email || !username || !password) {
		console.error(
			'Faltan FIREBASE_SEED_EMAIL, FIREBASE_SEED_USERNAME o FIREBASE_SEED_PASSWORD en .env.local',
		);
		process.exit(1);
	}

	const uLower = String(username).trim().toLowerCase();
	const emailNorm = String(email).trim().toLowerCase();
	let uid;

	try {
		const created = await auth.createUser({
			email: emailNorm,
			password,
			emailVerified: true,
		});
		uid = created.uid;
		console.log('Usuario creado en Firebase Auth.');
	} catch (createErr) {
		const dup =
			createErr.code === 'auth/email-already-exists' ||
			String(createErr.message).toLowerCase().includes('already');
		if (!dup) {
			console.error(createErr);
			process.exit(1);
		}
		const existing = await auth.getUserByEmail(emailNorm);
		uid = existing.uid;
		console.log('El email ya existía; sincronizando contraseña y perfil…');
		await auth.updateUser(uid, { password });
	}

	const now = new Date().toISOString();
	const batch = db.batch();
	batch.set(db.collection('profiles').doc(uid), {
		username: uLower,
		email: emailNorm,
		role,
		created_at: now,
	});
	batch.set(db.collection('username_index').doc(uLower), { uid });
	await batch.commit();

	console.log('Listo. Perfil:', uLower, 'rol:', role);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

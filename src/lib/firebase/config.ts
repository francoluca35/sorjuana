import { COLLECTIONS, getAdminAuth, getAdminDb, SINGLETON_DOCS } from '@/lib/firebase/admin';

export type ProfileDoc = {
	username: string;
	email: string;
	role: string;
	created_at: string;
};

export async function getProfileByUsername(username: string): Promise<(ProfileDoc & { uid: string }) | null> {
	const normalized = username.trim().toLowerCase();
	if (!normalized) return null;

	const db = getAdminDb();
	const indexSnap = await db.collection(COLLECTIONS.usernameIndex).doc(normalized).get();
	if (!indexSnap.exists) return null;

	const uid = String(indexSnap.data()?.uid ?? '');
	if (!uid) return null;

	const profileSnap = await db.collection(COLLECTIONS.profiles).doc(uid).get();
	if (!profileSnap.exists) return null;

	return { uid, ...(profileSnap.data() as ProfileDoc) };
}

export async function getProfileByUid(uid: string): Promise<ProfileDoc | null> {
	const snap = await getAdminDb().collection(COLLECTIONS.profiles).doc(uid).get();
	if (!snap.exists) return null;
	return snap.data() as ProfileDoc;
}

export async function upsertAdminProfile(args: {
	uid: string;
	username: string;
	email: string;
	role: string;
}): Promise<void> {
	const db = getAdminDb();
	const username = args.username.trim().toLowerCase();
	const email = args.email.trim().toLowerCase();
	const now = new Date().toISOString();

	const batch = db.batch();
	batch.set(db.collection(COLLECTIONS.profiles).doc(args.uid), {
		username,
		email,
		role: args.role,
		created_at: now,
	});
	batch.set(db.collection(COLLECTIONS.usernameIndex).doc(username), { uid: args.uid });
	await batch.commit();
}

export async function createFirebaseUser(email: string, password: string, metadata?: Record<string, unknown>) {
	return getAdminAuth().createUser({
		email: email.trim().toLowerCase(),
		password,
		emailVerified: true,
		displayName: typeof metadata?.username === 'string' ? metadata.username : undefined,
	});
}

export async function updateFirebaseUserPassword(uid: string, password: string) {
	await getAdminAuth().updateUser(uid, { password });
}

export async function findFirebaseUserByEmail(email: string) {
	try {
		return await getAdminAuth().getUserByEmail(email.trim().toLowerCase());
	} catch {
		return null;
	}
}

export async function getSiteHomeConfigDoc(): Promise<Record<string, unknown> | null> {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.siteHomeConfig)
		.doc(SINGLETON_DOCS.siteHome)
		.get();
	if (!snap.exists) return null;
	return snap.data() ?? null;
}

export async function upsertSiteHomeConfig(patch: Record<string, unknown>): Promise<void> {
	const ref = getAdminDb().collection(COLLECTIONS.siteHomeConfig).doc(SINGLETON_DOCS.siteHome);
	const snap = await ref.get();
	const updatedAt = new Date().toISOString();
	if (snap.exists) {
		await ref.update({ ...patch, updated_at: updatedAt });
	} else {
		await ref.set({ ...patch, updated_at: updatedAt });
	}
}

export async function getPriceSettingsDoc(): Promise<Record<string, unknown> | null> {
	const snap = await getAdminDb()
		.collection(COLLECTIONS.priceSettings)
		.doc(SINGLETON_DOCS.priceSettings)
		.get();
	if (!snap.exists) return null;
	return snap.data() ?? null;
}

export async function upsertPriceSettings(patch: Record<string, unknown>): Promise<void> {
	const ref = getAdminDb().collection(COLLECTIONS.priceSettings).doc(SINGLETON_DOCS.priceSettings);
	const updatedAt = new Date().toISOString();
	await ref.set({ ...patch, updated_at: updatedAt }, { merge: true });
}

export async function removeProductIdsFromSiteHomeConfig(removedIds: string[]): Promise<void> {
	if (removedIds.length === 0) return;
	const exclude = new Set(removedIds);
	const data = await getSiteHomeConfigDoc();
	if (!data) return;

	const filterIds = (raw: unknown, max: number) => {
		if (!Array.isArray(raw)) return [];
		return raw
			.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
			.map((x) => x.trim())
			.filter((id) => !exclude.has(id))
			.slice(0, max);
	};

	await upsertSiteHomeConfig({
		best_sellers_product_ids: filterIds(data.best_sellers_product_ids, 24),
		recent_arrivals_product_ids: filterIds(data.recent_arrivals_product_ids, 24),
	});
}

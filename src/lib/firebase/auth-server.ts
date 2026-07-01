import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, type SessionUser } from '@/lib/firebase/session';

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

export async function getSessionUser(): Promise<SessionUser | null> {
	const cookieStore = await cookies();
	const session = cookieStore.get(SESSION_COOKIE)?.value;
	if (!session) return null;

	try {
		const decoded = await getAdminAuth().verifySessionCookie(session, true);
		return { uid: decoded.uid, email: decoded.email };
	} catch {
		return null;
	}
}

export async function requireSessionUser(): Promise<SessionUser | { error: string }> {
	const user = await getSessionUser();
	if (!user) return { error: 'Tenés que iniciar sesión.' };
	return user;
}

export async function signInWithEmailPassword(email: string, password: string): Promise<string> {
	const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
	if (!apiKey) {
		throw new Error('Falta NEXT_PUBLIC_FIREBASE_API_KEY.');
	}

	const res = await fetch(
		`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, returnSecureToken: true }),
		},
	);

	const data = (await res.json()) as { idToken?: string; error?: { message?: string } };
	if (!res.ok || !data.idToken) {
		throw new Error(data.error?.message ?? 'Credenciales inválidas.');
	}
	return data.idToken;
}

export async function setSessionCookie(idToken: string): Promise<void> {
	const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
		expiresIn: SESSION_MAX_AGE_MS,
	});
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE, sessionCookie, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: SESSION_MAX_AGE_MS / 1000,
		path: '/',
		sameSite: 'lax',
	});
}

export async function clearSessionCookie(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE, '', {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		maxAge: 0,
		path: '/',
		sameSite: 'lax',
	});
}

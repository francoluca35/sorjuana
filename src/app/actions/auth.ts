'use server';

import { redirect } from 'next/navigation';
import {
	clearSessionCookie,
	getSessionUser,
	setSessionCookie,
	signInWithEmailPassword,
} from '@/lib/firebase/auth-server';
import {
	findFirebaseUserByEmail,
} from '@/lib/firebase/config';

export type LoginResult = { ok: true } | { ok: false; message: string };

export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
	try {
		const normalized = email.trim().toLowerCase();
		if (!normalized || !password) {
			return { ok: false, message: 'Completá email y contraseña.' };
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
			return { ok: false, message: 'Ingresá un email válido.' };
		}

		const idToken = await signInWithEmailPassword(normalized, password);
		await setSessionCookie(idToken);
		return { ok: true };
	} catch (e) {
		if (process.env.NODE_ENV === 'development') {
			console.error('[login]', e);
		}
		return { ok: false, message: 'Email o contraseña incorrectos.' };
	}
}

export async function logout() {
	await clearSessionCookie();
	redirect('/login');
}

export async function getCurrentAuthUser() {
	return getSessionUser();
}

export async function resolveEmailFromAuth(email: string): Promise<boolean> {
	const user = await findFirebaseUserByEmail(email);
	return Boolean(user);
}

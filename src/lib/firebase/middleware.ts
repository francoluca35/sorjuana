import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE } from '@/lib/firebase/session';

export async function updateSession(request: NextRequest) {
	let response = NextResponse.next({ request });

	const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = process.env.FIREBASE_PRIVATE_KEY;

	if (!projectId || !clientEmail || !privateKey) {
		return response;
	}

	const session = request.cookies.get(SESSION_COOKIE)?.value;
	let user: { uid: string } | null = null;

	if (session) {
		try {
			const { getAdminAuth } = await import('@/lib/firebase/admin');
			const decoded = await getAdminAuth().verifySessionCookie(session, true);
			user = { uid: decoded.uid };
		} catch {
			user = null;
		}
	}

	const pathname = request.nextUrl.pathname;
	const isLoginPath = pathname === '/login' || pathname === '/login/';

	if (pathname.startsWith('/app') && !user) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	if (isLoginPath && user) {
		return NextResponse.redirect(new URL('/app/dashboard', request.url));
	}

	return response;
}

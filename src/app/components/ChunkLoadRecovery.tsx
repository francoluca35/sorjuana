'use client';

import { useEffect } from 'react';

const RELOAD_QS = '_chunk';

/**
 * Tras un rebuild o reinicio de `next dev`, el navegador puede seguir pidiendo un
 * `page.js` viejo y Webpack lanza ChunkLoadError. Un reload forzado suele alinear
 * el documento con los hashes actuales de `/_next/static/`.
 */
export function ChunkLoadRecovery() {
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const url = new URL(window.location.href);
		if (url.searchParams.has(RELOAD_QS)) {
			url.searchParams.delete(RELOAD_QS);
			const next = url.pathname + (url.search ? url.search : '') + url.hash;
			window.history.replaceState({}, '', next);
		}

		const reloadOnce = () => {
			const u = new URL(window.location.href);
			if (u.searchParams.has(RELOAD_QS)) return;
			u.searchParams.set(RELOAD_QS, '1');
			window.location.replace(u.toString());
		};

		const onError = (ev: ErrorEvent) => {
			const t = ev.target;
			if (t instanceof HTMLScriptElement && t.src?.includes('/_next/static/')) {
				reloadOnce();
				return;
			}
			const msg = ev.message || '';
			if (
				msg.includes('ChunkLoadError') ||
				msg.includes('Loading chunk') ||
				msg.includes('Importing a module script failed')
			) {
				reloadOnce();
				return;
			}
			const err = ev.error;
			if (err instanceof Error && err.name === 'ChunkLoadError') reloadOnce();
		};

		const onRejection = (ev: PromiseRejectionEvent) => {
			const r = ev.reason;
			const name = r instanceof Error ? r.name : '';
			const msg = r instanceof Error ? r.message : String(r ?? '');
			if (name === 'ChunkLoadError' || msg.includes('Loading chunk') || msg.includes('ChunkLoadError')) {
				ev.preventDefault();
				reloadOnce();
			}
		};

		window.addEventListener('error', onError, true);
		window.addEventListener('unhandledrejection', onRejection);
		return () => {
			window.removeEventListener('error', onError, true);
			window.removeEventListener('unhandledrejection', onRejection);
		};
	}, []);

	/** `sw.js` suele ser un SW viejo (otra app o PWA) que intercepta `localhost` y rompe el fetch. */
	useEffect(() => {
		if (process.env.NODE_ENV !== 'development') return;
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
		void navigator.serviceWorker.getRegistrations().then((regs) => {
			for (const r of regs) void r.unregister();
		});
	}, []);

	return null;
}

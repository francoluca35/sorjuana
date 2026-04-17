'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchSiteHomeConfig } from '@/lib/data/siteHomeConfig';
import { BEST_SELLERS_MAX } from '@/lib/bestSellersSelection';
import type { HeroSlide } from '@/lib/heroSlidesConfig';
import { parseStoredProductIds, RECENT_ARRIVALS_MAX } from '@/lib/recentArrivalsSelection';

async function requireAuthUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	if (error || !user) return { ok: false as const, message: 'Tenés que iniciar sesión.' };
	return { ok: true as const, supabase, user };
}

function revalidateHome() {
	revalidatePath('/');
	revalidatePath('/app/mapa-pagina');
}

/** Lectura pública de IDs (cliente tras eventos / refresco). */
export async function getSiteHomeStoredIdsAction(): Promise<{ best: string; recent: string }> {
	const cfg = await fetchSiteHomeConfig();
	return { best: cfg.bestSellersIdsJson, recent: cfg.recentArrivalsIdsJson };
}

export async function getSiteHomeConfigAction() {
	return fetchSiteHomeConfig();
}

export async function saveHeroSlidesAction(slides: HeroSlide[]): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		const payload = JSON.parse(JSON.stringify(slides)) as unknown;
		const { error } = await auth.supabase
			.from('site_home_config')
			.update({
				hero_slides: payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', 1);

		if (error) {
			return {
				ok: false,
				message:
					error.message.includes('row') || error.code === 'PGRST116'
						? 'No se encontró la fila de configuración. Ejecutá las migraciones de Supabase (site_home_config).'
						: error.message,
			};
		}
		revalidateHome();
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al guardar el hero.';
		return { ok: false, message: msg };
	}
}

export async function saveBestSellersIdsAction(ids: string[]): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	const normalized = parseStoredProductIds(JSON.stringify(ids), BEST_SELLERS_MAX);
	const { error } = await auth.supabase
		.from('site_home_config')
		.update({
			best_sellers_product_ids: normalized,
			updated_at: new Date().toISOString(),
		})
		.eq('id', 1);

	if (error) {
		return { ok: false, message: error.message };
	}
	revalidateHome();
	return { ok: true };
}

export async function saveRecentArrivalsIdsAction(ids: string[]): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	const normalized = parseStoredProductIds(JSON.stringify(ids), RECENT_ARRIVALS_MAX);
	const { error } = await auth.supabase
		.from('site_home_config')
		.update({
			recent_arrivals_product_ids: normalized,
			updated_at: new Date().toISOString(),
		})
		.eq('id', 1);

	if (error) {
		return { ok: false, message: error.message };
	}
	revalidateHome();
	return { ok: true };
}

/** Limpia la selección guardada (vuelve al fallback por fecha). */
export async function clearBestSellersIdsAction(): Promise<{ ok: boolean; message?: string }> {
	return saveBestSellersIdsAction([]);
}

export async function clearRecentArrivalsIdsAction(): Promise<{ ok: boolean; message?: string }> {
	return saveRecentArrivalsIdsAction([]);
}

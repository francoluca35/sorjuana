'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchSiteHomeConfig } from '@/lib/data/siteHomeConfig';
import { BEST_SELLERS_MAX } from '@/lib/bestSellersSelection';
import type { CategorySpotlightRailItem } from '@/lib/categorySpotlightRailConfig';
import type { FashionCategoryPanel } from '@/lib/fashionCategoryPanelsConfig';
import type { HeroSlide } from '@/lib/heroSlidesConfig';
import {
	HERO_SLIDES_MAX,
	HERO_SLIDES_MIN,
	normalizeHeroSlidesForPublish,
} from '@/lib/heroSlidesConfig';
import {
	normalizeHeroContent,
	type HeroContentConfig,
} from '@/lib/heroContentConfig';
import { parseStoredProductIds, RECENT_ARRIVALS_MAX } from '@/lib/recentArrivalsSelection';
import {
	normalizeReturnPolicy,
	type ReturnPolicyConfig,
} from '@/lib/returnPolicyConfig';

import {
	normalizeTermsConditions,
	type TermsConditionsConfig,
} from '@/lib/termsConditionsConfig';

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

function revalidateReturnPolicy() {
	revalidatePath('/politica-cambios-devoluciones');
	revalidatePath('/app/mapa-pagina');
}

function revalidateTermsConditions() {
	revalidatePath('/terminos-y-condiciones');
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

	if (slides.length < HERO_SLIDES_MIN || slides.length > HERO_SLIDES_MAX) {
		return {
			ok: false,
			message: `El carrusel debe tener entre ${HERO_SLIDES_MIN} y ${HERO_SLIDES_MAX} slides.`,
		};
	}

	try {
		const normalized = normalizeHeroSlidesForPublish(slides);
		const payload = JSON.parse(JSON.stringify(normalized)) as unknown;
		const updatedAt = new Date().toISOString();
		const { data: updatedRow, error: updateError } = await auth.supabase
			.from('site_home_config')
			.update({
				hero_slides: payload,
				updated_at: updatedAt,
			})
			.eq('id', 1)
			.select('id')
			.maybeSingle();

		if (updateError) {
			return {
				ok: false,
				message:
					updateError.message.includes('row') || updateError.code === 'PGRST116'
						? 'No se encontró la fila de configuración. Ejecutá las migraciones de Supabase (site_home_config).'
						: updateError.message,
			};
		}

		if (!updatedRow) {
			const { error: upsertError } = await auth.supabase.from('site_home_config').upsert(
				{
					id: 1,
					hero_slides: payload,
					updated_at: updatedAt,
				},
				{ onConflict: 'id' },
			);
			if (upsertError) {
				return {
					ok: false,
					message:
						'No se pudo guardar el hero (¿existe `site_home_config` con id=1?). Ejecutá las migraciones de Supabase.',
				};
			}
		}

		revalidateHome();
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al guardar el hero.';
		return { ok: false, message: msg };
	}
}

export async function saveHeroContentAction(
	content: HeroContentConfig,
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	const normalized = normalizeHeroContent(content);

	try {
		const payload = JSON.parse(JSON.stringify(normalized)) as unknown;
		const { data, error } = await auth.supabase
			.from('site_home_config')
			.update({
				hero_content: payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', 1)
			.select('id');

		if (error) {
			return {
				ok: false,
				message:
					error.message.includes('hero_content') || error.code === '42703'
						? 'Falta la columna en la base: ejecutá la migración `20260531140000_site_home_hero_content.sql`.'
						: error.message,
			};
		}
		if (!data?.length) {
			return {
				ok: false,
				message:
					'No se actualizó ninguna fila (¿existe `site_home_config` con id=1?). Creá la fila o revisá permisos RLS.',
			};
		}
		revalidateHome();
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al guardar los textos del hero.';
		return { ok: false, message: msg };
	}
}

export async function saveCategorySpotlightRailAction(
	items: CategorySpotlightRailItem[],
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		const payload = JSON.parse(JSON.stringify(items)) as unknown;
		const { data, error } = await auth.supabase
			.from('site_home_config')
			.update({
				category_spotlight_rail: payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', 1)
			.select('id');

		if (error) {
			return {
				ok: false,
				message:
					error.message.includes('category_spotlight_rail') || error.code === '42703'
						? 'Falta la columna en la base: ejecutá la migración `20260507130000_site_home_category_spotlight_rail.sql`.'
						: error.message,
			};
		}
		if (!data?.length) {
			return {
				ok: false,
				message:
					'No se actualizó ninguna fila (¿existe `site_home_config` con id=1?). Creá la fila o revisá permisos RLS.',
			};
		}
		revalidateHome();
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al guardar las categorías.';
		return { ok: false, message: msg };
	}
}

export async function saveFashionCategoryPanelsAction(
	panels: FashionCategoryPanel[],
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		const payload = JSON.parse(JSON.stringify(panels)) as unknown;
		const { data, error } = await auth.supabase
			.from('site_home_config')
			.update({
				fashion_category_panels: payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', 1)
			.select('id');

		if (error) {
			return {
				ok: false,
				message:
					error.message.includes('fashion_category_panels') || error.code === '42703'
						? 'Falta la columna en la base: ejecutá la migración `20260507120000_site_home_fashion_panels.sql`.'
						: error.message,
			};
		}
		if (!data?.length) {
			return {
				ok: false,
				message:
					'No se actualizó ninguna fila (¿existe `site_home_config` con id=1?). Creá la fila o revisá permisos RLS.',
			};
		}
		revalidateHome();
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al guardar la colección.';
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

export async function saveReturnPolicyAction(
	policy: ReturnPolicyConfig,
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	const normalized = normalizeReturnPolicy(policy);

	try {
		const payload = JSON.parse(JSON.stringify(normalized)) as unknown;
		const { data, error } = await auth.supabase
			.from('site_home_config')
			.update({
				return_policy: payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', 1)
			.select('id');

		if (error) {
			return {
				ok: false,
				message:
					error.message.includes('return_policy') || error.code === '42703'
						? 'Falta la columna en la base: ejecutá la migración `20260531120000_site_home_return_policy.sql`.'
						: error.message,
			};
		}
		if (!data?.length) {
			return {
				ok: false,
				message:
					'No se actualizó ninguna fila (¿existe `site_home_config` con id=1?). Creá la fila o revisá permisos RLS.',
			};
		}
		revalidateReturnPolicy();
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al guardar la política.';
		return { ok: false, message: msg };
	}
}

export async function saveTermsConditionsAction(
	terms: TermsConditionsConfig,
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	const normalized = normalizeTermsConditions(terms);

	try {
		const payload = JSON.parse(JSON.stringify(normalized)) as unknown;
		const { data, error } = await auth.supabase
			.from('site_home_config')
			.update({
				terms_conditions: payload,
				updated_at: new Date().toISOString(),
			})
			.eq('id', 1)
			.select('id');

		if (error) {
			return {
				ok: false,
				message:
					error.message.includes('terms_conditions') || error.code === '42703'
						? 'Falta la columna en la base: ejecutá la migración `20260603130000_site_home_terms_conditions.sql`.'
						: error.message,
			};
		}
		if (!data?.length) {
			return {
				ok: false,
				message:
					'No se actualizó ninguna fila (¿existe `site_home_config` con id=1?). Creá la fila o revisá permisos RLS.',
			};
		}
		revalidateTermsConditions();
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Error al guardar los términos.';
		return { ok: false, message: msg };
	}
}

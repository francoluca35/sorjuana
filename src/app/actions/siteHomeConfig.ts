'use server';

import { revalidatePath } from 'next/cache';
import { requireSessionUser } from '@/lib/firebase/auth-server';
import { removeProductIdsFromSiteHomeConfig, upsertSiteHomeConfig } from '@/lib/firebase/config';
import { fetchSiteHomeConfig } from '@/lib/data/siteHomeConfig';
import { BEST_SELLERS_MAX } from '@/lib/bestSellersSelection';
import type { CategorySpotlightRailItem } from '@/lib/categorySpotlightRailConfig';
import { normalizeCategorySpotlightRailForPublish } from '@/lib/categorySpotlightRailConfig';
import {
	FASHION_CATEGORY_PANEL_COUNT,
	normalizeFashionCategoryPanelsForPublish,
	type FashionCategoryPanel,
} from '@/lib/fashionCategoryPanelsConfig';
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
import { parseStoredProductIds, RECENT_ARRIVALS_MAX, RECENT_ARRIVALS_MIN } from '@/lib/recentArrivalsSelection';
import {
	normalizeReturnPolicy,
	type ReturnPolicyConfig,
} from '@/lib/returnPolicyConfig';
import {
	normalizeTermsConditions,
	type TermsConditionsConfig,
} from '@/lib/termsConditionsConfig';

async function requireAuthUser() {
	const user = await requireSessionUser();
	if ('error' in user) return { ok: false as const, message: user.error };
	return { ok: true as const, user };
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
		await upsertSiteHomeConfig({
			hero_slides: JSON.parse(JSON.stringify(normalized)),
		});
		revalidateHome();
		return { ok: true };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : 'Error al guardar el hero.' };
	}
}

export async function saveHeroContentAction(
	content: HeroContentConfig,
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		await upsertSiteHomeConfig({
			hero_content: JSON.parse(JSON.stringify(normalizeHeroContent(content))),
		});
		revalidateHome();
		return { ok: true };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : 'Error al guardar los textos del hero.' };
	}
}

export async function saveCategorySpotlightRailAction(
	items: CategorySpotlightRailItem[],
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		if (!items.length) {
			return { ok: false, message: 'Agregá al menos una categoría al carrusel.' };
		}
		const normalized = normalizeCategorySpotlightRailForPublish(items);
		await upsertSiteHomeConfig({
			category_spotlight_rail: JSON.parse(JSON.stringify(normalized)),
		});
		revalidateHome();
		return { ok: true };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : 'Error al guardar las categorías.' };
	}
}

export async function saveFashionCategoryPanelsAction(
	panels: FashionCategoryPanel[],
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		if (panels.length !== FASHION_CATEGORY_PANEL_COUNT) {
			return {
				ok: false,
				message: `La colección debe tener exactamente ${FASHION_CATEGORY_PANEL_COUNT} franjas.`,
			};
		}
		const normalized = normalizeFashionCategoryPanelsForPublish(panels);
		await upsertSiteHomeConfig({
			fashion_category_panels: JSON.parse(JSON.stringify(normalized)),
		});
		revalidateHome();
		return { ok: true };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : 'Error al guardar la colección.' };
	}
}

export async function saveBestSellersIdsAction(ids: string[]): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		const normalized = parseStoredProductIds(JSON.stringify(ids), BEST_SELLERS_MAX);
		await upsertSiteHomeConfig({ best_sellers_product_ids: normalized });
		revalidateHome();
		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : 'No se pudo guardar Más vendidos en Firestore.',
		};
	}
}

export async function fetchProductSoldQuantitiesAction(): Promise<Record<string, number>> {
	const auth = await requireAuthUser();
	if (!auth.ok) return {};

	const { fetchProductSoldQuantitiesRecord } = await import('@/lib/data/productSoldQuantities');
	return fetchProductSoldQuantitiesRecord();
}

export async function saveRecentArrivalsIdsAction(ids: string[]): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		const normalized = parseStoredProductIds(JSON.stringify(ids), RECENT_ARRIVALS_MAX);
		if (normalized.length > 0 && normalized.length < RECENT_ARRIVALS_MIN) {
			return {
				ok: false,
				message: `Elegí entre ${RECENT_ARRIVALS_MIN} y ${RECENT_ARRIVALS_MAX} productos para Recién llegados.`,
			};
		}
		await upsertSiteHomeConfig({ recent_arrivals_product_ids: normalized });
		revalidateHome();
		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : 'No se pudo guardar Recién llegados en Firestore.',
		};
	}
}

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

	try {
		await upsertSiteHomeConfig({
			return_policy: JSON.parse(JSON.stringify(normalizeReturnPolicy(policy))),
		});
		revalidateReturnPolicy();
		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : 'No se pudo guardar la política en Firestore.',
		};
	}
}

export async function saveTermsConditionsAction(
	terms: TermsConditionsConfig,
): Promise<{ ok: boolean; message?: string }> {
	const auth = await requireAuthUser();
	if (!auth.ok) return auth;

	try {
		await upsertSiteHomeConfig({
			terms_conditions: JSON.parse(JSON.stringify(normalizeTermsConditions(terms))),
		});
		revalidateTermsConditions();
		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			message: e instanceof Error ? e.message : 'No se pudieron guardar los términos en Firestore.',
		};
	}
}

export { removeProductIdsFromSiteHomeConfig };

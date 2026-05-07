import { createClient } from '@/lib/supabase/server';
import { BEST_SELLERS_MAX } from '@/lib/bestSellersSelection';
import {
	parseCategorySpotlightRailFromJson,
	type CategorySpotlightRailItem,
} from '@/lib/categorySpotlightRailConfig';
import {
	parseFashionCategoryPanelsFromJson,
	type FashionCategoryPanel,
} from '@/lib/fashionCategoryPanelsConfig';
import {
	parseHeroSlidesFromJson,
	type HeroSlide,
} from '@/lib/heroSlidesConfig';
import { RECENT_ARRIVALS_MAX, serializeProductIds } from '@/lib/recentArrivalsSelection';

export type SiteHomeConfigDTO = {
	heroSlides: HeroSlide[] | null;
	fashionCategoryPanels: FashionCategoryPanel[] | null;
	categorySpotlightRail: CategorySpotlightRailItem[] | null;
	bestSellersIdsJson: string;
	recentArrivalsIdsJson: string;
};

function asStringArray(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

/** Lee la config del inicio (Server Components / RSC). */
export async function fetchSiteHomeConfig(): Promise<SiteHomeConfigDTO> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from('site_home_config')
		.select(
			'hero_slides, fashion_category_panels, category_spotlight_rail, best_sellers_product_ids, recent_arrivals_product_ids',
		)
		.eq('id', 1)
		.maybeSingle();

	if (error || !data) {
		return {
			heroSlides: null,
			fashionCategoryPanels: null,
			categorySpotlightRail: null,
			bestSellersIdsJson: serializeProductIds([], BEST_SELLERS_MAX),
			recentArrivalsIdsJson: serializeProductIds([], RECENT_ARRIVALS_MAX),
		};
	}

	const heroParsed = parseHeroSlidesFromJson(data.hero_slides);
	const fashionParsed = parseFashionCategoryPanelsFromJson(data.fashion_category_panels);
	const categoryRailParsed = parseCategorySpotlightRailFromJson(data.category_spotlight_rail);
	const bestArr = asStringArray(data.best_sellers_product_ids);
	const recentArr = asStringArray(data.recent_arrivals_product_ids);

	return {
		heroSlides: heroParsed,
		fashionCategoryPanels: fashionParsed,
		categorySpotlightRail: categoryRailParsed,
		bestSellersIdsJson: serializeProductIds(bestArr, BEST_SELLERS_MAX),
		recentArrivalsIdsJson: serializeProductIds(recentArr, RECENT_ARRIVALS_MAX),
	};
}

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
	parseHeroContentFromJson,
	type HeroContentConfig,
} from '@/lib/heroContentConfig';
import {
	parseHeroSlidesFromJson,
	type HeroSlide,
} from '@/lib/heroSlidesConfig';
import {
	parseReturnPolicyFromJson,
	type ReturnPolicyConfig,
} from '@/lib/returnPolicyConfig';
import { RECENT_ARRIVALS_MAX, serializeProductIds } from '@/lib/recentArrivalsSelection';

export type SiteHomeConfigDTO = {
	heroSlides: HeroSlide[] | null;
	heroContent: HeroContentConfig | null;
	fashionCategoryPanels: FashionCategoryPanel[] | null;
	categorySpotlightRail: CategorySpotlightRailItem[] | null;
	bestSellersIdsJson: string;
	recentArrivalsIdsJson: string;
	returnPolicy: ReturnPolicyConfig | null;
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
			'hero_slides, hero_content, fashion_category_panels, category_spotlight_rail, best_sellers_product_ids, recent_arrivals_product_ids, return_policy',
		)
		.eq('id', 1)
		.maybeSingle();

	if (error || !data) {
		return {
			heroSlides: null,
			heroContent: null,
			fashionCategoryPanels: null,
			categorySpotlightRail: null,
			bestSellersIdsJson: serializeProductIds([], BEST_SELLERS_MAX),
			recentArrivalsIdsJson: serializeProductIds([], RECENT_ARRIVALS_MAX),
			returnPolicy: null,
		};
	}

	const heroParsed = parseHeroSlidesFromJson(data.hero_slides);
	const heroContentParsed = parseHeroContentFromJson(data.hero_content);
	const fashionParsed = parseFashionCategoryPanelsFromJson(data.fashion_category_panels);
	const categoryRailParsed = parseCategorySpotlightRailFromJson(data.category_spotlight_rail);
	const returnPolicyParsed = parseReturnPolicyFromJson(data.return_policy);
	const bestArr = asStringArray(data.best_sellers_product_ids);
	const recentArr = asStringArray(data.recent_arrivals_product_ids);

	return {
		heroSlides: heroParsed,
		heroContent: heroContentParsed,
		fashionCategoryPanels: fashionParsed,
		categorySpotlightRail: categoryRailParsed,
		bestSellersIdsJson: serializeProductIds(bestArr, BEST_SELLERS_MAX),
		recentArrivalsIdsJson: serializeProductIds(recentArr, RECENT_ARRIVALS_MAX),
		returnPolicy: returnPolicyParsed,
	};
}

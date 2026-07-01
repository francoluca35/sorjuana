import { unstable_noStore as noStore } from 'next/cache';
import { getSiteHomeConfigDoc } from '@/lib/firebase/config';
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
import {
	parseTermsConditionsFromJson,
	type TermsConditionsConfig,
} from '@/lib/termsConditionsConfig';
import { RECENT_ARRIVALS_MAX, serializeProductIds } from '@/lib/recentArrivalsSelection';

export type SiteHomeConfigDTO = {
	heroSlides: HeroSlide[] | null;
	heroContent: HeroContentConfig | null;
	fashionCategoryPanels: FashionCategoryPanel[] | null;
	categorySpotlightRail: CategorySpotlightRailItem[] | null;
	bestSellersIdsJson: string;
	recentArrivalsIdsJson: string;
	returnPolicy: ReturnPolicyConfig | null;
	termsConditions: TermsConditionsConfig | null;
};

function asStringArray(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

const EMPTY_SITE_HOME: SiteHomeConfigDTO = {
	heroSlides: null,
	heroContent: null,
	fashionCategoryPanels: null,
	categorySpotlightRail: null,
	bestSellersIdsJson: serializeProductIds([], BEST_SELLERS_MAX),
	recentArrivalsIdsJson: serializeProductIds([], RECENT_ARRIVALS_MAX),
	returnPolicy: null,
	termsConditions: null,
};

export async function fetchSiteHomeConfig(): Promise<SiteHomeConfigDTO> {
	noStore();
	try {
		const data = await getSiteHomeConfigDoc();
		if (!data) return EMPTY_SITE_HOME;

		const heroParsed = parseHeroSlidesFromJson(data.hero_slides);
		const fashionParsed = parseFashionCategoryPanelsFromJson(data.fashion_category_panels);
		const categoryRailParsed = parseCategorySpotlightRailFromJson(data.category_spotlight_rail);
		const heroContentParsed = parseHeroContentFromJson(data.hero_content);
		const returnPolicyParsed = parseReturnPolicyFromJson(data.return_policy);
		const termsConditionsParsed = parseTermsConditionsFromJson(data.terms_conditions);
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
			termsConditions: termsConditionsParsed,
		};
	} catch (e) {
		console.error('[fetchSiteHomeConfig]', e);
		return EMPTY_SITE_HOME;
	}
}

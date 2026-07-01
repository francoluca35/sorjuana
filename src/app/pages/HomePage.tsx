import { HeroCarouselClient } from '../components/HeroCarouselClient';

import { FashionCategories } from '../components/FashionCategories';

import { AdminCategorySpotlightRail } from '../components/AdminCategorySpotlightRail';

import { HomeFeaturedCarousel } from '../components/HomeFeaturedCarousel';

import { AboutSection } from '../components/AboutSection';

import { PopularProducts } from '../components/PopularProducts';

import { NewArrivals } from '../components/NewArrivals';

import { ContactSection } from '../components/ContactSection';

import { fetchHomeCatalogPool } from '@/lib/data/recentProducts';

import { fetchProductSoldQuantitiesMap } from '@/lib/data/productSoldQuantities';

import { fetchCategorySpotlights } from '@/lib/data/categorySpotlights';

import { fetchSiteHomeConfig } from '@/lib/data/siteHomeConfig';

import { BEST_SELLERS_MAX, pickProductsByTopSoldWithFallback } from '@/lib/bestSellersSelection';



export async function HomePage() {

	const siteHome = await fetchSiteHomeConfig();

	const [homeCatalog, categorySpotlights, soldMap] = await Promise.all([

		fetchHomeCatalogPool({

			recentLimit: 24,

			recentArrivalsIdsJson: siteHome.recentArrivalsIdsJson,

			bestSellersIdsJson: siteHome.bestSellersIdsJson,

		}),

		fetchCategorySpotlights(),

		fetchProductSoldQuantitiesMap(),

	]);

	const bestSellersAutoFallback = pickProductsByTopSoldWithFallback(homeCatalog, soldMap, BEST_SELLERS_MAX);



	return (

		<>

			<HeroCarouselClient initialSlides={siteHome.heroSlides} />

			<AdminCategorySpotlightRail items={categorySpotlights} compact />

			<HomeFeaturedCarousel

				products={homeCatalog}

				bestSellersIdsJson={siteHome.bestSellersIdsJson}

				bestSellersAutoFallback={bestSellersAutoFallback}

			/>

			<FashionCategories panels={siteHome.fashionCategoryPanels} />

			<PopularProducts
				products={homeCatalog}
				bestSellersIdsJson={siteHome.bestSellersIdsJson}
				bestSellersAutoFallback={bestSellersAutoFallback}
			/>

			<NewArrivals products={homeCatalog} recentArrivalsIdsJson={siteHome.recentArrivalsIdsJson} />

			<AboutSection />

			<ContactSection />

		</>

	);

}


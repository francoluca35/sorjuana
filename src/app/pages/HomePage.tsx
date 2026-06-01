import { HeroCarouselClient } from '../components/HeroCarouselClient';

import { FashionCategories } from '../components/FashionCategories';

import { AdminCategorySpotlightRail } from '../components/AdminCategorySpotlightRail';

import { HomeFeaturedCarousel } from '../components/HomeFeaturedCarousel';

import { AboutSection } from '../components/AboutSection';

import { PopularProducts } from '../components/PopularProducts';

import { NewArrivals } from '../components/NewArrivals';

import { ContactSection } from '../components/ContactSection';

import { fetchRecentProducts } from '@/lib/data/recentProducts';

import { fetchCategorySpotlights } from '@/lib/data/categorySpotlights';

import { fetchSiteHomeConfig } from '@/lib/data/siteHomeConfig';
import { DEFAULT_HERO_CONTENT } from '@/lib/heroContentConfig';



export async function HomePage() {

	const [homeCatalog, categorySpotlights, siteHome] = await Promise.all([

		fetchRecentProducts(24),

		fetchCategorySpotlights(),

		fetchSiteHomeConfig(),

	]);



	return (

		<>

			<HeroCarouselClient
				initialSlides={siteHome.heroSlides}
				initialHeroContent={siteHome.heroContent ?? DEFAULT_HERO_CONTENT}
			/>

			<AdminCategorySpotlightRail items={categorySpotlights} compact />

			<HomeFeaturedCarousel

				products={homeCatalog}

				bestSellersIdsJson={siteHome.bestSellersIdsJson}

			/>

			<FashionCategories panels={siteHome.fashionCategoryPanels} />

			<PopularProducts products={homeCatalog} bestSellersIdsJson={siteHome.bestSellersIdsJson} />

			<NewArrivals products={homeCatalog} recentArrivalsIdsJson={siteHome.recentArrivalsIdsJson} />

			<AboutSection />

			<ContactSection />

		</>

	);

}


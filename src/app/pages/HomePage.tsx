import { HeroCarouselClient } from '../components/HeroCarouselClient';
import { StoreBenefits } from '../components/StoreBenefits';
import { FashionCategories } from '../components/FashionCategories';
import { AdminCategorySpotlightRail } from '../components/AdminCategorySpotlightRail';
import { AboutSection } from '../components/AboutSection';
import { PopularProducts } from '../components/PopularProducts';
import { NewArrivals } from '../components/NewArrivals';
import { ContactSection } from '../components/ContactSection';
import { fetchRecentProducts } from '@/lib/data/recentProducts';
import { fetchCategorySpotlights } from '@/lib/data/categorySpotlights';
import { fetchSiteHomeConfig } from '@/lib/data/siteHomeConfig';

export async function HomePage() {
  const [homeCatalog, categorySpotlights, siteHome] = await Promise.all([
    fetchRecentProducts(24),
    fetchCategorySpotlights(),
    fetchSiteHomeConfig(),
  ]);

  return (
    <>
      <HeroCarouselClient initialSlides={siteHome.heroSlides} />
      <StoreBenefits />
      <FashionCategories panels={siteHome.fashionCategoryPanels} />
      <AdminCategorySpotlightRail items={categorySpotlights} />

      <PopularProducts products={homeCatalog} bestSellersIdsJson={siteHome.bestSellersIdsJson} />
      <NewArrivals products={homeCatalog} recentArrivalsIdsJson={siteHome.recentArrivalsIdsJson} />
      <AboutSection />
      <ContactSection />
    </>
  );
}

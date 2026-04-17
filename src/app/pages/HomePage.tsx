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

export async function HomePage() {
  const [recienLlegados, categorySpotlights] = await Promise.all([
    fetchRecentProducts(24),
    fetchCategorySpotlights(),
  ]);

  return (
    <>
      <HeroCarouselClient />
      <StoreBenefits />
      <FashionCategories />
      <AdminCategorySpotlightRail items={categorySpotlights} />

      <PopularProducts />
      <NewArrivals products={recienLlegados} />
      <AboutSection />
      <ContactSection />
    </>
  );
}

import { HeroCarouselClient } from '../components/HeroCarouselClient';
import { StoreBenefits } from '../components/StoreBenefits';
import { FashionCategories } from '../components/FashionCategories';
import { AboutSection } from '../components/AboutSection';
import { PopularProducts } from '../components/PopularProducts';
import { NewArrivals } from '../components/NewArrivals';
import { ContactSection } from '../components/ContactSection';
import { fetchRecentProducts } from '@/lib/data/recentProducts';

export async function HomePage() {
  const recienLlegados = await fetchRecentProducts(80);

  return (
    <>
      <HeroCarouselClient />
      <StoreBenefits />


      <PopularProducts />
      <NewArrivals products={recienLlegados} />
      <AboutSection />
      <ContactSection />
    </>
  );
}

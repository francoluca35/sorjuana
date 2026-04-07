import { HeroCarouselClient } from '../components/HeroCarouselClient';
import { StoreBenefits } from '../components/StoreBenefits';
import { FashionCategories } from '../components/FashionCategories';
import { AboutSection } from '../components/AboutSection';
import { PopularProducts } from '../components/PopularProducts';
import { NewArrivals } from '../components/NewArrivals';
import { ContactSection } from '../components/ContactSection';

export function HomePage() {
  return (
    <>
      <HeroCarouselClient />
      <StoreBenefits />
      <FashionCategories />
      <AboutSection />
      <PopularProducts />
      <NewArrivals />
      <ContactSection />
    </>
  );
}

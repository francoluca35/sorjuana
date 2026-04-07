'use client';

import dynamic from 'next/dynamic';

const HeroCarousel = dynamic(
  () => import('./HeroCarousel').then((m) => ({ default: m.HeroCarousel })),
  {
    ssr: false,
    loading: () => (
      <div
        className="pt-20 min-h-[70vh] bg-[#f5f2ed]"
        aria-busy="true"
        aria-label="Cargando carrusel"
      />
    ),
  }
);

export function HeroCarouselClient() {
  return <HeroCarousel />;
}

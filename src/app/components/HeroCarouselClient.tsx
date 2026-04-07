'use client';

import dynamic from 'next/dynamic';

const HeroCarousel = dynamic(
  () => import('./HeroCarousel').then((m) => ({ default: m.HeroCarousel })),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[100dvh] bg-[#1a1410]"
        aria-busy="true"
        aria-label="Cargando carrusel"
      />
    ),
  }
);

export function HeroCarouselClient() {
  return <HeroCarousel />;
}

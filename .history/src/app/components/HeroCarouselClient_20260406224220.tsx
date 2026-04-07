'use client';

import dynamic from 'next/dynamic';

const HeroCarousel = dynamic(
  () => import('./HeroCarousel').then((m) => ({ default: m.HeroCarousel })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[calc(100dvh-var(--nav-height))] bg-[#f5f2ed]"
        aria-busy="true"
        aria-label="Cargando carrusel"
      />
    ),
  }
);

export function HeroCarouselClient() {
  return <HeroCarousel />;
}

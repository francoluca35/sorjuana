'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ArrowUpRight, Plus, ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useCart } from '@/app/context/CartContext';

type HeroHotspot = {
  id: string;
  /** Posición vertical sobre la foto (ej. `42%`) */
  top: string;
  /** Posición horizontal (ej. `38%`) */
  left: string;
  productName: string;
  price: number;
  /** Miniatura para el modal (prenda añadida al carrito). */
  thumbnailSrc: string;
};

type HeroSlide = {
  id: number;
  title: string;
  image: string;
  imageMobile?: string;
  filter: 'all' | 'italiana' | 'francesa';
  hotspots: HeroHotspot[];
};

const HERO_AUTOPLAY_MS = 8000;

const slides: HeroSlide[] = [
  {
    id: 1,
    title: 'ALTA COSTURA FRANCESA',
    image:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=85',
    imageMobile:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=85',
    filter: 'francesa',
    hotspots: [
      {
        id: 'hero-h1a',
        top: '36%',
        left: '44%',
        productName: 'Blusa encaje Saint-Germain',
        price: 189,
        thumbnailSrc:
          'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=240&h=240&q=80',
      },
      {
        id: 'hero-h1b',
        top: '58%',
        left: '48%',
        productName: 'Pantalón pinzas Marais',
        price: 219,
        thumbnailSrc:
          'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=240&h=240&q=80',
      },
    ],
  },
  {
    id: 2,
    title: 'MODA ITALIANA 26',
    image:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1920&q=85',
    imageMobile:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85',
    filter: 'italiana',
    hotspots: [
      {
        id: 'hero-h2a',
        top: '40%',
        left: '50%',
        productName: 'Vestido seda Lake Como',
        price: 289,
        thumbnailSrc:
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=240&h=240&q=80',
      },
      {
        id: 'hero-h2b',
        top: '52%',
        left: '38%',
        productName: 'Cinturón piel Toscana',
        price: 95,
        thumbnailSrc:
          'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=240&h=240&q=80',
      },
    ],
  },
  {
    id: 3,
    title: 'RUE DE LA PAIX',
    image:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1920&q=85',
    imageMobile:
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=85',
    filter: 'francesa',
    hotspots: [
      {
        id: 'hero-h3a',
        top: '34%',
        left: '42%',
        productName: 'Abrigo lana Champagne',
        price: 420,
        thumbnailSrc:
          'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=240&h=240&q=80',
      },
      {
        id: 'hero-h3b',
        top: '48%',
        left: '55%',
        productName: 'Pañuelo seda Lyon',
        price: 78,
        thumbnailSrc:
          'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=240&h=240&q=80',
      },
    ],
  },
  {
    id: 4,
    title: 'DOLCE VITA',
    image:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1920&q=85',
    imageMobile:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85',
    filter: 'italiana',
    hotspots: [
      {
        id: 'hero-h4a',
        top: '38%',
        left: '46%',
        productName: 'Blazer ligero Napoli',
        price: 265,
        thumbnailSrc:
          'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=240&h=240&q=80',
      },
      {
        id: 'hero-h4b',
        top: '55%',
        left: '44%',
        productName: 'Pantalón cropped Capri',
        price: 175,
        thumbnailSrc:
          'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=240&h=240&q=80',
      },
    ],
  },
];

function catalogHref(filter: HeroSlide['filter']) {
  return filter === 'all' ? '/catalogo' : `/catalogo?filter=${filter}`;
}

export function HeroCarousel() {
  const { addItem } = useCart();

  const [activeHotspot, setActiveHotspot] = useState<HeroHotspot | null>(null);
  const [modalPos, setModalPos] = useState<{
    top: number;
    left: number;
    placeAbove: boolean;
  } | null>(null);

  const closeHotspotModal = useCallback(() => {
    setActiveHotspot(null);
    setModalPos(null);
  }, []);

  useEffect(() => {
    if (!activeHotspot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHotspotModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeHotspot, closeHotspotModal]);

  const openHotspot = useCallback(
    (h: HeroHotspot, el: HTMLButtonElement) => {
      const rect = el.getBoundingClientRect();
      const margin = 12;
      const estH = 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < estH + margin;
      const halfModal = 160;
      const cx = rect.left + rect.width / 2;
      const left = Math.min(
        Math.max(cx, margin + halfModal),
        window.innerWidth - margin - halfModal,
      );
      setModalPos({
        top: placeAbove ? rect.top - margin : rect.bottom + margin,
        left,
        placeAbove,
      });
      setActiveHotspot(h);
    },
    [],
  );

  const onAddHotspotToCart = useCallback(() => {
    if (!activeHotspot) return;
    addItem({
      id: activeHotspot.id,
      name: activeHotspot.productName,
      price: activeHotspot.price,
    });
    toast.success('Prenda añadida al carrito');
    closeHotspotModal();
  }, [activeHotspot, addItem, closeHotspotModal]);

  const settings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: HERO_AUTOPLAY_MS,
    fade: true,
    cssEase: 'cubic-bezier(0.87, 0, 0.13, 1)',
    pauseOnHover: false,
    pauseOnDotsHover: false,
    beforeChange: () => {},
    afterChange: () => {
      closeHotspotModal();
    },
    customPaging: (i: number) => (
      <button
        type="button"
        aria-label={`Ir al slide ${i + 1}`}
        className="mx-1 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white/35 transition hover:bg-white/60 [.slick-active_&]:bg-white"
      />
    ),
    appendDots: (dots: React.ReactNode) => (
      <div className="absolute bottom-6 left-0 right-0 z-30 md:bottom-10">
        <ul className="flex justify-center gap-1">{dots}</ul>
      </div>
    ),
  };

  const mediaStyle: CSSProperties = {
    filter: 'contrast(1.05) saturate(1.02)',
  };

  return (
    <div className="relative w-full overflow-hidden">
      <Slider {...settings}>
        {slides.map((slide) => (
          <div key={slide.id} className="relative">
            <div className="relative h-[100dvh] min-h-[100dvh] overflow-hidden md:min-h-0 md:h-[800px]">
              <div className="absolute inset-0">
                {slide.imageMobile ? (
                  <picture className="contents">
                    <source
                      media="(max-width: 767px)"
                      srcSet={slide.imageMobile}
                    />
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="h-full w-full object-cover"
                      style={mediaStyle}
                    />
                  </picture>
                ) : (
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                    style={mediaStyle}
                  />
                )}
              </div>

              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10"
                aria-hidden
              />

              {/* Hotspots */}
              <div className="absolute inset-0 z-20">
                {slide.hotspots.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={(e) => openHotspot(h, e.currentTarget)}
                    className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-[2px] transition hover:scale-110 hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    style={{ top: h.top, left: h.left }}
                    aria-label={`Ver ${h.productName}`}
                  >
                    <Plus className="h-5 w-5" strokeWidth={2} />
                  </button>
                ))}
              </div>

              {/* Título + CTA — abajo a la izquierda */}
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end pb-28 pl-6 sm:pb-32 sm:pl-10 md:pb-36 md:pl-14 lg:pl-16">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-xl"
                >
                  <h1
                    className="mb-5 text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: 'clamp(1.75rem, 5vw, 3.25rem)',
                      lineHeight: 1.05,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {slide.title}
                  </h1>
                  <div className="pointer-events-auto">
                    <Link
                      href={catalogHref(slide.filter)}
                      className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-[#1a1410] shadow-lg transition hover:bg-[#f5f2ed]"
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        letterSpacing: '0.12em',
                      }}
                    >
                      <span>VER CATÁLOGO</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] transition group-hover:bg-black/10">
                        <ArrowUpRight
                          className="h-4 w-4"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </span>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </Slider>

      {/* Modal quick-add */}
      {activeHotspot && modalPos ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100] bg-black/35 backdrop-blur-[1px]"
            aria-label="Cerrar"
            onClick={closeHotspotModal}
          />
          <div
            className="fixed z-[101] w-[min(calc(100vw-2rem),20rem)] rounded-xl border border-white/15 bg-[#1a1410]/95 p-4 text-[#f5f2ed] shadow-2xl backdrop-blur-md sm:p-5"
            style={{
              left: modalPos.left,
              top: modalPos.top,
              transform: modalPos.placeAbove
                ? 'translate(-50%, -100%)'
                : 'translate(-50%, 0)',
            }}
          >
            <div className="relative mb-3">
              <button
                type="button"
                onClick={closeHotspotModal}
                className="absolute top-0 right-0 z-10 rounded-md p-1 text-[#e8e3db]/80 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex gap-3 pr-7">
                <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                  <img
                    src={activeHotspot.thumbnailSrc}
                    alt={activeHotspot.productName}
                    className="h-full w-full object-cover"
                    width={84}
                    height={84}
                  />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className="text-[0.65rem] uppercase tracking-[0.2em] text-[#b8956a]"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Prenda destacada
                  </p>
                  <p
                    className="mt-1 text-base leading-snug text-[#f5f2ed] sm:text-lg"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 600,
                    }}
                  >
                    {activeHotspot.productName}
                  </p>
                </div>
              </div>
            </div>
            <p
              className="mb-4 text-2xl text-white"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
            >
              ${' '}
              {activeHotspot.price.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
              })}
            </p>
            <button
              type="button"
              onClick={onAddHotspotToCart}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#b8956a] py-3 text-sm tracking-[0.15em] text-[#1a1410] transition hover:bg-[#c9a578]"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2} />
              AÑADIR AL CARRITO
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

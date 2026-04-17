'use client';

import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { ArrowUpRight, Plus, ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useCart } from '@/app/context/CartContext';
import { cn } from '@/app/components/ui/utils';
import {
  DEFAULT_HERO_SLIDES,
  HERO_SLIDES_UPDATED_EVENT,
  type HeroHotspot,
  type HeroSlide,
  readHeroSlidesFromStorage,
} from '@/lib/heroSlidesConfig';

const HERO_AUTOPLAY_MS_DESKTOP = 8000;
const HERO_AUTOPLAY_MS_MOBILE = 12000;

function catalogHref(filter: HeroSlide['filter']) {
  return filter === 'all' ? '/catalogo' : `/catalogo?filter=${filter}`;
}

export function HeroCarousel() {
  const { addItem, openCart } = useCart();
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [isCompact, setIsCompact] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    duration: 22,
    dragFree: false,
  });

  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsCompact(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit({ duration: isCompact ? 14 : 26 });
  }, [emblaApi, isCompact]);

  useEffect(() => {
    const load = () => {
      const stored = readHeroSlidesFromStorage();
      setSlides(stored?.length ? stored : DEFAULT_HERO_SLIDES);
    };
    load();
    window.addEventListener('storage', load);
    window.addEventListener(HERO_SLIDES_UPDATED_EVENT, load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener(HERO_SLIDES_UPDATED_EVENT, load);
    };
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
    const len = slides.length;
    if (len === 0) return;
    const idx = emblaApi.selectedScrollSnap();
    if (idx >= len) emblaApi.scrollTo(0);
  }, [emblaApi, slides]);

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
    if (!emblaApi) return;
    const sync = () => {
      setSelected(emblaApi.selectedScrollSnap());
      closeHotspotModal();
    };
    sync();
    emblaApi.on('reInit', sync);
    emblaApi.on('select', sync);
    return () => {
      emblaApi.off('reInit', sync);
      emblaApi.off('select', sync);
    };
  }, [emblaApi, closeHotspotModal]);

  useEffect(() => {
    if (!emblaApi || paused) return;
    const ms = isCompact ? HERO_AUTOPLAY_MS_MOBILE : HERO_AUTOPLAY_MS_DESKTOP;
    const id = window.setInterval(() => {
      emblaApi.scrollNext();
    }, ms);
    return () => window.clearInterval(id);
  }, [emblaApi, paused, isCompact]);

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
      const estH = 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < estH + margin;
      const halfModal = 168;
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
    const lineId = activeHotspot.catalogProductId ?? activeHotspot.id;
    addItem({
      id: lineId,
      productId: lineId,
      name: activeHotspot.productName,
      price: activeHotspot.price,
      image: activeHotspot.thumbnailSrc,
    });
    toast.success('Prenda añadida al carrito');
    closeHotspotModal();
    openCart();
  }, [activeHotspot, addItem, closeHotspotModal, openCart]);

  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  return (
    <section
      className={cn(
        'relative isolate w-full overflow-hidden bg-[#1a1410]',
        /* Viewport completo (móvil sin tocar; en desktop ya no hay recorte ni hueco con la sección de abajo) */
        'min-h-[100dvh] h-[100dvh]',
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrusel"
    >
      <div
        ref={emblaRef}
        className="h-full min-h-0 overflow-hidden"
      >
        <div className="flex h-full">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="relative h-full min-h-0 min-w-0 shrink-0 grow-0 basis-full"
            >
              <div className="relative h-full w-full">
                {/* Capa imagen — móvil / escritorio optimizados */}
                <div className="absolute inset-0">
                  <Image
                    src={slide.imageMobile ?? slide.image}
                    alt={slide.title}
                    fill
                    priority={index === 0}
                    quality={82}
                    sizes="100vw"
                    className="object-cover md:hidden"
                    style={{
                      objectPosition:
                        slide.objectPositionMobile ?? 'center 22%',
                    }}
                  />
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    priority={index === 0}
                    quality={85}
                    sizes="100vw"
                    className="hidden object-cover md:block"
                    style={{
                      objectPosition:
                        slide.objectPositionDesktop ?? 'center center',
                    }}
                  />
                </div>

                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/15"
                  aria-hidden
                />

                <div className="absolute inset-0 z-20 md:hidden">
                  {slide.hotspots.map((h) => (
                    <button
                      key={`${h.id}-sm`}
                      type="button"
                      onClick={(e) => openHotspot(h, e.currentTarget)}
                      className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:scale-105 hover:bg-black/75 active:scale-95"
                      style={{
                        top: h.topMobile ?? h.top,
                        left: h.leftMobile ?? h.left,
                      }}
                      aria-label={`Ver ${h.productName}`}
                    >
                      <Plus className="h-5 w-5" strokeWidth={2.25} />
                    </button>
                  ))}
                </div>
                <div className="absolute inset-0 z-20 hidden md:block">
                  {slide.hotspots.map((h) => (
                    <button
                      key={`${h.id}-md`}
                      type="button"
                      onClick={(e) => openHotspot(h, e.currentTarget)}
                      className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:scale-105 hover:bg-black/75 active:scale-95"
                      style={{ top: h.top, left: h.left }}
                      aria-label={`Ver ${h.productName}`}
                    >
                      <Plus className="h-[1.35rem] w-[1.35rem]" strokeWidth={2.25} />
                    </button>
                  ))}
                </div>

                <div
                  className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end"
                  style={{
                    paddingBottom: 'max(1.75rem, env(safe-area-inset-bottom))',
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1rem, env(safe-area-inset-right))',
                  }}
                >
                  <div className="max-w-[min(100%,22rem)] pb-20 sm:max-w-xl sm:pb-24 md:pb-28 md:pl-2 lg:pl-4">
                    <h1
                      className="mb-3 text-balance text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.55)] sm:mb-4"
                      style={{
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700,
                        fontSize:
                          'clamp(1.35rem, calc(0.35rem + 3.8vw), 3rem)',
                        lineHeight: 1.05,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {slide.title}
                    </h1>
                    <div className="pointer-events-auto">
                      <Link
                        href={catalogHref(slide.filter)}
                        className="group inline-flex max-w-full items-center gap-2.5 rounded-full bg-white px-4 py-2.5 text-[#1a1410] shadow-md transition hover:bg-[#f5f2ed] sm:gap-3 sm:px-6 sm:py-3"
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 600,
                          fontSize: 'clamp(0.65rem, 1.1vw + 0.45rem, 0.8rem)',
                          letterSpacing: '0.14em',
                        }}
                      >
                        <span className="whitespace-nowrap">VER CATÁLOGO</span>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.07] transition group-hover:bg-black/12 sm:h-9 sm:w-9">
                          <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.2} aria-hidden />
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paginación */}
      <div
        className="pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 z-30 flex justify-center gap-3 px-4 md:bottom-8"
        role="tablist"
        aria-label="Slides del hero"
      >
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={selected === i}
            aria-label={`Slide ${i + 1} de ${slides.length}`}
            onClick={() => scrollTo(i)}
            className="flex items-center p-2"
          >
            <span
              className={cn(
                'block h-[2px] rounded-full transition-all duration-500 ease-out md:h-[3px]',
                selected === i
                  ? 'w-10 bg-white shadow-[0_0_12px_rgba(255,255,255,0.35)] md:w-12'
                  : 'w-6 bg-white/35 hover:w-7 hover:bg-white/55 md:w-7',
              )}
            />
          </button>
        ))}
      </div>

      {activeHotspot && modalPos ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100] bg-black/50 lg:bg-black/40 lg:backdrop-blur-[2px]"
            aria-label="Cerrar"
            onClick={closeHotspotModal}
          />
          <div
            className="fixed z-[101] w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-white/15 bg-[#1a1410] p-4 text-[#f5f2ed] shadow-2xl sm:bg-[#1a1410]/96 sm:p-5 sm:backdrop-blur-md"
            style={{
              left: modalPos.left,
              top: modalPos.top,
              transform: modalPos.placeAbove
                ? 'translate(-50%, calc(-100% - 8px))'
                : 'translate(-50%, 8px)',
            }}
          >
            <div className="relative mb-3">
              <button
                type="button"
                onClick={closeHotspotModal}
                className="absolute top-0 right-0 z-10 rounded-md p-1 text-[#e8e3db]/85 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex gap-3 pr-8">
                <div className="relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/25 sm:h-[5.25rem] sm:w-[5.25rem]">
                  <Image
                    src={activeHotspot.thumbnailSrc}
                    alt={activeHotspot.productName}
                    width={112}
                    height={112}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p
                    className="text-[0.62rem] uppercase tracking-[0.22em] text-[#b8956a]"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Prenda destacada
                  </p>
                  <p
                    className="mt-1 text-[0.95rem] leading-snug text-[#f5f2ed] sm:text-base"
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
              className="mb-4 text-xl text-white sm:text-2xl"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#b8956a] py-3 text-xs tracking-[0.14em] text-[#1a1410] transition hover:bg-[#c9a578] sm:text-sm sm:tracking-[0.15em]"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2} />
              AÑADIR AL CARRITO
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

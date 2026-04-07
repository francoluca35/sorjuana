'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { getCloudinaryAsset } from '@/app/config/cloudinaryAssets';

type HeroOffer = {
  id: number;
  eyebrow?: string;
  title: string;
  subtitle: string;
  description?: string;
  discount?: string;
  /** Requerida si no hay `videoSrc`; con video, opcional como poster. */
  image?: string;
  /** Imagen en móvil (hasta breakpoint `md` de Tailwind). */
  imageMobile?: string;
  filter: string;
  buttonText?: string;
  /** When false, image keeps natural colors (e.g. branded hero art). */
  vintageImageFilter?: boolean;
  /** MP4 URL (muted loop), escritorio (md+). */
  videoSrc?: string;
  /** MP4 en móvil (hasta `md`). */
  videoSrcMobile?: string;
  /** Tiempo visible de esta slide en ms; por defecto 5 s. */
  slideDurationMs?: number;
};

const HERO_AUTOPLAY_MS = 8000;

const offers: HeroOffer[] = [
  {
    id: 1,
    eyebrow: 'TIENDA SOR JUANA',
    title: 'De europa a tu armario',
    subtitle: 'Conoce nuestro catalogo completo',
    image: getCloudinaryAsset('/Assets/fondo-home.png'),
    imageMobile: getCloudinaryAsset('/Assets/fondo-home-m.png'),
    filter: 'all',
    buttonText: 'DESCUBRIR COLECCIÓN',
    vintageImageFilter: false,
  },
  {
    id: 2,
    title: 'Temporada Especial',
    subtitle: 'Ofertas excepcionales',
    description: 'Piezas únicas, precios extraordinarios',
    discount: 'HASTA 50% DE DESCUENTO',
    filter: 'all',
    image:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=80',
    videoSrc: getCloudinaryAsset('/Assets/video/francia.mp4'),
    videoSrcMobile: getCloudinaryAsset('/Assets/video/francia-m.mp4'),
  },
  {
    id: 3,
    title: 'Nueva colección',
    subtitle: 'Primavera 2026',
    description: 'La esencia de la moda italiana renace',
    discount: '30% DE DESCUENTO',
    filter: 'italiana',
    image:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=80',
    videoSrc: 'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594029/modern-fashion-store/video/francia.mp4',
    videoSrcMobile: getCloudinaryAsset('/Assets/video/italia-m.mp4'),
  },
];

function slideDurationForIndex(index: number) {
  return offers[index]?.slideDurationMs ?? HERO_AUTOPLAY_MS;
}

export function HeroCarousel() {
  const carouselRootRef = useRef<HTMLDivElement>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoplayMs, setAutoplayMs] = useState(() => slideDurationForIndex(0));

  const syncActiveHeroVideo = useCallback(() => {
    const root = carouselRootRef.current;
    if (!root) return;
    root.querySelectorAll('video').forEach((el) => el.pause());
    const activeSlide = root.querySelector('.slick-slide.slick-active');
    if (!activeSlide) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const preferred = activeSlide.querySelector(
      isMobile
        ? 'video.hero-carousel-vid--mobile'
        : 'video.hero-carousel-vid--desktop'
    ) as HTMLVideoElement | null;
    const toPlay =
      preferred ??
      (activeSlide.querySelector('video') as HTMLVideoElement | null);
    void toPlay?.play();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(mq.matches);
    updateViewport();
    const onChange = () => queueMicrotask(() => syncActiveHeroVideo());
    mq.addEventListener('change', updateViewport);
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', updateViewport);
      mq.removeEventListener('change', onChange);
    };
  }, [syncActiveHeroVideo]);

  const settings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: autoplayMs,
    fade: true,
    cssEase: 'cubic-bezier(0.87, 0, 0.13, 1)',
    /* En móvil el toque dispara “hover” y a veces no hay mouseleave: el autoplay queda colgado para siempre. */
    pauseOnHover: false,
    pauseOnDotsHover: false,
    beforeChange: () => {
      carouselRootRef.current
        ?.querySelectorAll('video')
        .forEach((el) => el.pause());
    },
    afterChange: (index: number) => {
      setCurrentSlide(index);
      setAutoplayMs(slideDurationForIndex(index));
      queueMicrotask(() => syncActiveHeroVideo());
    },
    customPaging: () => (
      <div className="mt-4">
        <div className="w-12 h-0.5 bg-[#b8956a]/30 hover:bg-[#b8956a] transition-all duration-500 cursor-pointer" />
      </div>
    ),
    appendDots: (dots: React.ReactNode) => (
      <div className="bottom-12">
        <ul className="flex justify-center space-x-4"> {dots} </ul>
      </div>
    ),
  };

  const getMediaStyle = (offer: HeroOffer): CSSProperties | undefined =>
    offer.vintageImageFilter === false
      ? undefined
      : { filter: 'sepia(0.15) contrast(1.1)' };

  return (
    <div ref={carouselRootRef} className="relative w-full overflow-hidden">
      <Slider {...settings}>
        {offers.map((offer, index) => (
          <div key={offer.id} className="relative">
            <div className="relative h-[100dvh] min-h-[100dvh] md:min-h-0 md:h-[800px] overflow-hidden">
              {/* Imagen o video de fondo */}
              <motion.div
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 8, ease: "easeOut" }}
                className="absolute inset-0"
              >
                {offer.videoSrc && index === currentSlide ? (
                  <video
                    className={`h-full w-full object-cover ${
                      isMobileViewport ? 'hero-carousel-vid--mobile' : 'hero-carousel-vid--desktop'
                    }`}
                    muted
                    loop
                    playsInline
                    preload="none"
                    {...(offer.image ? { poster: offer.image } : {})}
                    aria-hidden
                    style={getMediaStyle(offer)}
                  >
                    <source
                      src={
                        isMobileViewport && offer.videoSrcMobile
                          ? offer.videoSrcMobile
                          : offer.videoSrc
                      }
                      type="video/mp4"
                    />
                  </video>
                ) : offer.image ? (
                  offer.imageMobile ? (
                    <picture className="contents">
                      <source
                        media="(max-width: 767px)"
                        srcSet={offer.imageMobile}
                      />
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="h-full w-full object-cover"
                        style={getMediaStyle(offer)}
                      />
                    </picture>
                  ) : (
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="h-full w-full object-cover"
                      style={getMediaStyle(offer)}
                    />
                  )
                ) : null}
              </motion.div>

              {/* Vintage overlay — lighter on branded hero so the collage reads */}
              <div
                className={
                  offer.vintageImageFilter === false
                    ? 'absolute inset-0 bg-gradient-to-br from-[#1a1410]/55 via-[#2a2520]/35 to-transparent'
                    : 'absolute inset-0 bg-gradient-to-br from-[#1a1410]/80 via-[#2a2520]/50 to-transparent'
                }
              />
              <div
                className={
                  offer.vintageImageFilter === false
                    ? 'absolute inset-0 mix-blend-multiply opacity-20'
                    : 'absolute inset-0 mix-blend-multiply opacity-30'
                }
                style={{
                  background:
                    'radial-gradient(ellipse at center, transparent 0%, #1a1410 100%)',
                }}
              />
              
              {/* Decorative vintage frame */}
              <div className="absolute inset-8 border-2 border-[#b8956a]/20 pointer-events-none">
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#b8956a]" />
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#b8956a]" />
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#b8956a]" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#b8956a]" />
              </div>
              
              <div className="absolute inset-0 flex items-center pt-[6.25rem] sm:pt-28 md:pt-[6.5rem]">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
                  <div className="max-w-3xl">
                    {/* Ornamental divider */}
                    {offer.eyebrow ? (
                      <motion.p
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-[#e8e3db]/90 tracking-[0.35em] text-xs sm:text-sm mb-6"
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 400,
                        }}
                      >
                        {offer.eyebrow}
                      </motion.p>
                    ) : null}

                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 100, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="h-px bg-gradient-to-r from-[#b8956a] to-transparent mb-8"
                    />

                    {offer.discount ? (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="inline-block border border-[#b8956a] px-8 py-3 mb-6 backdrop-blur-sm bg-[#1a1410]/30"
                      >
                        <span
                          className="text-[#b8956a] tracking-[0.3em] text-sm"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 300,
                          }}
                        >
                          {offer.discount}
                        </span>
                      </motion.div>
                    ) : null}
                    
                    <motion.div
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7, duration: 0.8 }}
                      className={offer.description ? undefined : 'mb-10'}
                    >
                      <h1 
                        className="text-[#f5f2ed] mb-3 drop-shadow-2xl"
                        style={{ 
                          fontFamily: 'Cormorant Garamond, serif',
                          fontSize: 'clamp(3rem, 7vw, 6rem)',
                          lineHeight: '1.1',
                          fontWeight: 300,
                          letterSpacing: '0.02em'
                        }}
                      >
                        {offer.title}
                      </h1>
                      <p 
                        className="text-[#ffffff] mb-3 tracking-widest"
                        style={{ 
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: 'clamp(0.9rem, 2vw, 1.2rem)',
                          fontWeight: 300,
                          letterSpacing: '0.2em'
                        }}
                      >
                        {offer.subtitle}
                      </p>
                    </motion.div>
                    
                    {offer.description ? (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 0.8 }}
                        className="text-[#e8e3db] text-xl mb-10 italic max-w-lg"
                        style={{
                          fontFamily: 'Cormorant Garamond, serif',
                          fontWeight: 300,
                        }}
                      >
                        {offer.description}
                      </motion.p>
                    ) : null}
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1, duration: 0.8 }}
                    >
                      <Link
                        href={`/catalogo${offer.filter !== 'all' ? `?filter=${offer.filter}` : ''}`}
                        className="group inline-flex items-center space-x-4 bg-transparent border-2 border-[#b8956a] text-[#f5f2ed] px-10 py-5 hover:bg-[#b8956a] hover:border-[#b8956a] transition-all duration-500 relative overflow-hidden"
                      >
                        <span
                          className="relative z-10 tracking-[0.2em] text-sm"
                          style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 400,
                          }}
                        >
                          {offer.buttonText ?? 'DESCUBRIR COLECCIÓN'}
                        </span>
                        <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-2 transition-transform duration-500" strokeWidth={1.5} />
                        <div className="absolute inset-0 bg-[#8b6f47] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      </Link>
                    </motion.div>

                    {/* Decorative ornament */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 0.3, scale: 1 }}
                      transition={{ delay: 1.3, duration: 1 }}
                      className="mt-12 text-[#b8956a] text-4xl"
                      style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    >
                      ❦
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

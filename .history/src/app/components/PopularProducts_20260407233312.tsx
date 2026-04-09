'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import {
  Heart,
  ShoppingCart,
  Sparkles,
  Truck,
  ShieldCheck,
  Play,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './ui/utils';

/** URLs de muestra — reemplazá por tus .mp4 (Cloudinary, CDN propio, etc.) */
const SAMPLE_MP4 = {
  reelA: 'https://www.w3schools.com/html/mov_bbb.mp4',
  reelB: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  reelC: 'https://www.w3schools.com/html/movie.mp4',
} as const;

export type PopularProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  compareAt?: number;
  poster: string;
  videoSrc: string;
  gallery: string[];
  detailVideos: string[];
  tag: string;
  hook: string;
  description: string;
  perks: string[];
  stockHint: string;
};

const products: PopularProduct[] = [
  {
    id: 1,
    name: 'Vestido de Seda Milano',
    category: 'Italiana',
    price: 249.99,
    compareAt: 319,
    poster:
      'https://images.unsplash.com/photo-1557161622-5f50ca344787?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    videoSrc: SAMPLE_MP4.reelA,
    gallery: [
      'https://images.unsplash.com/photo-1557161622-5f50ca344787?w=800&q=80',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
    ],
    detailVideos: [SAMPLE_MP4.reelB, SAMPLE_MP4.reelC],
    tag: 'Superventas',
    hook: 'Silueta impecable y caída de seda que vende por sí sola en vitrina y redes.',
    description:
      'Corte midi con espalda estratégica y forro interior. Ideal para eventos, cenas y contenido de marca. Incluye bolsa de guardado y guía de cuidado.',
    perks: [
      'Tacto seda natural certificada',
      'Ajuste en cintura y pecho sin perder comodidad',
      'Listo para envío en 24 h hábiles en CABA y GBA',
    ],
    stockHint: 'Quedan pocas unidades en esta temporada',
  },
  {
    id: 2,
    name: 'Conjunto Parisino Elegante',
    category: 'Francesa',
    price: 189.99,
    compareAt: 239,
    poster:
      'https://images.unsplash.com/photo-1588025014019-d0f99ee89043?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    videoSrc: SAMPLE_MP4.reelB,
    gallery: [
      'https://images.unsplash.com/photo-1588025014019-d0f99ee89043?w=800&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80',
    ],
    detailVideos: [SAMPLE_MP4.reelA, SAMPLE_MP4.reelC],
    tag: 'Popular',
    hook: 'Look completo que sube el ticket medio del carrito: conjunto + accesorios sugeridos.',
    description:
      'Dos piezas combinable con blazer o trench. Tejido con recuperación para que el cliente no dude al moverse.',
    perks: [
      'Packaging premium listo para regalo',
      'Talles del XS al XL con guía de medidas en el modal',
      'Devolución extendida en conjuntos seleccionados',
    ],
    stockHint: 'Más vendido esta semana',
  },
  {
    id: 3,
    name: 'Blazer Italiano Premium',
    category: 'Italiana',
    price: 299.99,
    poster:
      'https://images.unsplash.com/photo-1762343292182-b0cb71a19111?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    videoSrc: SAMPLE_MP4.reelC,
    gallery: [
      'https://images.unsplash.com/photo-1762343292182-b0cb71a19111?w=800&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
    ],
    detailVideos: [SAMPLE_MP4.reelA, SAMPLE_MP4.reelB],
    tag: 'Esencial',
    hook: 'Estructura de hombro y solapa que comunica autoridad en el probador virtual.',
    description:
      'Forro transpirable y bolsillo interior para móvil. Pensado para oficina, eventos y shooting de catálogo.',
    perks: [
      'Planchado mínimo: tejido antiarrugas',
      'Botones forrados a tono',
      'Asesoría de talle vía WhatsApp Business',
    ],
    stockHint: 'Reposición confirmada — reservá talle',
  },
  {
    id: 4,
    name: 'Vestido Couture París',
    category: 'Francesa',
    price: 329.99,
    compareAt: 399,
    poster:
      'https://images.unsplash.com/photo-1637690048998-1e41c61c254d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    videoSrc: SAMPLE_MP4.reelA,
    gallery: [
      'https://images.unsplash.com/photo-1637690048998-1e41c61c254d?w=800&q=80',
      'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80',
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80',
    ],
    detailVideos: [SAMPLE_MP4.reelB, SAMPLE_MP4.reelC],
    tag: 'Exclusivo',
    hook: 'Pieza statement para cerrar ventas de alto valor y bundles con joyería fina.',
    description:
      'Acabado couture con detalle en escote. Incluye arnés invisible opcional para ajuste en pasarela o sesión.',
    perks: [
      'Edición limitada numerada',
      'Certificado de autenticidad digital',
      'Envío asegurado incluido',
    ],
    stockHint: 'Edición limitada — últimos talles',
  },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function useInViewAutoplay(videoRef: React.RefObject<HTMLVideoElement | null>) {
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [videoRef]);
}

function ProductCardVideo({
  poster,
  src,
  reducedMotion,
}: {
  poster: string;
  src: string;
  reducedMotion: boolean;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  useInViewAutoplay(ref);

  if (reducedMotion) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={poster}
          alt=""
          fill
          className="object-cover"
          style={{ filter: 'sepia(0.06) contrast(1.04)' }}
          sizes="(max-width: 640px) 100vw, 25vw"
        />
      </div>
    );
  }

  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      poster={poster}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

export function PopularProducts() {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<PopularProduct | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const modalVideoRef = React.useRef<HTMLVideoElement>(null);

  const openProduct = (p: PopularProduct) => {
    setActive(p);
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) {
      modalVideoRef.current?.pause();
    } else {
      void modalVideoRef.current?.play().catch(() => {});
    }
  }, [open, active?.id]);

  return (
    <section className="relative overflow-hidden bg-[#f5f2ed] px-4 py-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(184,149,106,0.18),transparent)]" />
      <div className="absolute -left-20 top-40 h-72 w-72 rounded-full bg-[#b8956a]/10 blur-3xl" />
      <div className="absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-[#1a1410]/[0.06] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="mb-16 text-center lg:mb-20"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b8956a]/40 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <Sparkles className="size-3.5 text-[#b8956a]" strokeWidth={1.5} />
            <span
              className="text-[11px] tracking-[0.28em] text-[#8b6f47]"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
            >
             LO QUE MÁS SE COMPRA
            </span>
          </div>

          <h2
            className="mb-4 text-[#1a1410]"
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
              fontWeight: 400,
              letterSpacing: '0.04em',
            }}
          >
            Productos Mas Vendidos
          </h2>

       

          <div className="mx-auto flex flex-wrap items-center justify-center gap-6 text-[#5c5349]">
            <span className="flex items-center gap-2 text-sm">
              <Truck className="size-4 text-[#b8956a]" strokeWidth={1.5} />
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem' }}>
                Envío gratis +$150
              </span>
            </span>
            <span className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-[#b8956a]" strokeWidth={1.5} />
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.8rem' }}>
                Pago seguro y cuotas
              </span>
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          {products.map((product, index) => (
            <motion.article
              key={product.id}
              role="button"
              tabIndex={0}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.55 }}
              onClick={() => openProduct(product)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openProduct(product);
                }
              }}
              className="group relative cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-[#b8956a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f2ed]"
            >
              <div className="relative mb-5 overflow-hidden border border-[#1a1410]/10 bg-[#1a1410] shadow-[0_24px_60px_-20px_rgba(26,20,16,0.35)] transition-shadow duration-500 group-hover:shadow-[0_28px_70px_-18px_rgba(184,149,106,0.45)]">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <ProductCardVideo
                    poster={product.poster}
                    src={product.videoSrc}
                    reducedMotion={reducedMotion}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a1410]/85 via-[#1a1410]/15 to-transparent opacity-90" />
                  <div className="pointer-events-none absolute inset-0 bg-[#b8956a]/10 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
                    <span
                      className="border border-[#b8956a]/50 bg-[#1a1410]/90 px-3 py-1 text-[10px] tracking-[0.2em] text-[#e8dcc8]"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
                    >
                      {product.tag}
                    </span>
                    {product.compareAt != null ? (
                      <span
                        className="bg-[#b8956a] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#1a1410]"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        OFERTA
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute right-3 top-3 z-20 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => e.stopPropagation()}
                      className="border border-white/20 bg-white/95 p-2.5 text-[#1a1410] backdrop-blur-sm transition-colors hover:border-[#b8956a] hover:text-[#b8956a]"
                      aria-label="Favoritos"
                    >
                      <Heart className="size-4" strokeWidth={1.5} />
                    </motion.button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[#f5f2ed]/90">
                      <Play className="size-3.5 fill-current" />
                      <span
                        className="text-[10px] tracking-[0.2em]"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        VER EN VIDEO
                      </span>
                    </div>
                    <p
                      className="line-clamp-2 text-sm font-medium leading-snug text-white drop-shadow-md"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {product.hook}
                    </p>
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ backgroundColor: 'rgb(184 149 106)' }}
                  whileTap={{ scale: 0.99 }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex w-full items-center justify-center gap-2 border-t border-[#b8956a]/30 bg-[#1a1410] py-3.5 text-[#f5f2ed] transition-colors"
                >
                  <ShoppingCart className="size-4" strokeWidth={1.5} />
                  <span
                    className="text-[11px] tracking-[0.22em]"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
                  >
                    AÑADIR AL CARRITO
                  </span>
                </motion.button>
              </div>

              <div className="px-0.5">
                <div
                  className="mb-1.5 text-[10px] tracking-[0.25em] text-[#8b6f47]"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                >
                  {product.category}
                </div>
                <h3
                  className="mb-2 flex items-start justify-between gap-2 text-[#1a1410] transition-colors group-hover:text-[#8b6f47]"
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '1.35rem',
                    fontWeight: 500,
                  }}
                >
                  {product.name}
                  <ChevronRight
                    className="mt-1 size-4 shrink-0 text-[#b8956a] opacity-0 transition-opacity group-hover:opacity-100"
                    strokeWidth={1.5}
                  />
                </h3>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    className="text-xl text-[#b8956a]"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}
                  >
                    ${product.price.toFixed(2)}
                  </span>
                  {product.compareAt != null ? (
                    <span
                      className="text-sm text-[#9a9085] line-through"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      ${product.compareAt.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                <p
                  className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[#a67c52]"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {product.stockHint}
                </p>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.55 }}
          className="mt-16 text-center"
        >
          <Link
            href="/catalogo"
            className="group inline-flex items-center gap-3 border-2 border-[#1a1410] bg-[#1a1410] px-10 py-4 text-[#f5f2ed] transition-all duration-300 hover:border-[#b8956a] hover:bg-[#b8956a] hover:text-[#1a1410]"
          >
            <span
              className="text-sm tracking-[0.22em]"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
            >
              IR AL CATÁLOGO COMPLETO
            </span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            'max-h-[min(92vh,900px)] w-[min(96vw,56rem)] gap-0 overflow-y-auto rounded-none border-[#1a1410]/15 bg-[#f5f2ed] p-0 sm:max-w-[min(96vw,56rem)]',
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {active ? (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{active.name}</DialogTitle>
                <DialogDescription>{active.description}</DialogDescription>
              </DialogHeader>

              <div className="grid lg:grid-cols-[1.05fr_1fr]">
                <div className="relative border-b border-[#1a1410]/10 bg-black lg:border-b-0 lg:border-r">
                  <video
                    key={active.id}
                    ref={modalVideoRef}
                    className="aspect-[3/4] max-h-[min(52vh,640px)] w-full object-cover lg:max-h-[min(88vh,820px)] lg:aspect-auto lg:min-h-[420px]"
                    poster={active.poster}
                    src={active.videoSrc}
                    controls
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute left-3 top-3 rounded-none border border-white/20 bg-black/55 px-2 py-1 text-[10px] tracking-[0.2em] text-white backdrop-blur-sm">
                    VIDEO PRINCIPAL
                  </div>
                </div>

                <div className="flex flex-col p-6 sm:p-8">
                  <p
                    className="mb-1 text-[10px] tracking-[0.28em] text-[#8b6f47]"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {active.category.toUpperCase()}
                  </p>
                  <h2
                    className="mb-3 text-2xl text-[#1a1410] sm:text-3xl"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 500 }}
                  >
                    {active.name}
                  </h2>

                  <div className="mb-4 flex flex-wrap items-baseline gap-3">
                    <span
                      className="text-3xl text-[#b8956a]"
                      style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600 }}
                    >
                      ${active.price.toFixed(2)}
                    </span>
                    {active.compareAt != null ? (
                      <span
                        className="text-lg text-[#9a9085] line-through"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        ${active.compareAt.toFixed(2)}
                      </span>
                    ) : null}
                  </div>

                  <p
                    className="mb-4 text-sm font-medium text-[#5c5349]"
                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {active.hook}
                  </p>

                  <ul className="mb-6 space-y-2">
                    {active.perks.map((line) => (
                      <li
                        key={line}
                        className="flex gap-2 text-sm text-[#4a433c]"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#b8956a]" />
                        {line}
                      </li>
                    ))}
                  </ul>

                  <p
                    className="mb-6 text-sm leading-relaxed text-[#6b6156]"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem' }}
                  >
                    {active.description}
                  </p>

                  <div className="mb-6 rounded-none border border-[#b8956a]/40 bg-white/60 px-4 py-3">
                    <p
                      className="text-center text-xs font-semibold uppercase tracking-wide text-[#8b3a3a]"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {active.stockHint}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-2 bg-[#1a1410] py-4 text-[#f5f2ed] transition-colors hover:bg-[#b8956a] hover:text-[#1a1410]"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
                    >
                      <ShoppingCart className="size-4" strokeWidth={1.5} />
                      COMPRAR AHORA
                    </button>
                    <Link
                      href="/catalogo"
                      className="flex flex-1 items-center justify-center border-2 border-[#1a1410] py-4 text-center text-sm tracking-wide text-[#1a1410] transition-colors hover:bg-[#1a1410] hover:text-[#f5f2ed]"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
                      onClick={() => setOpen(false)}
                    >
                      VER MÁS MODELOS
                    </Link>
                  </div>

                  <Tabs defaultValue="fotos" className="mt-8">
                    <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border border-[#1a1410]/10 bg-[#e8e3db]/80 p-1">
                      <TabsTrigger
                        value="fotos"
                        className="rounded-none data-[state=active]:bg-[#1a1410] data-[state=active]:text-[#f5f2ed]"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.7rem' }}
                      >
                        FOTOS
                      </TabsTrigger>
                      <TabsTrigger
                        value="videos"
                        className="rounded-none data-[state=active]:bg-[#1a1410] data-[state=active]:text-[#f5f2ed]"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.7rem' }}
                      >
                        MÁS VIDEOS
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="fotos" className="mt-4">
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {active.gallery.map((src) => (
                          <button
                            key={src}
                            type="button"
                            className="relative aspect-square overflow-hidden border border-[#1a1410]/10 bg-white transition-transform hover:scale-[1.02]"
                            onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
                          >
                            <Image
                              src={src}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 33vw, 180px"
                            />
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="videos" className="mt-4 space-y-4">
                      {active.detailVideos.map((src, i) => (
                        <div
                          key={`${active.id}-v-${i}`}
                          className="overflow-hidden border border-[#1a1410]/15 bg-black"
                        >
                          <p
                            className="bg-[#1a1410] px-3 py-2 text-[10px] tracking-[0.2em] text-[#b8956a]"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                          >
                            CLIP {i + 1}
                          </p>
                          <video
                            className="aspect-video w-full object-cover"
                            src={src}
                            controls
                            playsInline
                            preload="metadata"
                          />
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

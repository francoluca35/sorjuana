'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { getCloudinaryAsset } from '@/app/config/cloudinaryAssets';

type CollectionPanel = {
  title: string;
  country: string;
  href: string;
  videoSrc: string;
  previewImage: string;
};

const PANELS: CollectionPanel[] = [
  {
    title: 'Elegancia italiana',
    country: 'ITALIA',
    href: '/catalogo?filter=italiana',
    videoSrc: getCloudinaryAsset('/Assets/video/italia.mp4'),
    previewImage:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1280&q=80',
  },
  {
    title: 'Chic frances',
    country: 'FRANCIA',
    href: '/catalogo?filter=francesa',
    videoSrc: getCloudinaryAsset('/Assets/video/francia.mp4'),
    previewImage:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1280&q=80',
  },
  {
    title: 'Accesorios premium',
    country: 'EUROPA',
    href: '/catalogo',
    videoSrc: getCloudinaryAsset('/Assets/video/italia-m.mp4'),
    previewImage:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1280&q=80',
  },
  {
    title: 'Looks urbanos',
    country: 'COLECCION',
    href: '/catalogo',
    videoSrc: 'https://res.cloudinary.com/dqr1ehkv7/video/upload/v1775594296/francia-m_gxsq71.mp4',
    previewImage:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1280&q=80',
  },
];

export function FashionCategories() {
  const [activePanel, setActivePanel] = useState(0);

  return (
    <section
      id="coleccion"
      className="relative overflow-hidden scroll-mt-28 py-32"
    >
      {/* Decorative vintage background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 border border-[#b8956a] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 border border-[#b8956a] rounded-full" />
      </div>

      {/* Section title */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="mx-auto mb-20 max-w-7xl px-4 text-center sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-center">
          <div className="h-px mb-0 w-20 bg-gradient-to-r from-transparent to-[#b8956a]" />
          <span
            className="mx-6 text-[#8b6f47] tracking-[0.3em] text-sm"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
          >
            NUESTRA COLECCION
          </span>
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#b8956a]" />
        </div>
     
      </motion.div>

      <div
        className="hidden md:flex h-[72vh] min-h-[460px] max-h-[760px] w-full overflow-hidden border-y border-[#b8956a]/25 bg-[#1a1410]"
        onMouseLeave={() => setActivePanel(0)}
      >
        {PANELS.map((panel, index) => {
          const isActive = activePanel === index;
          return (
            <Link
              key={panel.title}
              href={panel.href}
              onMouseEnter={() => setActivePanel(index)}
              className="relative h-full min-w-0 border-r border-[#b8956a]/25 last:border-r-0"
              style={{
                flex: isActive ? 7 : 1,
                transition: 'flex 450ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {isActive ? (
                <video
                  className="h-full w-full object-cover"
                  src={panel.videoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={panel.previewImage}
                  alt={panel.title}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1410]/80 via-[#1a1410]/20 to-transparent" />
              <div className="absolute inset-0 bg-[#8b6f47]/10 mix-blend-multiply" />
              {!isActive ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-[#f5f2ed] tracking-[0.16em] text-[0.9rem] uppercase"
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 400,
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    {panel.title}
                  </span>
                </div>
              ) : null}

              <div
                className={`absolute bottom-0 left-0 right-0 p-6 transition-all duration-300 ${
                  isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <span
                  className="text-[#b8956a] tracking-[0.28em] text-xs"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                >
                  {panel.country}
                </span>
                <h3
                  className="mt-2 text-[#f5f2ed]"
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: 'clamp(1.5rem, 2vw, 2.5rem)',
                    fontWeight: 300,
                    letterSpacing: '0.04em',
                  }}
                >
                  {panel.title}
                </h3>
                <div className="mt-4 inline-flex items-center gap-2 text-[#b8956a]">
                  <span
                    className="tracking-[0.2em] text-xs"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                  >
                    EXPLORAR
                  </span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:px-6 md:hidden">
        {PANELS.map((panel) => (
          <Link key={panel.title} href={panel.href} className="relative h-56 overflow-hidden">
            <img
              className="h-full w-full object-cover"
              src={panel.previewImage}
              alt={panel.title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1410]/80 via-[#1a1410]/25 to-transparent" />
            <div className="absolute left-4 bottom-4">
              <p
                className="text-[#b8956a] tracking-[0.25em] text-[11px]"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                {panel.country}
              </p>
              <h3
                className="text-[#f5f2ed]"
                style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '1.8rem',
                  fontWeight: 300,
                }}
              >
                {panel.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

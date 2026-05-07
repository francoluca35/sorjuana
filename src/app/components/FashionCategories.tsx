'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  DEFAULT_FASHION_CATEGORY_PANELS,
  FASHION_CATEGORY_PANEL_COUNT,
  type FashionCategoryPanel,
} from '@/lib/fashionCategoryPanelsConfig';

export type FashionCategoriesProps = {
  /** Publicado desde Mapa de página; si falta o es inválido, se usan los valores por defecto. */
  panels?: FashionCategoryPanel[] | null;
};

export function FashionCategories({ panels: panelsProp }: FashionCategoriesProps) {
  const panels = useMemo(() => {
    if (panelsProp?.length === FASHION_CATEGORY_PANEL_COUNT) return panelsProp;
    return DEFAULT_FASHION_CATEGORY_PANELS;
  }, [panelsProp]);

  const [activePanel, setActivePanel] = useState(0);

  return (
    <section
      id="coleccion"
      className="relative overflow-hidden scroll-mt-28 bg-[#1a141000] pt-10 pb-0"
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
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#b8956a]" />
          <span
            className="mx-6 text-[#8b6f47] tracking-[0.3em] text-sm"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
          >
            NUESTRA COLECCION
          </span>
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#b8956a]" />
        </div>
        <p
          className="mt-4 text-[#8b6f47] tracking-[0.16em] text-xs sm:text-sm uppercase"
          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
        >
          Envíos a todo el país desde Merlo, Buenos Aires, Argentina
        </p>
      </motion.div>

      <div
        className="hidden md:flex h-[72vh] min-h-[460px] max-h-[760px] w-full overflow-hidden border-y border-[#b8956a]/25 bg-[#1a1410]"
        onMouseLeave={() => setActivePanel(0)}
      >
        {panels.map((panel, index) => {
          const isActive = activePanel === index;
          return (
            <Link
              key={`fc-panel-${index}`}
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 pb-10 sm:px-6 md:hidden">
        {panels.map((panel, index) => (
          <Link key={`fc-panel-m-${index}`} href={panel.href} className="relative h-56 overflow-hidden">
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

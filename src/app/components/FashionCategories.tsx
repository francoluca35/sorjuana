'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

export function FashionCategories() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [-100, 100]);

  return (
    <section
      id="coleccion"
      ref={containerRef}
      className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative overflow-hidden scroll-mt-28"
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
        className="text-center mb-20"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#b8956a]" />
          <span 
            className="mx-6 text-[#8b6f47] tracking-[0.3em] text-sm"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
          >
            NUESTRAS COLECCIONES
          </span>
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#b8956a]" />
        </div>
        <h2 
          className="text-[#1a1410]"
          style={{ 
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 300,
            letterSpacing: '0.05em'
          }}
        >
          Orígenes Europeos
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Moda Italiana */}
        <motion.div 
          style={{ y: y1 }}
          className="group relative overflow-hidden cursor-pointer"
        >
          <Link href="/catalogo?filter=italiana">
            <div className="relative h-[600px] overflow-hidden">
              {/* Vintage frame overlay */}
              <div className="absolute inset-0 border-8 border-[#e8e3db] z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <motion.img
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 1, ease: [0.43, 0.13, 0.23, 0.96] }}
                src="https://images.unsplash.com/photo-1602918222760-fa82314869d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpdGFsaWFuJTIwZmFzaGlvbiUyMGx1eHVyeSUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Moda Italiana"
                className="w-full h-full object-cover"
                style={{ filter: 'sepia(0.1) contrast(1.05)' }}
              />
              
              {/* Gradient overlay with vintage effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1410]/95 via-[#1a1410]/40 to-transparent" />
              <div className="absolute inset-0 bg-[#b8956a]/10 mix-blend-multiply" />
              
              {/* Corner ornaments */}
              <div className="absolute top-6 left-6 w-20 h-20 border-t-2 border-l-2 border-[#b8956a] opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-6 right-6 w-20 h-20 border-b-2 border-r-2 border-[#b8956a] opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="absolute bottom-0 left-0 right-0 p-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  <div className="flex items-center mb-4">
                    <div className="h-px w-12 bg-[#b8956a]" />
                    <span 
                      className="ml-4 text-[#b8956a] tracking-[0.3em] text-xs"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                    >
                      ITALIA
                    </span>
                  </div>
                  
                  <h3 
                    className="text-[#f5f2ed] mb-4"
                    style={{ 
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                      fontWeight: 300,
                      letterSpacing: '0.05em'
                    }}
                  >
                    Elegancia italiana
                  </h3>
                  
                  <p 
                    className="text-[#e8e3db]/90 mb-6 max-w-md leading-relaxed italic"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}
                  >
                    Desde las ateliers de Milano, donde la sofisticación encuentra su máxima expresión en cada costura.
                  </p>
                  
                  <div className="inline-flex items-center space-x-3 text-[#b8956a] group-hover:gap-5 transition-all duration-500">
                    <span 
                      className="tracking-[0.2em] text-sm"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                    >
                      EXPLORAR
                    </span>
                    <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                </motion.div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Moda Francesa */}
        <motion.div 
          style={{ y: y2 }}
          className="group relative overflow-hidden cursor-pointer"
        >
          <Link href="/catalogo?filter=francesa">
            <div className="relative h-[600px] overflow-hidden">
              {/* Vintage frame overlay */}
              <div className="absolute inset-0 border-8 border-[#e8e3db] z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <motion.img
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 1, ease: [0.43, 0.13, 0.23, 0.96] }}
                src="https://images.unsplash.com/photo-1694659224329-54c712ec64d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmYXNoaW9uJTIwZWxlZ2FudCUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Moda Francesa"
                className="w-full h-full object-cover"
                style={{ filter: 'sepia(0.1) contrast(1.05)' }}
              />
              
              {/* Gradient overlay with vintage effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1410]/95 via-[#1a1410]/40 to-transparent" />
              <div className="absolute inset-0 bg-[#b8956a]/10 mix-blend-multiply" />
              
              {/* Corner ornaments */}
              <div className="absolute top-6 left-6 w-20 h-20 border-t-2 border-l-2 border-[#b8956a] opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-6 right-6 w-20 h-20 border-b-2 border-r-2 border-[#b8956a] opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="absolute bottom-0 left-0 right-0 p-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  <div className="flex items-center mb-4">
                    <div className="h-px w-12 bg-[#b8956a]" />
                    <span 
                      className="ml-4 text-[#b8956a] tracking-[0.3em] text-xs"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                    >
                      FRANCIA
                    </span>
                  </div>
                  
                  <h3 
                    className="text-[#f5f2ed] mb-4"
                    style={{ 
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                      fontWeight: 300,
                      letterSpacing: '0.05em'
                    }}
                  >
                    Chic parisino
                  </h3>
                  
                  <p 
                    className="text-[#e8e3db]/90 mb-6 max-w-md leading-relaxed italic"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}
                  >
                    El arte francés de la alta costura, donde cada prenda cuenta una historia de elegancia atemporal.
                  </p>
                  
                  <div className="inline-flex items-center space-x-3 text-[#b8956a] group-hover:gap-5 transition-all duration-500">
                    <span 
                      className="tracking-[0.2em] text-sm"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                    >
                      EXPLORAR
                    </span>
                    <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                </motion.div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

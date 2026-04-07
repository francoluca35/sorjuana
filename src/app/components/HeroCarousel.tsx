'use client';

import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

const offers = [
  {
    id: 1,
    title: 'Nouvelle Collection',
    subtitle: 'Primavera 2026',
    description: 'La esencia de la moda italiana renace',
    discount: '30% DE DESCUENTO',
    image: 'https://images.unsplash.com/photo-1602918222760-fa82314869d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpdGFsaWFuJTIwZmFzaGlvbiUyMGx1eHVyeSUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080',
    filter: 'italiana'
  },
  {
    id: 2,
    title: 'Élégance Parisienne',
    subtitle: 'Collection Exclusive',
    description: 'El arte francés de vestir con gracia',
    discount: '25% DE DESCUENTO',
    image: 'https://images.unsplash.com/photo-1694659224329-54c712ec64d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmYXNoaW9uJTIwZWxlZ2FudCUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080',
    filter: 'francesa'
  },
  {
    id: 3,
    title: 'Temporada Especial',
    subtitle: 'Ofertas Excepcionales',
    description: 'Piezas únicas, precios extraordinarios',
    discount: 'HASTA 50% DE DESCUENTO',
    image: 'https://images.unsplash.com/photo-1766959501737-5625ec13a0f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc2FsZSUyMGRpc2NvdW50JTIwb2ZmZXJ8ZW58MXx8fHwxNzc1NTA5MDI4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    filter: 'all'
  }
];

export function HeroCarousel() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 1200,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 6000,
    fade: true,
    cssEase: 'cubic-bezier(0.87, 0, 0.13, 1)',
    pauseOnHover: true,
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

  return (
    <div className="relative w-full overflow-hidden">
      <Slider {...settings}>
        {offers.map((offer, index) => (
          <div key={offer.id} className="relative">
            <div className="relative h-[100dvh] min-h-[100dvh] md:min-h-0 md:h-[800px] overflow-hidden">
              {/* Image with vintage filter */}
              <motion.div
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 8, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <img
                  src={offer.image}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                  style={{ filter: 'sepia(0.15) contrast(1.1)' }}
                />
              </motion.div>
              
              {/* Vintage overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1410]/80 via-[#2a2520]/50 to-transparent" />
              <div className="absolute inset-0 mix-blend-multiply opacity-30" 
                   style={{ background: 'radial-gradient(ellipse at center, transparent 0%, #1a1410 100%)' }} />
              
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
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 100, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="h-px bg-gradient-to-r from-[#b8956a] to-transparent mb-8"
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="inline-block border border-[#b8956a] px-8 py-3 mb-6 backdrop-blur-sm bg-[#1a1410]/30"
                    >
                      <span 
                        className="text-[#b8956a] tracking-[0.3em] text-sm"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                      >
                        {offer.discount}
                      </span>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7, duration: 0.8 }}
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
                        className="text-[#b8956a] mb-3 tracking-widest"
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
                    
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9, duration: 0.8 }}
                      className="text-[#e8e3db] text-xl mb-10 italic max-w-lg"
                      style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300 }}
                    >
                      {offer.description}
                    </motion.p>
                    
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
                          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                        >
                          DESCUBRIR COLECCIÓN
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

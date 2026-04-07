'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-[#1a1410]/95 backdrop-blur-md shadow-2xl border-b border-[#b8956a]/20' 
          : 'bg-transparent'
      }`}
    >
      {/* Decorative vintage line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[#b8956a] to-transparent opacity-50" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          {/* Logo */}
          <Link href="/" className="relative group flex items-center shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="relative h-12 w-4 sm:h-10 sm:w-52"
            >
              <Image
                src="/Assets/logo.png"
                alt="Sor Juana Liberté"
                fill
                className="object-contain object-left"
                sizes="(max-width: 640px) 176px, 208px"
                priority
              />
              <div className="pointer-events-none absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b8956a] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            {['Inicio', 'Catálogo', 'Italiana', 'Francesa', 'Contacto'].map((item, index) => {
              const paths = {
                'Inicio': '/',
                'Catálogo': '/catalogo',
                'Italiana': '/catalogo?filter=italiana',
                'Francesa': '/catalogo?filter=francesa',
                'Contacto': '/#contacto'
              };
              
              return (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Link 
                    href={paths[item as keyof typeof paths]} 
                    className={`relative group text-sm tracking-widest uppercase transition-colors duration-300 ${
                      scrolled ? 'text-[#e8e3db]' : 'text-[#2a2520]'
                    } hover:text-[#b8956a]`}
                    style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                  >
                    {item}
                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#b8956a] group-hover:w-full transition-all duration-500" />
                  </Link>
                </motion.div>
              );
            })}
            
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center space-x-2 transition-colors duration-300 ${
                scrolled ? 'text-[#e8e3db]' : 'text-[#2a2520]'
              } hover:text-[#b8956a]`}
            >
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>(0)</span>
            </motion.button>
          </div>

          {/* Mobile menu button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden transition-colors duration-300 ${
              scrolled ? 'text-[#e8e3db]' : 'text-[#2a2520]'
            } hover:text-[#b8956a]`}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.43, 0.13, 0.23, 0.96] }}
              className="md:hidden overflow-hidden border-t border-[#b8956a]/20"
            >
              <div className="py-6 space-y-4 bg-[#1a1410]/95 backdrop-blur-md">
                {['Inicio', 'Catálogo', 'Italiana', 'Francesa', 'Contacto'].map((item, index) => {
                  const paths = {
                    'Inicio': '/',
                    'Catálogo': '/catalogo',
                    'Italiana': '/catalogo?filter=italiana',
                    'Francesa': '/catalogo?filter=francesa',
                    'Contacto': '/#contacto'
                  };
                  
                  return (
                    <motion.div
                      key={item}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link 
                        href={paths[item as keyof typeof paths]} 
                        className="block text-[#e8e3db] hover:text-[#b8956a] transition-colors py-2 text-sm tracking-widest uppercase"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                        onClick={() => setIsOpen(false)}
                      >
                        {item}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Bottom decorative line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#b8956a]/30 to-transparent" />
    </motion.nav>
  );
}

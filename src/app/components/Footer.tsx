'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

export function Footer() {
  return (
    <footer className="bg-[#1a1410] text-[#e8e3db] py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#b8956a] to-transparent" />
      
      {/* Vintage pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(0deg, #b8956a 0, #b8956a 1px, transparent 0, transparent 50%)`,
        backgroundSize: '50px 50px'
      }} />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo y descripción */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-2"
          >
            <div className="mb-6">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="inline-block"
              >
                <div 
                  className="text-4xl tracking-wider mb-2"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  <span className="text-[#e8e3db]">SOR</span>
                  <span className="text-[#b8956a] mx-2">◆</span>
                  <span className="text-[#e8e3db]">JUANA</span>
                </div>
                <div className="h-px bg-gradient-to-r from-[#b8956a] via-[#b8956a]/50 to-transparent" />
              </motion.div>
            </div>
            
            <p 
              className="text-[#e8e3db]/70 max-w-md leading-relaxed mb-6 italic"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem' }}
            >
              Desde 2015, acercando la elegancia europea a Merlo, Buenos Aires, Argentina. Moda italiana y francesa de la más alta calidad, 
              seleccionada con pasión y dedicación.
            </p>
            
            <div className="flex items-center space-x-3">
              <div className="h-px w-12 bg-[#b8956a]/50" />
              <span 
                className="text-[#b8956a] tracking-[0.3em] text-xs"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                DESDE 2015
              </span>
              <div className="h-px w-12 bg-[#b8956a]/50" />
            </div>
          </motion.div>

          {/* Enlaces rápidos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h4 
              className="mb-6 pb-3 border-b border-[#b8956a]/30"
              style={{ 
                fontFamily: 'Cormorant Garamond, serif', 
                fontSize: '1.5rem',
                fontWeight: 400,
                color: '#b8956a'
              }}
            >
              Navegación
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/', label: 'Inicio' },
                { href: '/catalogo', label: 'Catálogo' },
                { href: '/catalogo?filter=italiana', label: 'Moda italiana' },
                { href: '/catalogo?filter=francesa', label: 'Moda francesa' },
                { href: '/#contacto', label: 'Contacto' }
              ].map((link, index) => (
                <motion.li 
                  key={link.label}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <Link 
                    href={link.href} 
                    className="group inline-flex items-center text-[#e8e3db]/70 hover:text-[#b8956a] transition-colors duration-300"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                  >
                    <span className="w-0 group-hover:w-4 h-px bg-[#b8956a] transition-all duration-300 mr-0 group-hover:mr-2" />
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Información */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h4 
              className="mb-6 pb-3 border-b border-[#b8956a]/30"
              style={{ 
                fontFamily: 'Cormorant Garamond, serif', 
                fontSize: '1.5rem',
                fontWeight: 400,
                color: '#b8956a'
              }}
            >
              Horario
            </h4>
            <ul className="space-y-3">
              <li 
                className="text-[#e8e3db]/70 flex items-start"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                <span className="text-[#b8956a] mr-2">•</span>
                Lunes a sábado: 10:00 - 20:00
              </li>
              <li 
                className="text-[#e8e3db]/70 flex items-start"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                <span className="text-[#b8956a] mr-2">•</span>
                +54 9 11 1234 5678
              </li>
              <li
                className="text-[#b8956a] flex items-start font-semibold"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                <span className="text-[#b8956a] mr-2">•</span>
                ENVIOS A TODO EL PAIS
              </li>
              <li 
                className="text-[#e8e3db]/70 flex items-start"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                <span className="text-[#b8956a] mr-2">•</span>
                info@sorjuana.com
              </li>
              <li 
                className="text-[#e8e3db]/70 flex items-start mt-4 pt-4 border-t border-[#b8956a]/20"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                <span className="text-[#b8956a] mr-2">•</span>
                Merlo, Buenos Aires<br />
                <span className="ml-4">Argentina</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="border-t border-[#b8956a]/20 pt-8"
        >
          <div className="mb-8 flex flex-col items-center justify-center sm:flex-row sm:gap-4">
            <Link
              href="/politica-cambios-devoluciones"
              className="inline-flex items-center justify-center border border-[#b8956a]/60 bg-transparent px-6 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-[#e8e3db] transition-colors duration-300 hover:border-[#b8956a] hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
            >
              Política de cambios y devoluciones
            </Link>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p 
              className="text-[#e8e3db]/50 text-sm"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
            >
              © 2026 Sor Juana. Todos los derechos reservados.
            </p>
            
            <div className="flex items-center space-x-4">
              <span
                className="text-[#e8e3db]/50 text-xs tracking-wider"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                Desarrollada por{' '}
                <a
                  href="https://deamondd.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#b8956a] transition-colors hover:text-[#e8e3db] hover:underline underline-offset-2"
                >
                  @deamondd
                </a>
              </span>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-[#b8956a] text-xl"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              >
                ❦
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Decorative bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#b8956a] to-transparent opacity-50" />
    </footer>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Menu, X, Instagram, User } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/app/components/ui/utils';
import { siteWhatsAppUrl } from '@/app/config/contact';
import { useCart } from '@/app/context/CartContext';

/** Reemplazá por tus URLs reales */
const SOCIAL = {
  whatsapp: siteWhatsAppUrl,
  instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/@',
} as const;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

const navLinkFont = { fontFamily: 'Montserrat, sans-serif', fontWeight: 300 } as const;

export function Navbar() {
  const pathname = usePathname();
  const { totalCount, toggleCart, isOpen: isCartOpen } = useCart();
  const isCatalog = pathname.startsWith('/catalogo');
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const barSolid = scrolled || isCatalog;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const linkClass = cn(
    'relative text-xs tracking-widest uppercase transition-colors duration-300 lg:text-sm',
    barSolid
      ? 'text-[#e8e3db]'
      : 'text-[#f5f2ed] drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]',
    'hover:text-[#b8956a]',
  );

  const iconBtnClass = cn(
    'flex h-9 w-9 items-center justify-center rounded-sm transition-colors duration-300',
    barSolid
      ? 'text-[#e8e3db] hover:text-[#b8956a]'
      : 'text-[#f5f2ed] drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] hover:text-[#b8956a]',
  );

  const cartClass = cn(
    'flex items-center space-x-2 transition-colors duration-300',
    barSolid
      ? 'text-[#e8e3db]'
      : 'text-[#f5f2ed] drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]',
    'hover:text-[#b8956a]',
  );

  const underline = (
    <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#b8956a] transition-all duration-500 group-hover:w-full" />
  );

  const dropdownContentClass =
    'min-w-[10rem] border border-[#b8956a]/30 bg-[#1a1410] text-[#e8e3db]';

  const dropdownItemClass =
    'cursor-pointer uppercase tracking-widest focus:bg-[#b8956a]/20 focus:text-[#f5f2ed]';

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
      className={cn(
        'fixed top-0 right-0 left-0 z-50 transition-all duration-500',
        barSolid
          ? 'border-b border-[#b8956a]/20 bg-[#1a1410]/95 shadow-2xl backdrop-blur-md'
          : 'bg-transparent shadow-none',
      )}
    >
      <div className="h-1 bg-gradient-to-r from-transparent via-[#b8956a] to-transparent opacity-50" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-24 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Sor Juana Liberté, inicio"
            className="group relative flex shrink-0 items-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="relative h-14 w-[13.5rem] sm:h-[4.25rem] sm:w-[15.5rem] md:h-[5rem] md:w-[17.5rem]"
            >
              <Image
                src="/Assets/logo-b.png"
                alt=""
                fill
                sizes="(max-width: 640px) 216px, (max-width: 768px) 248px, 280px"
                className={cn(
                  'object-contain object-center transition-[filter] duration-300',
                  !barSolid && 'drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]',
                )}
                priority
              />
              <div className="pointer-events-none absolute -bottom-1 right-0 left-0 h-px bg-gradient-to-r from-transparent via-[#b8956a] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.div>
          </Link>

          {/* Desktop: landing */}
          {!isCatalog && (
            <div className="hidden flex-wrap items-center justify-end gap-x-6 gap-y-2 lg:flex xl:gap-x-8">
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Link href="/" className={cn(linkClass, 'group relative')} style={navLinkFont}>
                  Inicio
                  {underline}
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Link href="/#coleccion" className={cn(linkClass, 'group relative')} style={navLinkFont}>
                  Colección
                  {underline}
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Link href="/#quienes-somos" className={cn(linkClass, 'group relative')} style={navLinkFont}>
                  Quiénes somos
                  {underline}
                </Link>
              </motion.div>
           
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Link href="/catalogo" className={cn(linkClass, 'group relative')} style={navLinkFont}>
                  Catálogo
                  {underline}
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Link href="/#contacto" className={cn(linkClass, 'group relative')} style={navLinkFont}>
                  Contacto
                  {underline}
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
                <Link href="/login" className={iconBtnClass} aria-label="Iniciar sesión">
                  <User className="h-5 w-5" strokeWidth={1.5} />
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                className={cartClass}
                aria-label="Carrito"
                aria-expanded={isCartOpen}
                onClick={toggleCart}
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  ({totalCount})
                </span>
              </motion.button>
            </div>
          )}

          {/* Desktop: catálogo */}
          {isCatalog && (
            <div className="hidden items-center justify-end gap-6 lg:flex xl:gap-8">
              <Link href="/" className={cn(linkClass, 'group relative')} style={navLinkFont}>
                Inicio
                {underline}
              </Link>
              <Link href="/catalogo" className={cn(linkClass, 'group relative')} style={navLinkFont}>
                Catálogo
                {underline}
              </Link>
              <a
                href={SOCIAL.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={iconBtnClass}
                aria-label="WhatsApp"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={iconBtnClass}
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" strokeWidth={1.5} />
              </a>
              <a
                href={SOCIAL.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className={iconBtnClass}
                aria-label="TikTok"
              >
                <TikTokIcon className="h-5 w-5" />
              </a>
              <Link href="/login" className={iconBtnClass} aria-label="Iniciar sesión">
                <User className="h-5 w-5" strokeWidth={1.5} />
              </Link>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                className={cartClass}
                aria-label="Carrito"
                aria-expanded={isCartOpen}
                onClick={toggleCart}
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  ({totalCount})
                </span>
              </motion.button>
            </div>
          )}

          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/login" className={iconBtnClass} aria-label="Iniciar sesión">
              <User className="h-5 w-5" strokeWidth={1.5} />
            </Link>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className={cartClass}
              aria-label="Carrito"
              aria-expanded={isCartOpen}
              onClick={toggleCart}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                ({totalCount})
              </span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setIsOpen((o) => !o)}
              className={cn(
                'flex items-center transition-colors duration-300',
                barSolid
                  ? 'text-[#e8e3db]'
                  : 'text-[#f5f2ed] drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]',
                'hover:text-[#b8956a]',
              )}
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.43, 0.13, 0.23, 0.96] }}
              className="overflow-hidden border-t border-[#b8956a]/20 lg:hidden"
            >
              <div className="space-y-1 bg-[#1a1410]/95 py-6 backdrop-blur-md">
                {!isCatalog && (
                  <>
                    <MobileLink href="/" onNavigate={() => setIsOpen(false)}>
                      Inicio
                    </MobileLink>
                    <MobileLink href="/#coleccion" onNavigate={() => setIsOpen(false)}>
                      Colección
                    </MobileLink>
                    <MobileLink href="/#quienes-somos" onNavigate={() => setIsOpen(false)}>
                      Quiénes somos
                    </MobileLink>
                 
               
                    <MobileLink href="/catalogo" onNavigate={() => setIsOpen(false)}>
                      Catálogo
                    </MobileLink>
                    <MobileLink href="/#contacto" onNavigate={() => setIsOpen(false)}>
                      Contacto
                    </MobileLink>
                    <MobileLink href="/login" onNavigate={() => setIsOpen(false)}>
                      Iniciar sesión
                    </MobileLink>
                  </>
                )}
                {isCatalog && (
                  <>
                    <MobileLink href="/" onNavigate={() => setIsOpen(false)}>
                      Inicio
                    </MobileLink>
                    <MobileLink href="/catalogo" onNavigate={() => setIsOpen(false)}>
                      Catálogo
                    </MobileLink>
                    <MobileLink href="/login" onNavigate={() => setIsOpen(false)}>
                      Iniciar sesión
                    </MobileLink>
                    <div className="flex items-center justify-center gap-6 px-4 pt-4">
                      <a
                        href={SOCIAL.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e8e3db] hover:text-[#b8956a]"
                        aria-label="WhatsApp"
                      >
                        <WhatsAppIcon className="h-6 w-6" />
                      </a>
                      <a
                        href={SOCIAL.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e8e3db] hover:text-[#b8956a]"
                        aria-label="Instagram"
                      >
                        <Instagram className="h-6 w-6" strokeWidth={1.5} />
                      </a>
                      <a
                        href={SOCIAL.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e8e3db] hover:text-[#b8956a]"
                        aria-label="TikTok"
                      >
                        <TikTokIcon className="h-6 w-6" />
                      </a>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#b8956a]/30 to-transparent" />
    </motion.nav>
  );
}

function MobileLink({
  href,
  children,
  onNavigate,
  indent,
}: {
  href: string;
  children: ReactNode;
  onNavigate: () => void;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'block px-4 py-2.5 text-sm tracking-widest text-[#e8e3db] uppercase transition-colors hover:text-[#b8956a] sm:px-6',
        indent && 'pl-10 sm:pl-12',
      )}
      style={navLinkFont}
    >
      {children}
    </Link>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';
import { FloatingWhatsApp } from '@/app/components/FloatingWhatsApp';
import { CartSheet } from '@/app/components/CartSheet';
import { cn } from '@/app/components/ui/utils';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar =
    pathname.startsWith('/login') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/politica-cambios-devoluciones') ||
    pathname.startsWith('/terminos-y-condiciones');
  const hideSiteFooter =
    pathname.startsWith('/login') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/politica-cambios-devoluciones') ||
    pathname.startsWith('/terminos-y-condiciones');

  return (
    <>
      {!hideNavbar && <Navbar />}
      {!hideNavbar && <CartSheet />}
      <div
        className={cn(
          'min-w-0 overflow-x-clip',
          !hideNavbar && 'pt-[var(--site-nav-offset)]',
        )}
      >
        {children}
      </div>
      {!hideSiteFooter && <Footer />}
      {!hideSiteFooter && <FloatingWhatsApp />}
    </>
  );
}

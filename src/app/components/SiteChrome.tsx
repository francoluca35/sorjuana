'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';
import { FloatingWhatsApp } from '@/app/components/FloatingWhatsApp';
import { CartSheet } from '@/app/components/CartSheet';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar =
    pathname.startsWith('/login') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/politica-cambios-devoluciones');
  const hideSiteFooter =
    pathname.startsWith('/login') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/politica-cambios-devoluciones');

  return (
    <>
      {!hideNavbar && <Navbar />}
      {!hideNavbar && <CartSheet />}
      <div className="min-w-0 overflow-x-clip">{children}</div>
      {!hideSiteFooter && <Footer />}
      {!hideSiteFooter && <FloatingWhatsApp />}
    </>
  );
}

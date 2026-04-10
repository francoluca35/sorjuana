'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';
import { FloatingWhatsApp } from '@/app/components/FloatingWhatsApp';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = pathname.startsWith('/login') || pathname.startsWith('/dashboard');
  const hideSiteFooter = pathname.startsWith('/login') || pathname.startsWith('/dashboard');

  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
      {!hideSiteFooter && <Footer />}
      {!hideSiteFooter && <FloatingWhatsApp />}
    </>
  );
}

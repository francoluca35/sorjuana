'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { CartProvider } from '@/app/context/CartContext';

export function SiteProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </CartProvider>
  );
}

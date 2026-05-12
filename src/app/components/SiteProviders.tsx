'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { CartProvider } from '@/app/context/CartContext';
import { ChunkLoadRecovery } from '@/app/components/ChunkLoadRecovery';

export function SiteProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <ChunkLoadRecovery />
      {children}
      <Toaster position="top-center" richColors closeButton />
    </CartProvider>
  );
}

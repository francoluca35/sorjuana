import { Suspense } from 'react';
import { CatalogoPage } from '@/app/pages/CatalogoPage';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div
          className="pt-[var(--nav-height)] min-h-screen bg-[#f5f2ed]"
          aria-busy="true"
          aria-label="Cargando catálogo"
        />
      }
    >
      <CatalogoPage />
    </Suspense>
  );
}

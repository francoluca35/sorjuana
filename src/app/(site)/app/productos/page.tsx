import type { Metadata } from 'next';
import { ProductosCatalog } from '@/app/components/app/ProductosCatalog';
import { cn } from '@/app/components/ui/utils';
import { productRowToCatalogProduct } from '@/lib/data/productCatalog';
import { fetchRecentProducts } from '@/lib/data/recentProducts';

export const metadata: Metadata = {
  title: 'Lista de productos — Sor Juana',
};

const shellBleed = cn(
  '-mx-4 -my-4 w-[calc(100%+2rem)] min-w-0 max-w-none sm:-mx-6 sm:-my-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-8 lg:w-[calc(100%+4rem)]',
  'min-h-dvh bg-slate-50',
);

export default async function Page() {
  const rows = await fetchRecentProducts(500);
  const initialProducts = rows.map(productRowToCatalogProduct);

  return (
    <div className={shellBleed}>
      <ProductosCatalog initialProducts={initialProducts} />
    </div>
  );
}

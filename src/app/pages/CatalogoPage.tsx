'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ProductDetailModal,
  ProductMediaCarousel,
  buildProductForDetailModal,
  type ProductVariantForDetailModal,
} from '@/app/components/ProductDetailModal';
import { SingleLineFitText } from '@/app/components/SingleLineFitText';
import {
	ADMIN_CATEGORY_SLUGS,
	displayCategoryLabel,
	parseCategoryPathSegments,
	parseSubcategorySlugFromDb,
} from '@/lib/data/productCatalog';
import {
  CARD_INSTALLMENTS_NO_INTEREST,
  computeDiscountPercent,
  formatCuotaAr,
  formatPrecioListaAr,
  getPrimaryDiscountedPrice,
} from '@/lib/formatPrice';
import type { SizeInventoryRow } from '@/lib/data/productSizes';
import { CLIENT_CATEGORY_SPOTLIGHTS, marketingCategoryLabel } from '@/lib/clientCategoryDefaults';

type CatalogProduct = {
  id: string;
  name: string;
  /** Código visible (mismo criterio que el panel). */
  product_code: string;
  color: string;
  garment_cost: number;
  price: number;
  transfer_price: number;
  final_transfer_price: number;
  cash_discount_percent: number | null;
  transfer_discount_percent: number | null;
  image: string;
  /** Valor crudo en DB: `slug` o `slug/subslug` */
  category_db: string | null;
  gallery_image_urls: string[];
  video_url: string | null;
  description: string;
  size_inventory: SizeInventoryRow[];
  stock: number;
};

function parseCategoryRoot(raw: string | null): string | null {
	const parts = parseCategoryPathSegments(raw);
	return parts[0] ?? null;
}

/** Coincide si el slug aparece como único segmento o en cualquier posición bajo la línea (`a/b`, `a/b/c`). */
function categoryDbHasSubSlugSegment(category_db: string | null, slug: string): boolean {
	const parts = parseCategoryPathSegments(category_db);
	if (!slug || parts.length === 0) return false;
	if (parts.length === 1) return parts[0] === slug;
	return parts.slice(1).some((seg) => seg === slug);
}

export function CatalogoPage({ products }: { products: CatalogProduct[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const categoriaParam = searchParams.get('categoria');
  const subcategoriaParam = searchParams.get('subcategoria');
  const qParam = (searchParams.get('q') ?? '').trim();
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedSubSlug, setSelectedSubSlug] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const adminTipoSlugSet = useMemo(
    () => new Set<string>(ADMIN_CATEGORY_SLUGS as readonly string[]),
    [],
  );

  const marketingSlugSet = useMemo(
    () => new Set<string>(CLIENT_CATEGORY_SPOTLIGHTS.map((c) => c.slug)),
    [],
  );

  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);

  const replaceCatalogQuery = useCallback(
    (updates: {
      filter?: string | null;
      subcategoria?: string | null;
      categoria?: string | null;
      q?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.filter !== undefined) {
        if (!updates.filter || updates.filter === 'all') params.delete('filter');
        else params.set('filter', updates.filter);
      }
      if (updates.subcategoria !== undefined) {
        if (!updates.subcategoria || updates.subcategoria === 'all') {
          params.delete('subcategoria');
        } else {
          params.set('subcategoria', updates.subcategoria);
        }
      }
      if (updates.categoria !== undefined) {
        if (!updates.categoria?.trim()) params.delete('categoria');
        else params.set('categoria', updates.categoria.trim());
      }
      if (updates.q !== undefined) {
        const term = updates.q?.trim() ?? '';
        if (!term) params.delete('q');
        else params.set('q', term);
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const productRows = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        adminCategory: parseCategoryRoot(p.category_db),
      })),
    [products],
  );

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of productRows) {
      if (p.adminCategory) set.add(p.adminCategory);
    }
    return Array.from(set).map((slug) => ({
      value: slug,
      label: displayCategoryLabel(slug),
    }));
  }, [productRows]);

  const categoriaParamNorm = (categoriaParam ?? '').trim().toLowerCase();

  const lineRootSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of productRows) {
      const r = parseCategoryRoot(p.category_db);
      if (r) s.add(r);
    }
    return s;
  }, [productRows]);

  const allSubSlugsInCatalog = useMemo(() => {
    const s = new Set<string>();
    for (const p of productRows) {
      const parts = parseCategoryPathSegments(p.category_db);
      for (let i = 1; i < parts.length; i++) {
        s.add(parts[i]!);
      }
    }
    return s;
  }, [productRows]);

  /** `?categoria=italiano` cuando coincide con la raíz de ruta en productos cargados. */
  const lineSlugFromCategoriaParam = useMemo(() => {
    if (!categoriaParamNorm) return null;
    if (lineRootSet.has(categoriaParamNorm)) return categoriaParamNorm;
    return null;
  }, [categoriaParamNorm, lineRootSet]);

  /** `?categoria=pantalones` u otro slug de subcategoría (todas las líneas), o preset admin aunque aún no haya stock. */
  const globalTipoSlug = useMemo(() => {
    if (!categoriaParamNorm || lineSlugFromCategoriaParam) return null;
    if (allSubSlugsInCatalog.has(categoriaParamNorm)) return categoriaParamNorm;
    if (adminTipoSlugSet.has(categoriaParamNorm)) return categoriaParamNorm;
    const pathMatch = productRows.some((p) =>
      categoryDbHasSubSlugSegment(p.category_db, categoriaParamNorm),
    );
    if (pathMatch) return categoriaParamNorm;
    if (marketingSlugSet.has(categoriaParamNorm)) return categoriaParamNorm;
    return null;
  }, [
    categoriaParamNorm,
    lineSlugFromCategoriaParam,
    allSubSlugsInCatalog,
    adminTipoSlugSet,
    productRows,
    marketingSlugSet,
  ]);

  const catalogHeadingLabel = useMemo(() => {
    if (selectedFilter !== 'all') return displayCategoryLabel(selectedFilter);
    if (globalTipoSlug) {
      return marketingCategoryLabel(globalTipoSlug) ?? displayCategoryLabel(globalTipoSlug);
    }
    return 'Colección completa';
  }, [selectedFilter, globalTipoSlug]);

  useEffect(() => {
    const fromFilter = filterParam?.trim().toLowerCase() ?? '';
    const fromLineCat = lineSlugFromCategoriaParam ?? '';
    const raw = fromFilter || fromLineCat;
    const valid = raw && categoryOptions.some((x) => x.value === raw);
    if (valid) {
      setSelectedFilter(raw);
    } else {
      setSelectedFilter('all');
    }
  }, [filterParam, lineSlugFromCategoriaParam, categoryOptions]);

  const subcategoryOptions = useMemo(() => {
    if (selectedFilter === 'all') return [];
    const set = new Set<string>();
    for (const p of productRows) {
      if (p.adminCategory !== selectedFilter) continue;
      const sub = parseSubcategorySlugFromDb(p.category_db);
      if (sub) set.add(sub);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((slug) => ({
        value: slug,
        label: displayCategoryLabel(slug),
      }));
  }, [productRows, selectedFilter]);

  useEffect(() => {
    setSelectedSubSlug('all');
  }, [selectedFilter]);

  useEffect(() => {
    const raw = subcategoriaParam?.trim().toLowerCase() ?? '';
    if (!raw) {
      setSelectedSubSlug('all');
      return;
    }
    if (selectedFilter === 'all') {
      setSelectedSubSlug('all');
      return;
    }
    const valid = subcategoryOptions.some((x) => x.value === raw);
    setSelectedSubSlug(valid ? raw : 'all');
  }, [subcategoriaParam, selectedFilter, subcategoryOptions]);

  const searchNorm = searchQuery.trim().toLowerCase();

  const filteredProducts = productRows.filter((product) => {
    const categoryMatch = selectedFilter === 'all' || product.adminCategory === selectedFilter;
    const tipoMatch =
      !globalTipoSlug || categoryDbHasSubSlugSegment(product.category_db, globalTipoSlug);
    const subMatch =
      selectedSubSlug === 'all' ||
      parseSubcategorySlugFromDb(product.category_db) === selectedSubSlug;

    const searchMatch =
      !searchNorm ||
      [
        product.name,
        product.product_code,
        product.description,
        product.color,
        product.category_db,
        displayCategoryLabel(product.category_db),
      ].some((field) => field?.trim().toLowerCase().includes(searchNorm));

    const refPrice = product.garment_cost > 0 ? product.garment_cost : product.price;
    let priceMatch = true;
    if (priceRange === 'low') {
      priceMatch = refPrice < 200;
    } else if (priceRange === 'mid') {
      priceMatch = refPrice >= 200 && refPrice < 300;
    } else if (priceRange === 'high') {
      priceMatch = refPrice >= 300;
    }

    return categoryMatch && tipoMatch && subMatch && priceMatch && searchMatch;
  });

  const groupedPublications = useMemo(() => {
    type RowWithAdmin = (typeof filteredProducts)[number];
    const byName = new Map<string, RowWithAdmin[]>();
    for (const row of filteredProducts) {
      const key = row.name.trim().toLowerCase();
      const bucket = byName.get(key);
      if (bucket) bucket.push(row);
      else byName.set(key, [row]);
    }

    const out: Array<
      Omit<RowWithAdmin, 'adminCategory'> & {
        variants: ProductVariantForDetailModal[];
      }
    > = [];

    for (const rows of byName.values()) {
      if (rows.length === 0) continue;
      const base = rows[0]!;
      const variants: ProductVariantForDetailModal[] = rows.map((row) => ({
        id: row.id,
        color: row.color?.trim() || null,
        size_inventory: row.size_inventory,
        stock: row.stock,
        price: row.price,
        image: row.image,
      }));
      const stock = rows.reduce((sum, row) => sum + Math.max(0, row.stock), 0);
      const withMedia = rows.find((row) => row.gallery_image_urls.length > 0 || row.video_url?.trim());
      const withPrice = rows.find((row) => row.garment_cost > 0) ?? base;
      const withCategory = rows.find((row) => row.category_db?.trim()) ?? base;
      const withDescription = rows.find((row) => row.description.trim().length > 0) ?? base;
      const withCode = rows.find((row) => row.product_code?.trim()) ?? base;
      out.push({
        id: base.id,
        name: base.name,
        product_code: withCode.product_code?.trim() || base.product_code || '',
        color: base.color,
        garment_cost: withPrice.garment_cost,
        price: withPrice.price,
        transfer_price: withPrice.transfer_price,
        final_transfer_price: withPrice.final_transfer_price,
        cash_discount_percent: withPrice.cash_discount_percent,
        transfer_discount_percent: withPrice.transfer_discount_percent,
        image: (withMedia ?? base).image,
        category_db: withCategory.category_db,
        gallery_image_urls: (withMedia ?? base).gallery_image_urls,
        video_url: (withMedia ?? base).video_url,
        description: withDescription.description,
        size_inventory: [],
        stock,
        variants,
      });
    }
    return out;
  }, [filteredProducts]);

  const productsWithMedia = useMemo(
    () =>
      groupedPublications.map((p) => {
        return buildProductForDetailModal(p);
      }),
    [groupedPublications],
  );

  const productById = useMemo(() => {
    const m = new Map<string, (typeof productsWithMedia)[number]>();
    for (const p of productsWithMedia) m.set(p.id, p);
    return m;
  }, [productsWithMedia]);

  const selectedProduct = selectedProductId ? productById.get(selectedProductId) ?? null : null;

  function closeProductModal() {
    setSelectedProductId(null);
  }

  const filterSidebarBtn = (active: boolean) =>
    `w-full rounded-md border-l-2 px-3 py-2.5 text-left text-sm transition ${
      active
        ? 'border-[#b8956a] bg-[#b8956a]/12 text-[#1a1410]'
        : 'border-transparent bg-white text-[#6b6156] hover:border-[#b8956a]/35 hover:bg-[#faf8f7]'
    }`;

  const FiltersSidebar = () => (
    <aside
      className="min-w-0 rounded-xl border-2 border-[#b8956a]/20 bg-white p-5 shadow-sm lg:sticky lg:top-40 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto"
      aria-label="Filtros del catálogo"
    >
      <h2
        className="mb-6 border-b border-[#b8956a]/20 pb-4 text-[#1a1410]"
        style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 400 }}
      >
        Filtros
      </h2>
      {globalTipoSlug ? (
        <div
          className="mb-6 rounded-lg border border-[#b8956a]/25 bg-[#faf8f7] px-3 py-2.5 text-[0.75rem] leading-snug text-[#4a4238]"
          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
        >
          <span className="block text-[#6b6156]">Tipo desde el inicio</span>
          <span className="font-medium text-[#1a1410]">{displayCategoryLabel(globalTipoSlug)}</span>
          <button
            type="button"
            className="mt-2 text-left text-[0.7rem] text-[#b8956a] underline decoration-[#b8956a]/40 underline-offset-2 hover:text-[#1a1410]"
            onClick={() => replaceCatalogQuery({ categoria: null })}
          >
            Ver catálogo completo (quitar tipo)
          </button>
        </div>
      ) : null}
      <div className="space-y-8">
        <div>
          <h3
            className="mb-3 text-[#1a1410]"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 400 }}
          >
            Categorías
          </h3>
          <div className="flex max-h-[min(40vh,22rem)] flex-col gap-1 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible">
            {[{ value: 'all', label: 'Todas' }, ...categoryOptions].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setSelectedFilter(filter.value);
                  setSelectedSubSlug('all');
                  replaceCatalogQuery({
                    filter: filter.value === 'all' ? null : filter.value,
                    subcategoria: null,
                  });
                }}
                className={filterSidebarBtn(selectedFilter === filter.value)}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        {selectedFilter !== 'all' && subcategoryOptions.length > 0 ? (
          <div className="border-t border-[#b8956a]/15 pt-6">
            <h3
              className="mb-3 text-[#1a1410]"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 400 }}
            >
              Tipo / subcategoría
            </h3>
            <p
              className="mb-3 text-[0.7rem] leading-snug text-[#8a7a68]"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
            >
              Según cómo estén cargados en el sistema (ej. remeras, pantalones).
            </p>
            <div className="flex max-h-[min(36vh,18rem)] flex-col gap-1 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible">
              {[{ value: 'all', label: 'Todas' }, ...subcategoryOptions].map((sub) => (
                <button
                  key={sub.value}
                  type="button"
                  onClick={() => {
                    setSelectedSubSlug(sub.value);
                    replaceCatalogQuery({
                      subcategoria: sub.value === 'all' ? null : sub.value,
                    });
                  }}
                  className={filterSidebarBtn(selectedSubSlug === sub.value)}
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="border-t border-[#b8956a]/15 pt-6">
          <h3
            className="mb-3 text-[#1a1410]"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 400 }}
          >
            Precio
          </h3>
          <div className="flex flex-col gap-1">
            {[
              { value: 'all', label: 'Todos los precios' },
              { value: 'low', label: 'Menos de $200' },
              { value: 'mid', label: '$200 – $300' },
              { value: 'high', label: 'Más de $300' },
            ].map((price) => (
              <button
                key={price.value}
                type="button"
                onClick={() => setPriceRange(price.value)}
                className={filterSidebarBtn(priceRange === price.value)}
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
              >
                {price.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen w-full min-w-0 bg-[#f5f2ed] px-4 pt-7 pb-20 sm:px-6 lg:px-8 lg:pt-20">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <div className="flex items-center justify-center mb-6">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-px bg-gradient-to-r from-transparent to-[#b8956a]"
            />
            <span 
              className="mx-6 text-[#8b6f47] tracking-[0.3em] text-sm"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
            >
              CATÁLOGO
            </span>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-px bg-gradient-to-l from-transparent to-[#b8956a]"
            />
          </div>
          
          <h1 
            className="text-[#1a1410] mb-4"
            style={{ 
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 300,
              letterSpacing: '0.05em'
            }}
          >
            {catalogHeadingLabel}
          </h1>

          <p
            className="text-[#6b6156] italic"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}
          >
            {!globalTipoSlug && selectedFilter === 'all' && 'Explora nuestra colección de moda europea'}
            {globalTipoSlug && selectedFilter === 'all' &&
              `Todos los ${displayCategoryLabel(globalTipoSlug)} en todas las líneas (italiana, francesa, nacional, etc.)`}
            {!globalTipoSlug && selectedFilter !== 'all' &&
              `Selección de ${displayCategoryLabel(selectedFilter)} disponible en tienda`}
            {globalTipoSlug && selectedFilter !== 'all' &&
              `${displayCategoryLabel(globalTipoSlug)} dentro de ${displayCategoryLabel(selectedFilter)}`}
          </p>
        </motion.div>

        <div className="grid min-w-0 gap-8 lg:grid-cols-4 lg:items-start lg:gap-10">
          <div className="min-w-0 lg:col-span-1">
            <FiltersSidebar />
          </div>

          <div className="min-w-0 lg:col-span-3">
            <div className="mb-6">
              <form
                className="relative max-w-xl"
                onSubmit={(e) => {
                  e.preventDefault();
                  replaceCatalogQuery({ q: searchQuery.trim() || null });
                }}
              >
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b6f47]"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, código o categoría…"
                  className="w-full rounded-md border border-[#b8956a]/35 bg-white py-2.5 pr-10 pl-10 text-sm text-[#1a1410] placeholder:text-[#8a7a68] focus:border-[#b8956a] focus:outline-none focus:ring-1 focus:ring-[#b8956a]/40"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                  aria-label="Buscar en el catálogo"
                />
                {searchQuery.trim() ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs tracking-wider text-[#8b6f47] hover:text-[#1a1410]"
                    onClick={() => {
                      setSearchQuery('');
                      replaceCatalogQuery({ q: null });
                    }}
                  >
                    Limpiar
                  </button>
                ) : null}
              </form>
            </div>
            <div className="mb-8 flex items-center justify-between">
              <p
                className="text-[#6b6156]"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1 ? 'variante' : 'variantes'} · {groupedPublications.length}{' '}
                {groupedPublications.length === 1 ? 'publicación' : 'publicaciones'}
                {searchNorm ? ` · búsqueda: «${searchQuery.trim()}»` : ''}
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-8">
              <AnimatePresence mode="popLayout">
                {productsWithMedia.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.35) }}
                    className="group flex min-w-0 w-full cursor-pointer flex-col bg-white border-2 border-transparent text-left hover:border-[#b8956a]/30 transition-all duration-500"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedProductId(product.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProductId(product.id);
                      }
                    }}
                  >
                    <div className="relative aspect-[3/4] w-full min-w-0 overflow-hidden bg-[#ebe6df]">
                      <ProductMediaCarousel
                        media={product.media}
                        productName={product.name}
                        className="absolute inset-0 h-full w-full max-h-none"
                        autoPlay={false}
                      />
                      
                      <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-[#b8956a] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
                      <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-[#b8956a] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
                      
                      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedProductId(product.id);
                          }}
                          className="pointer-events-auto flex w-full items-center justify-center gap-2 border border-[#b8956a]/60 bg-[#1a1410] px-4 py-3 text-[#f5f2ed] transition-all duration-300 hover:bg-[#b8956a]"
                          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
                        >
                          <ShoppingCart className="h-4 w-4" strokeWidth={1.6} />
                          <span className="text-xs uppercase tracking-[0.18em]">Agregar al carrito</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 text-center">
                      <div 
                        className="text-[#8b6f47] text-xs mb-2 tracking-[0.2em]"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                      >
                        {product.category_db ? displayCategoryLabel(product.category_db) : 'Sin categoría'}
                      </div>
                      <h3 
                        className="text-[#1a1410] mb-3 group-hover:text-[#b8956a] transition-colors duration-300"
                        style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 400 }}
                      >
                        {product.name}
                      </h3>
                      <div className="mx-auto max-w-sm">
						{(() => {
							const discountedPrice = getPrimaryDiscountedPrice(product.price, product.transfer_price);
							const listPrice =
								product.final_transfer_price > 0
									? product.final_transfer_price
									: discountedPrice;
							const discountPercent = computeDiscountPercent(listPrice, discountedPrice);
							const hasDiscount = discountPercent > 0;
							const installments = CARD_INSTALLMENTS_NO_INTEREST;

							return (
								<>
									{hasDiscount ? (
										<div className="mb-1 flex min-w-0 flex-nowrap items-center justify-center gap-2">
											<div className="min-w-0 max-w-[65%]">
												<SingleLineFitText
													minFontSizePx={9}
													maxFontSizePx={14}
													className="text-sm text-[#6b6156] line-through"
													style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
												>
													{formatPrecioListaAr(listPrice)}
												</SingleLineFitText>
											</div>
											<span
												className="shrink-0 text-base text-[#d61f45]"
												style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}
											>
												{discountPercent}% OFF
											</span>
										</div>
									) : null}
									<div className="flex min-w-0 w-full items-center justify-center gap-2">
										<div className="h-px w-8 shrink-0 bg-[#b8956a]/30" />
										<div className="min-w-0 flex-1">
											<SingleLineFitText
												minFontSizePx={11}
												maxFontSizePx={30}
												className="text-[#1a1410]"
												style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800 }}
											>
												{formatPrecioListaAr(discountedPrice)}
											</SingleLineFitText>
										</div>
										<div className="h-px w-8 shrink-0 bg-[#b8956a]/30" />
									</div>
									<p
										className="mt-1 text-center text-[10px] uppercase tracking-[0.18em] text-[#6b6156]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
									>
										Efectivo o transferencia
									</p>
									<SingleLineFitText
										wrapperClassName="mt-1"
										minFontSizePx={9}
										maxFontSizePx={14}
										className="text-sm text-[#1a1410]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
									>
										{`Precio de lista: ${formatPrecioListaAr(listPrice)}`}
									</SingleLineFitText>
									<SingleLineFitText
										wrapperClassName="mt-1"
										minFontSizePx={9}
										maxFontSizePx={14}
										className="text-sm text-[#1a1410]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500 }}
									>
										{`${installments} x ${formatCuotaAr(listPrice, installments)} sin interés`}
									</SingleLineFitText>
									<p
										className="mt-1 text-center text-[10px] uppercase tracking-[0.18em] text-[#6b6156]"
										style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}
									>
										{product.stock > 0 ? `Stock disponible: ${product.stock}` : 'No hay stock disponible.'}
									</p>
								</>
							);
						})()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {groupedPublications.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <p 
                  className="text-[#6b6156] italic"
                  style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem' }}
                >
                  No hay productos con estos filtros
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <ProductDetailModal product={selectedProduct} onClose={closeProductModal} />
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ProductDetailModal,
  ProductMediaCarousel,
  buildProductForDetailModal,
} from '@/app/components/ProductDetailModal';
import { displayCategoryLabel } from '@/lib/data/productCatalog';
import type { SizeInventoryRow } from '@/lib/data/productSizes';

type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  transfer_price: number;
  final_transfer_price: number;
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
  if (!raw?.trim()) return null;
  const root = raw.trim().toLowerCase().split('/')[0];
  return root || null;
}

export function CatalogoPage({ products }: { products: CatalogProduct[] }) {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const categoriaParam = searchParams.get('categoria');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [adminCategorySlug, setAdminCategorySlug] = useState<string | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

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

  useEffect(() => {
    const raw = filterParam?.trim().toLowerCase() ?? '';
    const valid = raw && categoryOptions.some((x) => x.value === raw);
    if (valid) {
      setSelectedFilter(raw);
    } else {
      setSelectedFilter('all');
    }
  }, [filterParam, categoryOptions]);

  useEffect(() => {
    const raw = categoriaParam?.trim().toLowerCase() ?? '';
    const valid = raw && categoryOptions.some((x) => x.value === raw);
    if (valid) {
      setAdminCategorySlug(raw);
    } else {
      setAdminCategorySlug(null);
    }
  }, [categoriaParam, categoryOptions]);

  const filteredProducts = productRows.filter((product) => {
    const categoryMatch = selectedFilter === 'all' || product.adminCategory === selectedFilter;
    const adminMatch =
      !adminCategorySlug || product.adminCategory === adminCategorySlug;

    let priceMatch = true;
    if (priceRange === 'low') {
      priceMatch = product.price < 200;
    } else if (priceRange === 'mid') {
      priceMatch = product.price >= 200 && product.price < 300;
    } else if (priceRange === 'high') {
      priceMatch = product.price >= 300;
    }
    
    return categoryMatch && adminMatch && priceMatch;
  });

  const productsWithMedia = useMemo(
    () =>
      filteredProducts.map((p) => {
        const { adminCategory: _a, ...base } = p;
        return buildProductForDetailModal(base);
      }),
    [filteredProducts],
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

  const FilterSection = () => (
    <div className="space-y-8">
      <div>
        <h3 
          className="text-[#1a1410] mb-6 pb-3 border-b-2 border-[#b8956a]/30"
          style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 400 }}
        >
          Categorías
        </h3>
        <div className="space-y-2">
          {[{ value: 'all', label: 'Todas' }, ...categoryOptions].map((filter) => (
            <motion.button
              key={filter.value}
              whileHover={{ x: 5 }}
              onClick={() => setSelectedFilter(filter.value)}
              className={`w-full text-left px-6 py-3 border-l-2 transition-all duration-300 ${
                selectedFilter === filter.value
                  ? 'bg-[#b8956a]/10 border-[#b8956a] text-[#1a1410]'
                  : 'bg-white border-transparent text-[#6b6156] hover:border-[#b8956a]/50 hover:bg-[#f5f2ed]'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
            >
              {filter.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <h3 
          className="text-[#1a1410] mb-6 pb-3 border-b-2 border-[#b8956a]/30"
          style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 400 }}
        >
          Precio
        </h3>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'Todos los precios' },
            { value: 'low', label: 'Menos de $200' },
            { value: 'mid', label: '$200 - $300' },
            { value: 'high', label: 'Más de $300' }
          ].map((price) => (
            <motion.button
              key={price.value}
              whileHover={{ x: 5 }}
              onClick={() => setPriceRange(price.value)}
              className={`w-full text-left px-6 py-3 border-l-2 transition-all duration-300 ${
                priceRange === price.value
                  ? 'bg-[#b8956a]/10 border-[#b8956a] text-[#1a1410]'
                  : 'bg-white border-transparent text-[#6b6156] hover:border-[#b8956a]/50 hover:bg-[#f5f2ed]'
              }`}
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
            >
              {price.label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f2ed] pt-40 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
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
            {selectedFilter === 'all' && 'Colección completa'}
            {selectedFilter !== 'all' && displayCategoryLabel(selectedFilter)}
          </h1>
          
          <p 
            className="text-[#6b6156] italic"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}
          >
            {selectedFilter === 'all' &&
              'Explora nuestra colección de moda europea'}
            {selectedFilter !== 'all' &&
              `Selección de ${displayCategoryLabel(selectedFilter)} disponible en tienda`}
          </p>
          {adminCategorySlug ? (
            <p
              className="mt-4 text-[#1a1410]"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 500, fontSize: '0.9rem' }}
            >
              Categoría:{' '}
              <span className="text-[#b8956a]">{displayCategoryLabel(adminCategorySlug)}</span>
            </p>
          ) : null}
        </motion.div>

        {/* Mobile Filter Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowMobileFilter(!showMobileFilter)}
          className="lg:hidden mb-8 flex items-center space-x-3 bg-[#1a1410] text-[#f5f2ed] px-8 py-4 hover:bg-[#b8956a] transition-all duration-500 border border-[#b8956a]/30 w-full justify-center"
        >
          <Filter className="w-5 h-5" strokeWidth={1.5} />
          <span 
            className="tracking-[0.2em] text-sm"
            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
          >
            FILTROS
          </span>
        </motion.button>

        {/* Mobile Filter Modal */}
        <AnimatePresence>
          {showMobileFilter && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileFilter(false)}
                className="fixed inset-0 z-50 bg-[#1a1410]/90 lg:hidden"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.4 }}
                className="lg:hidden fixed right-0 top-0 bottom-0 w-80 bg-[#e8e3db] p-8 overflow-y-auto z-50 border-l-4 border-[#b8956a]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 
                    className="text-[#1a1410]"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 400 }}
                  >
                    Filtros
                  </h2>
                  <button onClick={() => setShowMobileFilter(false)}>
                    <X className="w-6 h-6 text-[#1a1410]" />
                  </button>
                </div>
                <FilterSection />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-4 gap-12">
          {/* Desktop Filters */}
          <div className="hidden lg:block">
            <div className="sticky top-40 bg-white p-8 border-2 border-[#b8956a]/20">
              <h2 
                className="text-[#1a1410] mb-8"
                style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 400 }}
              >
                Filtros
              </h2>
              <FilterSection />
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="mb-8 flex justify-between items-center">
              <p 
                className="text-[#6b6156]"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
              >
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1 ? 'pieza' : 'piezas'}
              </p>
            </div>

            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {productsWithMedia.map((product, index) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="group block w-full cursor-pointer bg-white border-2 border-transparent text-left hover:border-[#b8956a]/30 transition-all duration-500"
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
                    <div className="relative overflow-hidden">
                      <ProductMediaCarousel media={product.media} productName={product.name} />
                      
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
                      <div className="flex items-center justify-center">
                        <div className="h-px w-8 bg-[#b8956a]/30" />
                        <div 
                          className="text-[#b8956a] mx-4"
                          style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 400 }}
                        >
                          ${product.price.toFixed(2)}
                        </div>
                        <div className="h-px w-8 bg-[#b8956a]/30" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {filteredProducts.length === 0 && (
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

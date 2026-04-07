'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Heart, ShoppingCart, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const allProducts = [
  { id: 1, name: 'Vestido de Seda Milano', category: 'italiana', price: 249.99, image: 'https://images.unsplash.com/photo-1557161622-5f50ca344787?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwZHJlc3MlMjBmYXNoaW9ufGVufDF8fHx8MTc3NTQxNjY1OHww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 2, name: 'Conjunto Parisino Elegante', category: 'francesa', price: 189.99, image: 'https://images.unsplash.com/photo-1588025014019-d0f99ee89043?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMGNsb3RoaW5nJTIwYWNjZXNzb3JpZXN8ZW58MXx8fHwxNzc1NTA5MDI5fDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 3, name: 'Blazer Italiano Premium', category: 'italiana', price: 299.99, image: 'https://images.unsplash.com/photo-1762343292182-b0cb71a19111?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwdHJlbmQlMjBtb2Rlcm4lMjBzdHlsZXxlbnwxfHx8fDE3NzU1MDkwMjl8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 4, name: 'Vestido Couture París', category: 'francesa', price: 329.99, image: 'https://images.unsplash.com/photo-1637690048998-1e41c61c254d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZhc2hpb24lMjBzb3BoaXN0aWNhdGVkfGVufDF8fHx8MTc3NTUwOTAzMHww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 5, name: 'Trench Coat Parisino', category: 'francesa', price: 349.99, image: 'https://images.unsplash.com/photo-1763914766563-d15bef819106?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBib3V0aXF1ZSUyMHNob3BwaW5nfGVufDF8fHx8MTc3NTUwOTAzMHww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 6, name: 'Conjunto de Lino Milano', category: 'italiana', price: 199.99, image: 'https://images.unsplash.com/photo-1568251188392-ae32f898cb3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXV0ZSUyMGNvdXR1cmUlMjBlbGVnYW50fGVufDF8fHx8MTc3NTUwOTAzMHww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 7, name: 'Blusa de Seda Francesa', category: 'francesa', price: 159.99, image: 'https://images.unsplash.com/photo-1602918222760-fa82314869d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpdGFsaWFuJTIwZmFzaGlvbiUyMGx1eHVyeSUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 8, name: 'Pantalón Palazzo Italiano', category: 'italiana', price: 179.99, image: 'https://images.unsplash.com/photo-1694659224329-54c712ec64d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmYXNoaW9uJTIwZWxlZ2FudCUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 9, name: 'Vestido Cóctel París', category: 'francesa', price: 279.99, image: 'https://images.unsplash.com/photo-1766959501737-5625ec13a0f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc2FsZSUyMGRpc2NvdW50JTIwb2ZmZXJ8ZW58MXx8fHwxNzc1NTA5MDI4fDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 10, name: 'Chaqueta Boucle Milano', category: 'italiana', price: 319.99, image: 'https://images.unsplash.com/photo-1765009433753-c7462637d21f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjbG90aGluZyUyMGJvdXRpcXVlfGVufDF8fHx8MTc3NTUwOTAyOHww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 11, name: 'Abrigo Italiano Cashmere', category: 'italiana', price: 449.99, image: 'https://images.unsplash.com/photo-1602918222760-fa82314869d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpdGFsaWFuJTIwZmFzaGlvbiUyMGx1eHVyeSUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 12, name: 'Vestido Midi Francés', category: 'francesa', price: 219.99, image: 'https://images.unsplash.com/photo-1694659224329-54c712ec64d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmYXNoaW9uJTIwZWxlZ2FudCUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080' },
];

export function CatalogoPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [priceRange, setPriceRange] = useState<string>('all');

  useEffect(() => {
    if (filterParam) {
      setSelectedFilter(filterParam);
    }
  }, [filterParam]);

  const filteredProducts = allProducts.filter(product => {
    const categoryMatch = selectedFilter === 'all' || product.category === selectedFilter;
    
    let priceMatch = true;
    if (priceRange === 'low') {
      priceMatch = product.price < 200;
    } else if (priceRange === 'mid') {
      priceMatch = product.price >= 200 && product.price < 300;
    } else if (priceRange === 'high') {
      priceMatch = product.price >= 300;
    }
    
    return categoryMatch && priceMatch;
  });

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
          {[
            { value: 'all', label: 'Todas' },
            { value: 'italiana', label: 'Italiana' },
            { value: 'francesa', label: 'Francesa' }
          ].map((filter) => (
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
            {selectedFilter === 'italiana' && 'Elegancia italiana'}
            {selectedFilter === 'francesa' && 'Chic parisino'}
          </h1>
          
          <p 
            className="text-[#6b6156] italic"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}
          >
            {selectedFilter === 'all' &&
              'Explora nuestra colección de moda europea'}
            {selectedFilter === 'italiana' &&
              'La sofisticación italiana en cada pieza'}
            {selectedFilter === 'francesa' &&
              'El arte francés de la alta costura'}
          </p>
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
                className="lg:hidden fixed inset-0 bg-[#1a1410]/80 backdrop-blur-sm z-50"
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
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="group cursor-pointer bg-white border-2 border-transparent hover:border-[#b8956a]/30 transition-all duration-500"
                  >
                    <div className="relative overflow-hidden">
                      <motion.img
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.6 }}
                        src={product.image}
                        alt={product.name}
                        className="w-full h-[450px] object-cover"
                        style={{ filter: 'sepia(0.08) contrast(1.05)' }}
                      />
                      
                      <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-[#b8956a] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
                      <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-[#b8956a] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
                      
                      <div className="absolute inset-0 bg-[#1a1410]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center space-x-3 z-10">
                        <motion.button 
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-white/90 backdrop-blur-sm p-3 hover:bg-[#b8956a] hover:text-white transition-colors duration-300"
                        >
                          <Heart className="w-5 h-5" strokeWidth={1.5} />
                        </motion.button>
                      </div>
                      
                      <motion.div 
                        initial={{ y: 100 }}
                        className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20"
                      >
                        <button className="w-full bg-[#1a1410] text-[#f5f2ed] py-4 flex items-center justify-center space-x-3 hover:bg-[#b8956a] transition-all duration-500 border-t-2 border-[#b8956a]/50">
                          <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
                          <span 
                            className="tracking-[0.2em] text-xs"
                            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                          >
                            AÑADIR
                          </span>
                        </button>
                      </motion.div>
                    </div>
                    
                    <div className="p-6 text-center">
                      <div 
                        className="text-[#8b6f47] text-xs mb-2 tracking-[0.2em]"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                      >
                        {product.category === 'italiana' ? 'Italiana' : 'Francesa'}
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
    </div>
  );
}

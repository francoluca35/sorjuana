'use client';

import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';

const products = [
  {
    id: 1,
    name: 'Vestido de Seda Milano',
    category: 'Italiana',
    price: 249.99,
    image: 'https://images.unsplash.com/photo-1557161622-5f50ca344787?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwZHJlc3MlMjBmYXNoaW9ufGVufDF8fHx8MTc3NTQxNjY1OHww&ixlib=rb-4.1.0&q=80&w=1080',
    tag: 'Superventas'
  },
  {
    id: 2,
    name: 'Conjunto Parisino Elegante',
    category: 'Francesa',
    price: 189.99,
    image: 'https://images.unsplash.com/photo-1588025014019-d0f99ee89043?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMGNsb3RoaW5nJTIwYWNjZXNzb3JpZXN8ZW58MXx8fHwxNzc1NTA5MDI5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    tag: 'Popular'
  },
  {
    id: 3,
    name: 'Blazer Italiano Premium',
    category: 'Italiana',
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1762343292182-b0cb71a19111?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwdHJlbmQlMjBtb2Rlcm4lMjBzdHlsZXxlbnwxfHx8fDE3NzU1MDkwMjl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    tag: 'Esencial'
  },
  {
    id: 4,
    name: 'Vestido Couture París',
    category: 'Francesa',
    price: 329.99,
    image: 'https://images.unsplash.com/photo-1637690048998-1e41c61c254d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZhc2hpb24lMjBzb3BoaXN0aWNhdGVkfGVufDF8fHx8MTc3NTUwOTAzMHww&ixlib=rb-4.1.0&q=80&w=1080',
    tag: 'Exclusivo'
  }
];

export function PopularProducts() {
  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#f5f2ed] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-40 h-40 border border-[#b8956a]/10 rotate-45" />
      <div className="absolute bottom-20 right-10 w-60 h-60 border border-[#b8956a]/10" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="flex items-center justify-center mb-6">
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-px bg-gradient-to-r from-transparent to-[#b8956a]"
            />
            <span 
              className="mx-6 text-[#8b6f47] tracking-[0.3em] text-sm"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
            >
              LOS FAVORITOS
            </span>
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-px bg-gradient-to-l from-transparent to-[#b8956a]"
            />
          </div>
          
          <h2 
            className="text-[#1a1410] mb-4"
            style={{ 
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 300,
              letterSpacing: '0.05em'
            }}
          >
            Piezas Más Amadas
          </h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-[#6b6156] mt-4 max-w-2xl mx-auto italic"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem' }}
          >
            Las joyas de nuestra colección, elegidas por su elegancia atemporal
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.6 }}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden mb-6 bg-white">
                {/* Vintage corner decorations */}
                <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#b8956a] z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#b8956a] z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
                  src={product.image}
                  alt={product.name}
                  className="w-full h-[450px] object-cover relative z-10"
                  style={{ filter: 'sepia(0.08) contrast(1.05)' }}
                />
                
                {/* Vintage overlay */}
                <div className="absolute inset-0 bg-[#b8956a]/5 mix-blend-multiply opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="absolute top-4 left-4 z-20">
                  <span 
                    className="bg-[#1a1410] text-[#b8956a] px-4 py-2 text-xs tracking-[0.2em] border border-[#b8956a]/30"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                  >
                    {product.tag}
                  </span>
                </div>
                
                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white/90 backdrop-blur-sm p-3 hover:bg-[#b8956a] hover:text-white transition-colors duration-300 border border-[#b8956a]/20"
                  >
                    <Heart className="w-4 h-4" strokeWidth={1.5} />
                  </motion.button>
                </div>
                
                <motion.div 
                  initial={{ y: 100, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20"
                >
                  <button className="w-full bg-[#1a1410] text-[#f5f2ed] py-4 flex items-center justify-center space-x-3 hover:bg-[#b8956a] transition-all duration-500 border-t border-[#b8956a]/30">
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
              
              <div className="text-center">
                <div 
                  className="text-[#8b6f47] text-xs mb-2 tracking-[0.2em]"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                >
                  {product.category}
                </div>
                <h3 
                  className="text-[#1a1410] mb-3 group-hover:text-[#b8956a] transition-colors duration-300"
                  style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', fontWeight: 400 }}
                >
                  {product.name}
                </h3>
                <div className="flex items-center justify-center">
                  <div className="h-px w-8 bg-[#b8956a]/30" />
                  <div 
                    className="text-[#b8956a] mx-4"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 400 }}
                  >
                    ${product.price.toFixed(2)}
                  </div>
                  <div className="h-px w-8 bg-[#b8956a]/30" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-16"
        >
          <Link
            href="/catalogo"
            className="group inline-flex items-center space-x-4 bg-transparent border-2 border-[#1a1410] text-[#1a1410] px-12 py-5 hover:bg-[#1a1410] hover:text-[#f5f2ed] transition-all duration-500 relative overflow-hidden"
          >
            <span 
              className="relative z-10 tracking-[0.25em] text-sm"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
            >
              VER CATÁLOGO COMPLETO
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

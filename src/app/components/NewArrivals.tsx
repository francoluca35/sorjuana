'use client';

import Link from 'next/link';
import { Heart, Eye, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

const newProducts = [
  {
    id: 5,
    name: 'Trench Parisino',
    category: 'Francesa',
    price: 349.99,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1763914766563-d15bef819106?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBib3V0aXF1ZSUyMHNob3BwaW5nfGVufDF8fHx8MTc3NTUwOTAzMHww&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true
  },
  {
    id: 6,
    name: 'Lino Milano',
    category: 'Italiana',
    price: 199.99,
    oldPrice: 259.99,
    image: 'https://images.unsplash.com/photo-1568251188392-ae32f898cb3b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXV0ZSUyMGNvdXR1cmUlMjBlbGVnYW50fGVufDF8fHx8MTc3NTUwOTAzMHww&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true
  },
  {
    id: 7,
    name: 'Blusa de Seda',
    category: 'Francesa',
    price: 159.99,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1602918222760-fa82314869d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpdGFsaWFuJTIwZmFzaGlvbiUyMGx1eHVyeSUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true
  },
  {
    id: 8,
    name: 'Palazzo Italiano',
    category: 'Italiana',
    price: 179.99,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1694659224329-54c712ec64d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmYXNoaW9uJTIwZWxlZ2FudCUyMGNsb3RoaW5nfGVufDF8fHx8MTc3NTUwOTAyN3ww&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true
  },
  {
    id: 9,
    name: 'Cóctel París',
    category: 'Francesa',
    price: 279.99,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1766959501737-5625ec13a0f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwc2FsZSUyMGRpc2NvdW50JTIwb2ZmZXJ8ZW58MXx8fHwxNzc1NTA5MDI4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true
  },
  {
    id: 10,
    name: 'Boucle Milano',
    category: 'Italiana',
    price: 319.99,
    oldPrice: 389.99,
    image: 'https://images.unsplash.com/photo-1765009433753-c7462637d21f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjbG90aGluZyUyMGJvdXRpcXVlfGVufDF8fHx8MTc3NTUwOTAyOHww&ixlib=rb-4.1.0&q=80&w=1080',
    isNew: true
  }
];

export function NewArrivals() {
  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white relative">
      {/* Vintage decorative pattern */}
      <div className="absolute top-0 left-0 w-full h-2 bg-[#b8956a]/20" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-[#b8956a]/20" />
      
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center justify-center mb-6"
          >
            <Sparkles className="w-5 h-5 text-[#b8956a] mr-3" strokeWidth={1.5} />
            <span 
              className="text-[#8b6f47] tracking-[0.3em] text-sm"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
            >
              NOUVEAUTÉS
            </span>
            <Sparkles className="w-5 h-5 text-[#b8956a] ml-3" strokeWidth={1.5} />
          </motion.div>
          
          <h2 
            className="text-[#1a1410] mb-4"
            style={{ 
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 300,
              letterSpacing: '0.05em'
            }}
          >
            Recién Llegados
          </h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-[#6b6156] mt-4 max-w-2xl mx-auto italic"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem' }}
          >
            Las últimas creaciones de las pasarelas europeas
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 0.3, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 1 }}
            className="text-[#b8956a] text-4xl mt-4"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            ❦
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {newProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden mb-4 bg-[#f5f2ed] border-2 border-transparent group-hover:border-[#b8956a]/30 transition-all duration-500">
                <motion.img
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.6 }}
                  src={product.image}
                  alt={product.name}
                  className="w-full h-[320px] object-cover"
                  style={{ filter: 'sepia(0.08) contrast(1.05)' }}
                />
                
                {/* Vintage vignette effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#1a1410]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {product.isNew && (
                  <div className="absolute top-3 left-3 z-20">
                    <motion.span 
                      initial={{ rotate: -5 }}
                      whileHover={{ rotate: 0, scale: 1.05 }}
                      className="bg-[#1a1410] text-[#b8956a] px-3 py-1.5 text-xs tracking-[0.2em] border border-[#b8956a]/50 inline-block"
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                    >
                      NOUVEAU
                    </motion.span>
                  </div>
                )}
                
                {product.oldPrice && (
                  <div className="absolute top-3 right-3 z-20">
                    <span className="bg-[#8b6f47] text-white px-3 py-1.5 text-xs tracking-wider">
                      SOLDE
                    </span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-[#1a1410]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center space-x-3 z-20">
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white/90 backdrop-blur-sm p-2.5 hover:bg-[#b8956a] hover:text-white transition-colors duration-300"
                  >
                    <Heart className="w-4 h-4" strokeWidth={1.5} />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white/90 backdrop-blur-sm p-2.5 hover:bg-[#b8956a] hover:text-white transition-colors duration-300"
                  >
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                  </motion.button>
                </div>
              </div>
              
              <div className="text-center px-2">
                <div 
                  className="text-[#8b6f47] text-xs mb-1.5 tracking-wider"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                >
                  {product.category}
                </div>
                <h3 
                  className="text-[#1a1410] text-sm mb-2 group-hover:text-[#b8956a] transition-colors duration-300 line-clamp-2"
                  style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 400 }}
                >
                  {product.name}
                </h3>
                <div className="flex items-center justify-center space-x-2">
                  <span 
                    className="text-[#b8956a]"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}
                  >
                    ${product.price.toFixed(2)}
                  </span>
                  {product.oldPrice && (
                    <span 
                      className="text-[#6b6156]/50 line-through text-xs"
                      style={{ fontFamily: 'Montserrat, sans-serif' }}
                    >
                      ${product.oldPrice.toFixed(2)}
                    </span>
                  )}
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
            className="group inline-flex items-center space-x-4 bg-transparent border-2 border-[#b8956a] text-[#1a1410] px-12 py-5 hover:bg-[#b8956a] hover:text-white transition-all duration-500"
          >
            <span 
              className="relative z-10 tracking-[0.25em] text-sm"
              style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
            >
              DESCUBRIR TODO
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

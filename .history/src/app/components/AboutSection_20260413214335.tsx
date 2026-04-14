'use client';

import { motion } from 'motion/react';

export function AboutSection() {
  return (
    <section
      id="quienes-somos"
      className="py-32 px-4 sm:px-6 lg:px-8 bg-[#e8e3db] relative overflow-hidden scroll-mt-28"
    >
      {/* Vintage pattern background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(45deg, #b8956a 0, #b8956a 1px, transparent 0, transparent 50%)`,
        backgroundSize: '10px 10px'
      }} />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
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
              NUESTRA HISTORIA
            </span>
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="h-px bg-gradient-to-l from-transparent to-[#b8956a]"
            />
          </div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-[#1a1410] mb-4"
            style={{ 
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 300,
              letterSpacing: '0.05em'
            }}
          >
            Sor Juana
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 0.4, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-[#b8956a] text-5xl"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            ❦
          </motion.div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative">
              {/* Decorative frame */}
              <div className="absolute -inset-4 border-2 border-[#b8956a]/30" />
              <div className="absolute -top-6 -left-6 w-24 h-24 border-t-2 border-l-2 border-[#b8956a]" />
              <div className="absolute -bottom-6 -right-6 w-24 h-24 border-b-2 border-r-2 border-[#b8956a]" />
              
              <motion.img
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.6 }}
                src="https://images.unsplash.com/photo-1765009433753-c7462637d21f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjbG90aGluZyUyMGJvdXRpcXVlfGVufDF8fHx8MTc3NTUwOTAyOHww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Interior de la boutique Sor Juana"
                className="w-full h-[500px] object-cover relative z-10"
                style={{ filter: 'sepia(0.15) contrast(1.05)' }}
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-10"
          >
            {[
              {
                title: 'Origen & Liderazgo',
                year: '2016',
                text: 'Hace 10 años nació Sor Juana Liberté, un espacio pensado para abastecer a mujeres reales, auténticas, con curvas, actitud y un estilo único., Ese mismo año, Carla Marucci, asesora de imagen, da vida al proyecto con una visión clara: combinar moda con identidad, ayudando a cada mujer a vestirse como quiera, sentirse segura y expresar quién es.'
              }
              ,{
                title: 'Trayectoria',
                year: '2016-Actualidad',
                text: 'A lo largo de estos años, Sor Juana Liberté se consolidó ofreciendo una selección exclusiva de prendas importadas y nacionales. Su diferencial siempre fue el mismo: cada pieza es única, sin repetición de modelos, apostando a la autenticidad y al estilo individual.'
              },
              {
                title: 'Presente',
                year: '2026',
                text: 'Hoy, Sor Juana Liberté es mucho más que una tienda: es un espacio de asesoramiento personalizado, donde cada clienta puede descubrir su mejor versión, potenciar su imagen y expresarse con total libertad.'
              },
              
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.2, duration: 0.6 }}
                className="relative pl-12 border-l-2 border-[#b8956a]/30"
              >
                <div className="absolute -left-3 top-0 w-6 h-6 bg-[#b8956a] flex items-center justify-center">
                  <div className="w-2 h-2 bg-[#f5f2ed]" />
                </div>
                
                <span 
                  className="text-[#b8956a] tracking-[0.2em] text-xs mb-2 block"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                >
                  {item.year}
                </span>
                
                <h3 
                  className="text-[#1a1410] mb-3"
                  style={{ 
                    fontFamily: 'Cormorant Garamond, serif', 
                    fontSize: '1.8rem',
                    fontWeight: 400
                  }}
                >
                  {item.title}
                </h3>
                
                <p 
                  className="text-[#1a1410]/80 leading-relaxed"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                >
                  {item.text}
                </p>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="flex items-center space-x-12 pt-8 border-t border-[#b8956a]/30"
            >
              {[
                { num: '9+', label: 'Años' },
                { num: '500+', label: 'Diseños' },
                { num: '2K+', label: 'Clientas' }
              ].map((stat, index) => (
                <motion.div 
                  key={stat.label}
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <div 
                    className="text-[#b8956a] mb-1"
                    style={{ 
                      fontFamily: 'Cormorant Garamond, serif',
                      fontSize: '2.5rem',
                      fontWeight: 300
                    }}
                  >
                    {stat.num}
                  </div>
                  <div 
                    className="text-[#6b6156] text-sm tracking-wider"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                  >
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

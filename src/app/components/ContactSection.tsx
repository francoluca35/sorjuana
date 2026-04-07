'use client';

import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, Send } from 'lucide-react';
import { motion } from 'motion/react';

export function ContactSection() {
  return (
    <section id="contacto" className="py-32 px-4 sm:px-6 lg:px-8 bg-[#e8e3db] relative overflow-hidden scroll-mt-28">
      {/* Decorative vintage pattern */}
      <div className="absolute top-0 left-0 w-64 h-64 border-2 border-[#b8956a]/10 rotate-45 -translate-x-32 -translate-y-32" />
      <div className="absolute bottom-0 right-0 w-64 h-64 border-2 border-[#b8956a]/10 rotate-45 translate-x-32 translate-y-32" />
      
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
              CONTÁCTANOS
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
            className="text-[#1a1410]"
            style={{ 
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 300,
              letterSpacing: '0.05em'
            }}
          >
            Visítanos
          </h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-[#6b6156] mt-4 max-w-2xl mx-auto italic"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem' }}
          >
            Nuestras puertas están abiertas para recibirte
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="space-y-10">
              <div>
                <h3 
                  className="text-[#1a1410] mb-8 pb-4 border-b-2 border-[#b8956a]/30"
                  style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 400 }}
                >
                  Información
                </h3>
                
                <div className="space-y-8">
                  {[
                    {
                      icon: MapPin,
                      title: 'Dirección',
                      content: ['Av. Reforma 123, Colonia Centro', 'Ciudad de México, CDMX 06000']
                    },
                    {
                      icon: Phone,
                      title: 'Teléfono',
                      content: ['+52 55 1234 5678', 'Lunes a sábado: 10:00 - 20:00 h']
                    },
                    {
                      icon: Mail,
                      title: 'Correo electrónico',
                      content: ['info@sorjuana.com', 'ventas@sorjuana.com']
                    }
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                      className="flex items-start space-x-5 group"
                    >
                      <div className="bg-white p-4 border-2 border-[#b8956a]/20 group-hover:border-[#b8956a] group-hover:bg-[#b8956a] transition-all duration-500">
                        <item.icon className="w-6 h-6 text-[#b8956a] group-hover:text-white transition-colors duration-500" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 
                          className="text-[#1a1410] mb-2 tracking-wider"
                          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                        >
                          {item.title}
                        </h4>
                        {item.content.map((line, i) => (
                          <p 
                            key={i}
                            className="text-[#6b6156]"
                            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <h3 
                  className="text-[#1a1410] mb-6"
                  style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 400 }}
                >
                  Redes sociales
                </h3>
                <div className="flex space-x-4">
                  {[
                    { icon: Instagram, url: 'https://instagram.com' },
                    { icon: Facebook, url: 'https://facebook.com' },
                    { icon: Twitter, url: 'https://twitter.com' }
                  ].map((social, index) => (
                    <motion.a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-white p-5 border-2 border-[#b8956a]/20 hover:border-[#b8956a] hover:bg-[#b8956a] transition-all duration-500 group"
                    >
                      <social.icon className="w-6 h-6 text-[#1a1410] group-hover:text-white transition-colors duration-500" strokeWidth={1.5} />
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="bg-white p-8 border-2 border-[#b8956a]/30"
              >
                <h3 
                  className="text-[#1a1410] mb-4"
                  style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 400 }}
                >
                  Boletín
                </h3>
                <p 
                  className="text-[#6b6156] mb-6 italic"
                  style={{ fontFamily: 'Cormorant Garamond, serif' }}
                >
                  Recibe nuestras novedades y ofertas exclusivas
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Tu correo electrónico"
                    className="flex-1 px-4 py-3 border-2 border-[#b8956a]/30 focus:outline-none focus:border-[#b8956a] bg-[#f5f2ed] transition-colors duration-300"
                    style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 300 }}
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-[#1a1410] text-white px-6 py-3 hover:bg-[#b8956a] transition-colors duration-500 flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" strokeWidth={1.5} />
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="h-full min-h-[600px] bg-white overflow-hidden border-4 border-[#b8956a]/20 relative">
              {/* Decorative corners on map */}
              <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#b8956a] z-10" />
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#b8956a] z-10" />
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-[#b8956a] z-10" />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#b8956a] z-10" />
              
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.6029215029834!2d-99.16622668509154!3d19.427021486898745!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1ff35f5bd1563%3A0x6c366f0e2de02ff7!2sAv.%20Paseo%20de%20la%20Reforma%2C%20Ju%C3%A1rez%2C%20Cuauht%C3%A9moc%2C%2006600%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses!2smx!4v1635789234567!5m2!1ses!2smx"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'sepia(0.15) contrast(0.9)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación Sor Juana"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

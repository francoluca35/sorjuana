import Link from 'next/link';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1
            className="text-[#2c3e50] mb-4"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 'clamp(3rem, 5vw, 5rem)',
            }}
          >
            404
          </h1>
          <p className="text-gray-600 mb-8">Página no encontrada</p>
          <Link
            href="/"
            className="inline-block bg-[#2c3e50] text-white px-8 py-4 hover:bg-[#d4a574] transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}

import Link from 'next/link';
import { Home } from 'lucide-react';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

const WA_HREF = 'https://wa.me/5491159795700';
const WA_LABEL = '+54 9 11 5979-5700';

export function PoliticaCambiosDevolucionesPage() {
  return (
    <main className="relative min-h-dvh bg-[#f5f2ed] pb-20 pt-12 text-[#2a2520] sm:pt-14">
      <Link
        href="/"
        className="fixed top-5 left-5 z-[60] flex h-11 w-11 items-center justify-center rounded-sm border border-[#1a1410]/20 bg-white/90 text-[#1a1410] shadow-md backdrop-blur-sm transition-colors hover:border-[#b8956a]/50 hover:bg-[#f5f2ed]"
        aria-label="Volver al inicio"
      >
        <Home className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </Link>

      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <h1
          className="mb-10 border-b border-[#b8956a]/40 pb-6 text-center text-3xl font-light tracking-wide text-[#1a1410] sm:text-4xl"
          style={{ fontFamily: serif }}
        >
          Política de Cambios y Devoluciones
        </h1>

        <div className="space-y-10 text-[0.95rem] leading-relaxed sm:text-base" style={{ fontFamily: sans, fontWeight: 300 }}>
          <p className="text-[#2a2520]">
            En Sor Juana Liberté, queremos que estés conforme con tu compra. Por eso, ofrecemos la posibilidad de
            realizar cambios bajo las siguientes condiciones:
          </p>

          <section>
            <h2 className="mb-3 text-lg font-medium tracking-wide text-[#1a1410]" style={{ fontFamily: serif }}>
              Plazo de cambios
            </h2>
            <p className="text-[#6b6156]">
              Aceptamos cambios dentro de los <strong className="font-medium text-[#2a2520]">15 días hábiles</strong>{' '}
              desde realizada la compra. Pasado ese período, no será posible gestionar cambios o devoluciones.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium tracking-wide text-[#1a1410]" style={{ fontFamily: serif }}>
              Condiciones del producto
            </h2>
            <p className="mb-3 text-[#6b6156]">Para poder realizar un cambio o devolución, el artículo debe estar:</p>
            <ul className="list-inside list-disc space-y-2 text-[#6b6156] marker:text-[#b8956a]">
              <li>Sin uso</li>
              <li>En perfectas condiciones</li>
              <li>Con su embalaje original</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium tracking-wide text-[#1a1410]" style={{ fontFamily: serif }}>
              Modalidad de cambios
            </h2>
            <p className="text-[#6b6156]">
              Los cambios y devoluciones podrán realizarse en tiendas físicas o coordinarse por otros medios de
              contacto.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium tracking-wide text-[#1a1410]" style={{ fontFamily: serif }}>
              Costos de envío
            </h2>
            <p className="text-[#6b6156]">
              Todos los costos de envío asociados a cambios o devoluciones corren por cuenta del cliente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium tracking-wide text-[#1a1410]" style={{ fontFamily: serif }}>
              Proceso de gestión
            </h2>
            <p className="mb-4 text-[#6b6156]">
              Para iniciar un cambio o devolución, es necesario comunicarse previamente vía WhatsApp al{' '}
              <Link
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#8b6f47] underline decoration-[#b8956a]/60 underline-offset-4 transition-colors hover:text-[#1a1410]"
              >
                {WA_LABEL}
              </Link>{' '}
              para consultar la disponibilidad del artículo.
            </p>
            <p className="mb-3 text-[#6b6156]">
              Al momento de gestionar el cambio o devolución, se deberá presentar:
            </p>
            <ul className="list-inside list-disc space-y-2 text-[#6b6156] marker:text-[#b8956a]">
              <li>Número de pedido</li>
              <li>Recibo o comprobante de compra</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

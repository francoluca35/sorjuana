'use client';

import { Headset, ShieldCheck, Truck } from 'lucide-react';

const benefits = [
  {
    title: 'ENVIOS A TODO EL PAIS',
    subtitle: 'Despachamos desde Merlo, Buenos Aires, Argentina',
    icon: Truck,
  },
  {
    title: 'Atencion 24/7',
    subtitle: 'Te acompañamos en cada compra',
    icon: Headset,
  },
  {
    title: 'Compra con seguridad',
    subtitle: 'Pagos protegidos y seguimiento de pedido',
    icon: ShieldCheck,
  },
] as const;

export function StoreBenefits() {
  return (
    <section className=" bg-[#f5f2ed]">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3 md:gap-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="flex flex-col items-center gap-2">
                <Icon
                  className={`h-7 w-7 ${benefit.title.includes('ENVIOS') ? 'text-[#b8956a]' : 'text-[#8b6f47]'}`}
                  strokeWidth={1.75}
                />
                <h3
                  className={`text-xl font-semibold ${benefit.title.includes('ENVIOS') ? 'text-[#8b6f47]' : 'text-[#2a2520]'}`}
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {benefit.title}
                </h3>
                <p
                  className="text-sm text-[#6b6156]"
                  style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                >
                  {benefit.subtitle}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

'use client';

import { Headset, ShieldCheck, Truck } from 'lucide-react';

const benefits = [
  {
    title: 'Envios a todo el pais',
    icon: Truck,
  },
  {
    title: 'Atencion 24/7',
    icon: Headset,
  },
  {
    title: 'Compra con seguridad',
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
              <article key={benefit.title} className="flex flex-col items-center gap-3">
                <Icon className="h-7 w-7 text-[#8b6f47]" strokeWidth={1.75} />
                <h3
                  className="text-xl font-semibold text-[#2a2520]"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {benefit.title}
                </h3>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

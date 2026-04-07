import type { Metadata } from 'next';
import '@/styles/index.css';

export const metadata: Metadata = {
  title: 'Sor Juana — Moda italiana y francesa',
  description:
    'Elegancia europea en Merlo, Buenos Aires, Argentina. Envíos a todo el país en moda italiana y francesa de alta calidad.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

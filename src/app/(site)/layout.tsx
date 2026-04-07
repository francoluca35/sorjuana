import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

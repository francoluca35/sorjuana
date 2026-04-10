import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LayoutGrid, Store, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/actions/auth';
import { Button } from '@/app/components/ui/button';

const serif = "'Cormorant Garamond', serif";
const sans = 'Montserrat, sans-serif';

export async function DashboardHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .maybeSingle();

  const displayName = profile?.username ?? user.email?.split('@')[0] ?? 'Usuario';

  return (
    <main className="min-h-dvh bg-[#f5f2ed] text-[#1a1410]">
      <header className="border-b border-[#b8956a]/25 bg-[#1a1410]/[0.03]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="relative h-10 w-36 sm:h-11 sm:w-40">
              <Image
                src="/Assets/logo-b.png"
                alt="Sor Juana Liberté"
                fill
                className="object-contain object-left"
                sizes="160px"
                priority
              />
            </div>
            <span
              className="hidden text-[10px] uppercase tracking-[0.35em] text-[#6b6156] sm:inline"
              style={{ fontFamily: sans }}
            >
              Panel
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              asChild
              variant="ghost"
              className="rounded-none text-[#2a2520] hover:bg-[#b8956a]/15 hover:text-[#1a1410]"
            >
              <Link href="/catalogo" className="gap-2" style={{ fontFamily: sans }}>
                <Store className="h-4 w-4" strokeWidth={1.5} />
                Tienda
              </Link>
            </Button>
            <form action={logout}>
              <Button
                type="submit"
                variant="outline"
                className="rounded-none border-[#1a1410]/25 bg-transparent text-[#2a2520] hover:bg-[#1a1410] hover:text-[#f5f2ed]"
                style={{ fontFamily: sans }}
              >
                <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-10 flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center border border-[#1a1410]/15 bg-[#e8e3db]/50">
            <LayoutGrid className="h-5 w-5 text-[#8b6f47]" strokeWidth={1.25} />
          </div>
          <div>
            <h1
              className="text-3xl font-light tracking-wide text-[#1a1410] sm:text-4xl"
              style={{ fontFamily: serif }}
            >
              Bienvenida
            </h1>
            <p className="mt-1 text-sm text-[#6b6156]" style={{ fontFamily: sans }}>
              Panel de inicio · sesión iniciada correctamente
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border border-[#b8956a]/25 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b6156]"
              style={{ fontFamily: sans }}
            >
              Usuario
            </p>
            <p
              className="mt-3 text-xl font-light capitalize text-[#1a1410]"
              style={{ fontFamily: serif }}
            >
              {displayName}
            </p>
          </div>

          <div className="border border-[#b8956a]/25 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b6156]"
              style={{ fontFamily: sans }}
            >
              Rol
            </p>
            <p
              className="mt-3 text-xl font-light capitalize text-[#1a1410]"
              style={{ fontFamily: serif }}
            >
              {profile?.role ?? '—'}
            </p>
          </div>

          <div className="border border-[#b8956a]/25 bg-white/60 p-6 shadow-sm backdrop-blur-sm sm:col-span-2 lg:col-span-1">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6b6156]"
              style={{ fontFamily: sans }}
            >
              Email
            </p>
            <p className="mt-3 break-all text-sm text-[#2a2520]" style={{ fontFamily: sans }}>
              {user.email ?? '—'}
            </p>
          </div>
        </div>

        <p
          className="mt-12 max-w-xl text-sm leading-relaxed text-[#6b6156]"
          style={{ fontFamily: sans }}
        >
          Desde acá podés gestionar el contenido de la tienda cuando sumemos módulos. Por ahora es tu
          espacio de inicio tras iniciar sesión.
        </p>
      </div>
    </main>
  );
}

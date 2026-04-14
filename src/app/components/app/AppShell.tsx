'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PackagePlus,
  ListOrdered,
  Map,
  LineChart,
  Store,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/app/components/ui/utils';
import { Button } from '@/app/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/app/components/ui/drawer';
import { logout } from '@/app/actions/auth';

const sans = 'Montserrat, sans-serif';
const serif = "'Cormorant Garamond', serif";

const SIDEBAR_COLLAPSED_KEY = 'sj-app-sidebar-collapsed';

const NAV = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/cargar-producto', label: 'Carga de producto', icon: PackagePlus },
  { href: '/app/productos', label: 'Lista de productos', icon: ListOrdered },
  { href: '/app/mapa-pagina', label: 'Mapa de página', icon: Map },
  { href: '/app/ventas', label: 'Control de ventas', icon: LineChart },
] as const;

function NavLinks({
  collapsed,
  onNavigate,
  className,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex flex-col gap-0.5', collapsed && 'items-stretch', className)}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            onClick={onNavigate}
            className={cn(
              'flex items-center text-sm tracking-wide transition-colors',
              collapsed ? 'justify-center px-0 py-3' : 'gap-3 border-l-2 border-transparent px-3 py-2.5',
              active &&
                (collapsed
                  ? 'rounded-md bg-[#b8956a]/20 text-[#f5f2ed]'
                  : 'border-[#b8956a] bg-[#b8956a]/15 text-[#f5f2ed]'),
              !active &&
                (collapsed
                  ? 'text-[#e8e3db]/85 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]'
                  : 'text-[#e8e3db]/80 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]'),
            )}
            style={{ fontFamily: sans, fontWeight: 300 }}
          >
            <Icon className="h-4 w-4 shrink-0 text-[#b8956a]" strokeWidth={1.5} aria-hidden />
            {!collapsed ? <span className="truncate">{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 z-0">
        <Image
          src="/Assets/fondo-app.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#faf8f7]/42 backdrop-blur-[2px]" aria-hidden />
      </div>

      <div className="relative z-10 flex min-h-dvh">
        {/* Sidebar desktop: fijo al scroll */}
        <aside
          className={cn(
            'fixed left-0 top-0 z-40 hidden h-dvh flex-col border-r border-[#b8956a]/25 bg-[#1a1410]/94 py-5 backdrop-blur-md transition-[width] duration-200 ease-out lg:flex',
            sidebarCollapsed ? 'w-[4.5rem]' : 'w-[17rem]',
          )}
          aria-label="Menú de administración"
        >
          <div className={cn('shrink-0', sidebarCollapsed ? 'px-2' : 'px-5')}>
            <Link href="/app/dashboard" className="block">
              <div
                className={cn(
                  'relative mx-auto transition-[height,width]',
                  sidebarCollapsed ? 'h-10 w-10' : 'h-11 w-40',
                )}
              >
                <Image
                  src="/Assets/logo-b.png"
                  alt="Sor Juana Liberté"
                  fill
                  className={cn('object-contain drop-shadow-md', sidebarCollapsed ? 'object-center' : 'object-left')}
                  sizes={sidebarCollapsed ? '40px' : '160px'}
                />
              </div>
              {!sidebarCollapsed ? (
                <p
                  className="mt-3 text-[10px] uppercase tracking-[0.35em] text-[#b8956a]/90"
                  style={{ fontFamily: sans }}
                >
                  Administración
                </p>
              ) : null}
            </Link>
          </div>

          <NavLinks collapsed={sidebarCollapsed} className={cn('mt-8 min-h-0 flex-1 overflow-y-auto px-2', !sidebarCollapsed && 'px-3')} />

          <div className={cn('mt-auto shrink-0 space-y-2 border-t border-[#b8956a]/20 pt-3', sidebarCollapsed ? 'px-2' : 'px-3')}>
            <Button
              type="button"
              variant="ghost"
              onClick={toggleSidebar}
              className={cn(
                'w-full text-[#b8956a] hover:bg-[#b8956a]/12 hover:text-[#f5f2ed]',
                sidebarCollapsed ? 'h-10 justify-center px-0' : 'h-auto justify-start gap-2 py-2.5',
              )}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="text-xs font-light tracking-wide text-[#e8e3db]/90" style={{ fontFamily: sans }}>
                    Cerrar panel
                  </span>
                </>
              )}
            </Button>

            <Button
              asChild
              variant="ghost"
              className={cn(
                'h-auto rounded-none text-[#e8e3db]/80 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]',
                sidebarCollapsed ? 'w-full justify-center px-0 py-3' : 'w-full justify-start py-2.5',
              )}
              style={{ fontFamily: sans, fontWeight: 300 }}
            >
              <Link href="/catalogo" className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-2')} title="Ver tienda">
                <Store className="h-4 w-4 shrink-0 text-[#b8956a]" strokeWidth={1.5} />
                {!sidebarCollapsed ? 'Ver tienda' : <span className="sr-only">Ver tienda</span>}
              </Link>
            </Button>
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                title="Salir"
                className={cn(
                  'h-auto w-full rounded-none text-[#e8e3db]/80 hover:bg-[#b8956a]/10 hover:text-[#f5f2ed]',
                  sidebarCollapsed ? 'justify-center px-0 py-3' : 'justify-start py-2.5',
                )}
                style={{ fontFamily: sans, fontWeight: 300 }}
              >
                <LogOut className={cn('h-4 w-4 shrink-0 text-[#b8956a]', !sidebarCollapsed && 'mr-2')} strokeWidth={1.5} />
                {!sidebarCollapsed ? 'Salir' : <span className="sr-only">Salir</span>}
              </Button>
            </form>
          </div>
        </aside>

        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out',
            sidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-[17rem]',
          )}
        >
          <header className="flex items-center gap-2 border-b border-[#b8956a]/20 bg-[#1a1410]/75 px-3 py-3 backdrop-blur-md lg:hidden">
            <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-[#e8e3db] hover:bg-[#b8956a]/15 hover:text-[#f5f2ed]"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="border-[#b8956a]/30 bg-[#1a1410] text-[#e8e3db]">
                <DrawerHeader className="text-left">
                  <DrawerTitle style={{ fontFamily: serif }} className="text-lg font-light text-[#f5f2ed]">
                    Panel
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-8">
                  <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
                  <div className="mt-6 space-y-2 border-t border-[#b8956a]/20 pt-4">
                    <DrawerClose asChild>
                      <Button asChild variant="outline" className="w-full border-[#b8956a]/40 bg-transparent text-[#e8e3db]">
                        <Link href="/catalogo">Ver tienda</Link>
                      </Button>
                    </DrawerClose>
                    <form action={logout}>
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full border-[#b8956a]/40 bg-transparent text-[#e8e3db]"
                      >
                        Salir
                      </Button>
                    </form>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
            <span
              className="text-xs uppercase tracking-[0.2em] text-[#e8e3db]/70"
              style={{ fontFamily: sans }}
            >
              Sor Juana
            </span>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

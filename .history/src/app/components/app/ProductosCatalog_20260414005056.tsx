'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Camera,
  ChevronDown,
  Copy,
  Filter,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible';
import { cn } from '@/app/components/ui/utils';

const sans = 'Montserrat, sans-serif';

export type CatalogProduct = {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  cost: number;
  image: string;
  description: string;
  promoPrice: number | null;
};

const INITIAL: CatalogProduct[] = [
  {
    id: '1',
    code: 'CAM-001',
    name: 'Camisa alicrada para hombre',
    category: 'Camisas',
    stock: 0,
    price: 18900,
    cost: 12000,
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=200&q=70',
    description: 'Camisa entallada, algodón.',
    promoPrice: null,
  },
  {
    id: '2',
    code: 'REM-042',
    name: 'Remera lisa blanca',
    category: 'Remeras',
    stock: 2,
    price: 12000,
    cost: 6500,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&q=70',
    description: 'Remera básica unisex.',
    promoPrice: 9900,
  },
  {
    id: '3',
    code: 'PAN-118',
    name: 'Pantalón chino beige',
    category: 'Pantalones',
    stock: 16,
    price: 28900,
    cost: 15000,
    image: 'https://images.unsplash.com/photo-1473966968600-fa8013becd76?auto=format&fit=crop&w=200&q=70',
    description: 'Talle 38 al 46.',
    promoPrice: null,
  },
  {
    id: '4',
    code: 'VES-009',
    name: 'Vestido midi negro',
    category: 'Vestidos',
    stock: 29,
    price: 45900,
    cost: 22000,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=200&q=70',
    description: 'Ideal para eventos.',
    promoPrice: null,
  },
  {
    id: '5',
    code: 'ABR-003',
    name: 'Abrigo lana camel',
    category: 'Abrigos',
    stock: 33,
    price: 125000,
    cost: 78000,
    image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=200&q=70',
    description: 'Lana merino.',
    promoPrice: null,
  },
  {
    id: '6',
    code: 'ACC-221',
    name: 'Pañuelo seda estampado',
    category: 'Accesorios',
    stock: 7,
    price: 8900,
    cost: 4000,
    image: 'https://images.unsplash.com/photo-1584917865442-de89d76afdde?auto=format&fit=crop&w=200&q=70',
    description: 'Edición limitada.',
    promoPrice: null,
  },
  {
    id: '7',
    code: 'ZAP-055',
    name: 'Zapatillas urbanas',
    category: 'Calzado',
    stock: 0,
    price: 65000,
    cost: 38000,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=70',
    description: 'Cuero y mesh.',
    promoPrice: null,
  },
  {
    id: '8',
    code: 'BLU-014',
    name: 'Blusa seda champagne',
    category: 'Blusas',
    stock: 4,
    price: 32000,
    cost: 18000,
    image: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&w=200&q=70',
    description: 'Manga larga.',
    promoPrice: null,
  },
];

function formatMoney(n: number) {
  return `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function stockDotClass(stock: number) {
  if (stock === 0) return 'bg-red-500';
  if (stock <= 5) return 'bg-amber-400';
  return 'bg-emerald-500';
}

function stockTextClass(stock: number) {
  if (stock === 0) return 'text-red-600 font-semibold';
  if (stock <= 5) return 'text-amber-600 font-medium';
  return 'text-slate-800';
}

type MainTab = 'items' | 'stock' | 'categorias' | 'resumen';

export function ProductosCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>(INITIAL);
  const [mainTab, setMainTab] = useState<MainTab>('items');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'registro' | 'stock'>('registro');
  const [draft, setDraft] = useState<CatalogProduct | null>(null);
  const [optOpen, setOptOpen] = useState(true);

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      m.set(p.category, (m.get(p.category) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (categoryFilter) list = list.filter((p) => p.category === categoryFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          String(p.stock).includes(q),
      );
    }
    return list;
  }, [products, search, categoryFilter]);

  const displayed = useMemo(() => {
    const list = [...filtered];
    if (mainTab === 'stock') list.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
    return list;
  }, [filtered, mainTab]);

  const summary = useMemo(() => {
    let valor = 0;
    let costo = 0;
    let bajo = 0;
    let agotado = 0;
    for (const p of products) {
      valor += p.stock * p.price;
      costo += p.stock * p.cost;
      if (p.stock === 0) agotado += 1;
      else if (p.stock <= 5) bajo += 1;
    }
    return { valor, costo, ganancia: valor - costo, bajo, agotado };
  }, [products]);

  function openProduct(p: CatalogProduct) {
    setDraft({ ...p });
    setDrawerTab('registro');
    setSheetOpen(true);
  }

  function saveDraft() {
    if (!draft) return;
    setProducts((prev) => prev.map((x) => (x.id === draft.id ? { ...draft } : x)));
    setSheetOpen(false);
  }

  function deleteProduct() {
    if (!draft || !confirm('¿Eliminar este producto del listado?')) return;
    setProducts((prev) => prev.filter((x) => x.id !== draft.id));
    setSheetOpen(false);
    setDraft(null);
  }

  function duplicateProduct() {
    if (!draft) return;
    const copy: CatalogProduct = {
      ...draft,
      id: `n-${Date.now()}`,
      code: `${draft.code}-copia`,
      name: `${draft.name} (copia)`,
      stock: 0,
    };
    setProducts((prev) => [...prev, copy]);
    setDraft(copy);
  }

  async function shareProduct() {
    if (!draft) return;
    const text = `${draft.name} — ${formatMoney(draft.price)}`;
    try {
      if (navigator.share) await navigator.share({ title: draft.name, text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  function selectCategory(cat: string) {
    setCategoryFilter(cat);
    setMainTab('items');
    setSearch('');
  }

  const tabBtn = (id: MainTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setMainTab(id);
        if (id !== 'categorias') setCategoryFilter(null);
      }}
      className={cn(
        'relative pb-4 pt-1 text-xs font-semibold uppercase tracking-[0.12em] transition',
        mainTab === id ? 'text-[#b8956a]' : 'text-slate-500 hover:text-slate-700',
      )}
    >
      {label}
      {mainTab === id ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-500" aria-hidden />
      ) : null}
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col text-slate-900" style={{ fontFamily: sans }}>
      <header className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-white/90 px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            Productos <span className="font-normal text-slate-500">({products.length})</span>
          </h1>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-500" aria-label="Compartir listado">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <Button
          asChild
          className="rounded-md bg-[[#b8956a]] px-4 text-sm font-medium text-white hover:bg-[#725c41]"
        >
          <Link href="/app/cargar-producto">Nuevo producto</Link>
        </Button>
      </header>

      <div className="flex flex-none flex-wrap gap-x-8 gap-y-2 border-b border-slate-200/90 bg-white/90 px-4 pb-2 pt-5 sm:gap-x-10 sm:px-6 sm:pb-3 sm:pt-6 lg:gap-x-12">
        {tabBtn('items', 'Ítems')}
        {tabBtn('stock', 'Stock')}
        {tabBtn('categorias', 'Categorías')}
        {tabBtn('resumen', 'Resumen')}
      </div>

      {mainTab === 'stock' ? (
        <p className="flex-none border-b border-slate-100 bg-white/90 px-4 py-3 text-xs text-slate-500 sm:px-6 sm:py-3.5">
          Orden: menor cantidad primero · mismo listado con foco en unidades
        </p>
      ) : null}

      {mainTab === 'categorias' ? (
        <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
          <p className="mb-5 text-sm text-slate-600">Tocá una categoría para filtrar el listado de ítems.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ name, count }) => (
              <button
                key={name}
                type="button"
                onClick={() => selectCategory(name)}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"
              >
                <span className="font-medium text-slate-800">{name}</span>
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">{count}</span>
              </button>
            ))}
          </div>
        </div>
      ) : mainTab === 'resumen' ? (
        <div className="flex flex-1 flex-col items-center overflow-y-auto bg-slate-50/80 px-4 py-10 sm:px-6 sm:py-12">
          <div className="w-full max-w-lg rounded-xl border border-slate-700/80 bg-slate-900 px-6 py-6 text-white shadow-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Valor en stock</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{formatMoney(summary.valor)}</p>
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-600/60 pt-4 text-sm text-slate-300">
              <div className="flex justify-between gap-4">
                <span>Costo de stock</span>
                <span className="font-medium tabular-nums text-slate-100">{formatMoney(summary.costo)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Ganancia estimada</span>
                <span className="font-medium tabular-nums text-teal-300">{formatMoney(summary.ganancia)}</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-6 border-t border-slate-600/60 pt-4 text-sm">
              <span className="text-amber-300">Stock bajo: {summary.bajo}</span>
              <span className="text-red-300">Agotado: {summary.agotado}</span>
            </div>
          </div>
          <p className="mt-6 max-w-md text-center text-xs text-slate-500">
            Totales sobre el catálogo completo (todos los productos del panel).
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-none items-center gap-2 border-b border-slate-200/90 bg-white/90 px-3 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ítem, valor o código"
                className="h-10 border-slate-200 bg-slate-100/80 pl-9 text-sm"
              />
            </div>
            <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 border-slate-200" aria-label="Filtros">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {categoryFilter ? (
            <div className="flex flex-none items-center justify-between gap-2 bg-teal-50/80 px-4 py-2 text-sm sm:px-6">
              <span className="text-teal-900">
                Filtrado: <strong>{categoryFilter}</strong>
              </span>
              <Button type="button" variant="ghost" size="sm" className="text-teal-800" onClick={() => setCategoryFilter(null)}>
                Quitar filtro
              </Button>
            </div>
          ) : null}

          <div className="relative flex-1 overflow-y-auto bg-slate-50/80 pb-8">
            <ul className="divide-y divide-slate-200/80">
              {displayed.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openProduct(p)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white sm:gap-4 sm:px-6"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white sm:h-16 sm:w-16">
                      <span
                        className={cn('absolute left-1 top-1 z-10 h-2 w-2 rounded-full ring-2 ring-white', stockDotClass(p.stock))}
                        aria-hidden
                      />
                      <Image src={p.image} alt="" fill className="object-cover" sizes="64px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      {mainTab === 'items' ? (
                        <p className="truncate text-xs text-slate-500">
                          {p.code} · {p.category}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">Stock disponible</p>
                      )}
                    </div>
                    <div className={cn('shrink-0 tabular-nums text-base', stockTextClass(p.stock))}>{p.stock}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setDraft(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full max-w-full flex-col gap-0 border-l border-slate-200 bg-white p-0 sm:max-w-md lg:max-w-lg [&>button]:text-slate-500"
        >
          {draft ? (
            <>
              <SheetHeader className="border-b border-slate-100 px-4 pb-4 pt-12 sm:px-6">
                <div className="flex items-start justify-between gap-2">
                  <SheetTitle className="pr-8 text-left text-base font-semibold leading-snug text-slate-900">
                    {draft.name}
                  </SheetTitle>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Compartir" onClick={shareProduct}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Duplicar" onClick={duplicateProduct}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-600" aria-label="Eliminar" onClick={deleteProduct}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex gap-6 border-b border-transparent">
                  <button
                    type="button"
                    onClick={() => setDrawerTab('registro')}
                    className={cn(
                      'relative pb-2 text-xs font-semibold uppercase tracking-wide',
                      drawerTab === 'registro' ? 'text-[#b8956a]' : 'text-slate-500',
                    )}
                  >
                    Registro
                    {drawerTab === 'registro' ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-500" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('stock')}
                    className={cn(
                      'relative pb-2 text-xs font-semibold uppercase tracking-wide',
                      drawerTab === 'stock' ? 'text-[#b8956a]' : 'text-slate-500',
                    )}
                  >
                    Stock
                    {drawerTab === 'stock' ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-500" /> : null}
                  </button>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                {drawerTab === 'registro' ? (
                  <div className="space-y-5">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <Image src={draft.image} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 400px" />
                      <button
                        type="button"
                        className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md"
                        aria-label="Cambiar imagen"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                    </div>
                    <div>
                      <Label htmlFor="d-name">Nombre del producto</Label>
                      <Input
                        id="d-name"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="d-price">Precio</Label>
                      <Input
                        id="d-price"
                        type="number"
                        min={0}
                        value={draft.price}
                        onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
                        className="mt-1.5"
                      />
                    </div>
                    <Collapsible open={optOpen} onOpenChange={setOptOpen}>
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                        Opcionales
                        <ChevronDown className={cn('h-4 w-4 transition', optOpen && 'rotate-180')} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-4 border-l-2 border-teal-200 pl-3">
                        <div>
                          <Label htmlFor="d-promo">Precio de promoción</Label>
                          <Input
                            id="d-promo"
                            type="number"
                            min={0}
                            value={draft.promoPrice ?? ''}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                promoPrice: e.target.value === '' ? null : Number(e.target.value) || 0,
                              })
                            }
                            className="mt-1.5"
                            placeholder="—"
                          />
                        </div>
                        <div>
                          <Label htmlFor="d-cat">Categoría</Label>
                          <Input
                            id="d-cat"
                            value={draft.category}
                            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="d-desc">Descripción</Label>
                          <Textarea
                            id="d-desc"
                            rows={4}
                            value={draft.description}
                            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                            className="mt-1.5 resize-y"
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">Ajustá las unidades disponibles en tienda.</p>
                    <div>
                      <Label htmlFor="d-stock">Cantidad en stock</Label>
                      <Input
                        id="d-stock"
                        type="number"
                        min={0}
                        value={draft.stock}
                        onChange={(e) => setDraft({ ...draft, stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                        className="mt-1.5 text-lg font-semibold"
                      />
                    </div>
                    <div>
                      <Label htmlFor="d-cost">Costo unitario (referencia)</Label>
                      <Input
                        id="d-cost"
                        type="number"
                        min={0}
                        value={draft.cost}
                        onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) || 0 })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}
              </div>

              <SheetFooter className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
                <Button type="button" className="w-full bg-[#b8956a] py-5 text-base font-semibold text-white hover:bg-teal-700" onClick={saveDraft}>
                  Guardar
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

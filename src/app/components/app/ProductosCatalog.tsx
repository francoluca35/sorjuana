'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { deleteProductAction, insertProductAction, updateProductAction } from '@/app/actions/products';
import { SizeInventoryEditor } from '@/app/components/app/SizeInventoryEditor';
import type { CatalogProduct } from '@/lib/data/productCatalog';
import { displayCategoryLabel } from '@/lib/data/productCatalog';
import { normalizeSizeInventoryForDb, sumSizeInventoryQty } from '@/lib/data/productSizes';

const sans = 'Montserrat, sans-serif';

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

function isProductKind(v: string): v is 'producto' | 'combo' | 'ofertas' {
  return v === 'producto' || v === 'combo' || v === 'ofertas';
}

export function ProductosCatalog({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);
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
          (p.category_db ?? '').toLowerCase().includes(q) ||
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

  async function saveDraft() {
    if (!draft) return;
    const res = await updateProductAction(draft.id, {
      name: draft.name,
      price: draft.price,
      compare_at_price: draft.promoPrice,
      category: draft.category_db?.trim() || null,
      description: draft.description,
      stock: draft.stock,
      cost: draft.cost,
      size_inventory: draft.size_inventory,
    });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    const sizesNorm = normalizeSizeInventoryForDb(draft.size_inventory);
    const nextStock =
      sizesNorm.length > 0 ? sumSizeInventoryQty(sizesNorm) : Math.max(0, Math.floor(draft.stock));
    const next: CatalogProduct = {
      ...draft,
      size_inventory: sizesNorm.length > 0 ? sizesNorm : [],
      stock: nextStock,
      category: displayCategoryLabel(draft.category_db?.trim() || null),
    };
    setProducts((prev) => prev.map((x) => (x.id === draft.id ? next : x)));
    setSheetOpen(false);
    toast.success('Cambios guardados.');
  }

  async function deleteProduct() {
    if (!draft || !confirm('¿Eliminar este producto de la base de datos?')) return;
    const res = await deleteProductAction(draft.id);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== draft.id));
    setSheetOpen(false);
    setDraft(null);
    toast.success('Producto eliminado.');
  }

  async function duplicateProduct() {
    if (!draft) return;
    const baseCode = draft.code === '—' ? `cpy-${Date.now()}` : draft.code;
    const copyCode = `${baseCode}-copia`;
    const kind = isProductKind(draft.kind) ? draft.kind : 'producto';
    const copiedSizes = normalizeSizeInventoryForDb(draft.size_inventory);
    const copyStock =
      copiedSizes.length > 0 ? sumSizeInventoryQty(copiedSizes) : Math.max(0, Math.floor(draft.stock));
    const res = await insertProductAction({
      kind,
      name: `${draft.name} (copia)`,
      stock: copyStock,
      sizeInventory: draft.size_inventory.map((r) => ({ ...r })),
      cost: draft.cost,
      basePrice: draft.base_price,
      price: draft.price,
      taxApplies: draft.tax_applies,
      taxPercent: draft.tax_percent,
      description: draft.description.trim() || null,
      productCode: copyCode,
      category: draft.category_db?.trim() || null,
      minOrderQty: draft.min_order_qty,
      maxOrderQty: draft.max_order_qty,
      imageUrls: draft.gallery_image_urls.slice(0, 3),
      videoUrl: draft.video_url,
      compareAtPrice: draft.promoPrice,
    });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success('Copia creada.');
    setSheetOpen(false);
    setDraft(null);
    router.refresh();
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
          className="rounded-md bg-[#b8956a] px-4 text-sm font-medium text-white hover:bg-[#725c41]"
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
              {displayed.length === 0 ? (
                <li className="px-4 py-12 text-center text-sm text-slate-500 sm:px-6">
                  No hay productos. Cargá uno desde &quot;Nuevo producto&quot; o aplicá otro filtro de búsqueda.
                </li>
              ) : null}
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
                            value={draft.category_db ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDraft({
                                ...draft,
                                category_db: v || null,
                                category: displayCategoryLabel(v || null),
                              });
                            }}
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
                    <p className="text-sm text-slate-600">Talles y unidades por talle, o un solo total si no usás talles.</p>
                    <SizeInventoryEditor
                      rows={draft.size_inventory}
                      onChange={(rows) => {
                        const n = normalizeSizeInventoryForDb(rows);
                        setDraft((d) => {
                          if (!d) return d;
                          return {
                            ...d,
                            size_inventory: rows,
                            stock: n.length > 0 ? sumSizeInventoryQty(n) : d.stock,
                          };
                        });
                      }}
                      disabled={false}
                      idPrefix="panel"
                    />
                    {normalizeSizeInventoryForDb(draft.size_inventory).length === 0 ? (
                      <div>
                        <Label htmlFor="d-stock">Cantidad en stock (sin talles)</Label>
                        <Input
                          id="d-stock"
                          type="number"
                          min={0}
                          value={draft.stock}
                          onChange={(e) =>
                            setDraft({ ...draft, stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                          }
                          className="mt-1.5 text-lg font-semibold"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Stock total guardado: <strong>{draft.stock}</strong> (suma de talles). Quitá todas las filas para
                        editar un solo número.
                      </p>
                    )}
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
                <Button type="button" className="w-full bg-[#b8956a] py-5 text-base font-semibold text-white hover:[#b7956a]" onClick={saveDraft}>
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

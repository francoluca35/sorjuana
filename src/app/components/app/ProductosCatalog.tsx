'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ChevronDown,
  Copy,
  Filter,
  Plus,
  Search,
  Share2,
  Trash2,
  X,
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
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  deleteProductAction,
  deleteProductsBulkAction,
  insertProductAction,
  updateProductAction,
} from '@/app/actions/products';
import { uploadSorjuanaMedia } from '@/app/actions/storage';
import { SizeInventoryEditor } from '@/app/components/app/SizeInventoryEditor';
import { listShopCategoryTreeAction } from '@/app/actions/shopCategories';
import type { CatalogProduct } from '@/lib/data/productCatalog';
import { displayCategoryLabel, PLACEHOLDER_IMG } from '@/lib/data/productCatalog';
import type { ShopCategoryTree } from '@/lib/data/shopCategories';
import { normalizeSizeInventoryForDb, sumSizeInventoryQty } from '@/lib/data/productSizes';

const sans = 'Montserrat, sans-serif';

const MAX_PRODUCT_IMAGES = 3;

function syncDraftImages(d: CatalogProduct, urls: string[]): CatalogProduct {
  const gallery = urls.filter(Boolean).slice(0, MAX_PRODUCT_IMAGES);
  return {
    ...d,
    gallery_image_urls: [...gallery],
    image: gallery[0] ?? PLACEHOLDER_IMG,
  };
}

function galleryList(d: CatalogProduct): string[] {
  const g = d.gallery_image_urls;
  return Array.isArray(g) ? g.filter(Boolean) : [];
}

function formatMoney(n: number) {
  return `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function computeFinalPrice(base: number, taxApplies: boolean, taxPercent: number | null): number {
  if (!taxApplies) return Math.round(Math.max(0, base));
  const pct = Math.max(0, taxPercent ?? 0);
  return Math.round(Math.max(0, base) * (1 + pct / 100));
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

function idsFromCategoryDb(
  tree: ShopCategoryTree[],
  raw: string | null,
): { catId: string; subId: string } {
  if (!raw?.trim()) return { catId: '', subId: '' };
  const t = raw.trim().toLowerCase();
  if (t === 'combo') return { catId: '', subId: '' };
  const parts = raw
    .trim()
    .toLowerCase()
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return { catId: '', subId: '' };
  const cat = tree.find((c) => c.slug === parts[0]);
  if (!cat) return { catId: '', subId: '' };
  if (parts.length < 2) return { catId: cat.id, subId: '' };
  const sub = cat.subcategories.find((s) => s.slug === parts[1]);
  return { catId: cat.id, subId: sub?.id ?? '' };
}

const categorySelectClass =
  'mt-1.5 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30';

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
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<CatalogProduct | null>(null);
  draftRef.current = draft;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [categoryTree, setCategoryTree] = useState<ShopCategoryTree[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [panelCategoryId, setPanelCategoryId] = useState('');
  const [panelSubcategoryId, setPanelSubcategoryId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCategoriesLoading(true);
      try {
        const data = await listShopCategoryTreeAction();
        if (!cancelled) setCategoryTree(data);
      } catch {
        if (!cancelled) setCategoryTree([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEditCategory = useMemo(
    () => categoryTree.find((c) => c.id === panelCategoryId) ?? null,
    [categoryTree, panelCategoryId],
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(products.map((p) => p.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [products]);

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
    if (categoryTree.length > 0) {
      const ids = idsFromCategoryDb(categoryTree, p.category_db);
      setPanelCategoryId(ids.catId);
      setPanelSubcategoryId(ids.subId);
    } else {
      setPanelCategoryId('');
      setPanelSubcategoryId('');
    }
    setSheetOpen(true);
  }

  useEffect(() => {
    if (!sheetOpen || !draft || categoryTree.length === 0) return;
    if (draft.kind === 'combo') return;
    const ids = idsFromCategoryDb(categoryTree, draft.category_db);
    setPanelCategoryId(ids.catId);
    setPanelSubcategoryId(ids.subId);
  }, [sheetOpen, draft?.id, draft?.kind, categoryTree]);

  useEffect(() => {
    if (!sheetOpen) {
      setPanelCategoryId('');
      setPanelSubcategoryId('');
    }
  }, [sheetOpen]);

  async function saveDraft() {
    if (!draft) return;
    const res = await updateProductAction(draft.id, {
      name: draft.name,
      price: draft.price,
      base_price: draft.base_price,
      transfer_price: draft.transfer_price,
      final_transfer_price: draft.final_transfer_price,
      tax_applies: draft.tax_applies,
      tax_percent: draft.tax_percent,
      compare_at_price: draft.promoPrice,
      category: draft.category_db?.trim() || null,
      description: draft.description,
      /** Siempre string: las server actions omiten `undefined` y antes el servidor interpretaba color ausente como `null`. */
      color: draft.color ?? '',
      stock: draft.stock,
      cost: draft.cost,
      size_inventory: draft.size_inventory,
      image_urls: galleryList(draft).slice(0, MAX_PRODUCT_IMAGES),
      video_url: draft.video_url != null ? draft.video_url.trim() || null : null,
    });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    const sizesNorm = normalizeSizeInventoryForDb(draft.size_inventory);
    const nextStock =
      sizesNorm.length > 0 ? sumSizeInventoryQty(sizesNorm) : Math.max(0, Math.floor(draft.stock));
    const gallery = galleryList(draft).slice(0, MAX_PRODUCT_IMAGES);
    const next: CatalogProduct = {
      ...draft,
      gallery_image_urls: gallery,
      image: gallery[0] ?? PLACEHOLDER_IMG,
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

  const allDisplayedSelected =
    displayed.length > 0 && displayed.every((p) => selectedIds.has(p.id));
  const someDisplayedSelected = displayed.some((p) => selectedIds.has(p.id));

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (allDisplayedSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of displayed) next.delete(p.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of displayed) next.add(p.id);
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function deleteSelectedBulk() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar ${ids.length} producto(s) de la base de datos? Esta acción no se puede deshacer.`)) {
      return;
    }
    const res = await deleteProductsBulkAction(ids);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
    clearSelection();
    setSheetOpen(false);
    setDraft(null);
    toast.success(`${res.deleted} producto(s) eliminado(s).`);
    router.refresh();
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
      transferPrice: draft.transfer_price,
      price: draft.price,
      finalTransferPrice: draft.final_transfer_price,
      taxApplies: draft.tax_applies,
      taxPercent: draft.tax_percent,
      description: draft.description.trim() || null,
      color: draft.color?.trim() || null,
      productCode: copyCode,
      category: draft.category_db?.trim() || null,
      minOrderQty: draft.min_order_qty,
      maxOrderQty: draft.max_order_qty,
      imageUrls: galleryList(draft).slice(0, 3),
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

  async function handleEditImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = '';
    if (!picked.length) return;

    const current = draftRef.current;
    if (!current) {
      toast.error('No hay producto seleccionado.');
      return;
    }

    const room = MAX_PRODUCT_IMAGES - galleryList(current).length;
    if (room <= 0) {
      toast.message(`Máximo ${MAX_PRODUCT_IMAGES} imágenes.`);
      return;
    }

    setImageUploading(true);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < picked.length && uploaded.length < room; i++) {
        const file = picked[i]!;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('kind', 'image');
        const res = await uploadSorjuanaMedia(fd);
        if (!res.ok) {
          toast.error(res.message);
          return;
        }
        uploaded.push(res.publicUrl);
      }
      if (uploaded.length) {
        setDraft((d) => (d ? syncDraftImages(d, [...galleryList(d), ...uploaded]) : d));
        toast.success(uploaded.length === 1 ? 'Imagen agregada.' : `${uploaded.length} imágenes agregadas.`);
      }
    } finally {
      setImageUploading(false);
    }
  }

  function removeDraftImageAt(index: number) {
    setDraft((d) => {
      if (!d) return d;
      const next = galleryList(d).filter((_, i) => i !== index);
      return syncDraftImages(d, next);
    });
  }

  async function handleEditVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const current = draftRef.current;
    if (!current) {
      toast.error('No hay producto seleccionado.');
      return;
    }

    setVideoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'video');
      const res = await uploadSorjuanaMedia(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setDraft((d) => (d ? { ...d, video_url: res.publicUrl } : d));
      toast.success('Video agregado.');
    } finally {
      setVideoUploading(false);
    }
  }

  function removeDraftVideo() {
    setDraft((d) => (d ? { ...d, video_url: null } : d));
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

          {displayed.length > 0 ? (
            <div className="flex flex-none flex-wrap items-center gap-3 border-b border-slate-200/90 bg-white px-3 py-2.5 sm:px-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-displayed"
                  checked={
                    displayed.length === 0
                      ? false
                      : allDisplayedSelected
                        ? true
                        : someDisplayedSelected
                          ? 'indeterminate'
                          : false
                  }
                  onCheckedChange={() => toggleSelectAllVisible()}
                  aria-label="Seleccionar todos los productos visibles"
                />
                <label htmlFor="select-all-displayed" className="cursor-pointer text-xs text-slate-600">
                  Seleccionar visibles ({displayed.length})
                </label>
              </div>
              {selectedIds.size > 0 ? (
                <>
                  <span className="text-xs font-medium text-slate-700">{selectedIds.size} seleccionado(s)</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => void deleteSelectedBulk()}
                  >
                    Eliminar seleccionados
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearSelection}>
                    Quitar selección
                  </Button>
                </>
              ) : null}
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
                <li key={p.id} className="flex items-stretch">
                  <div
                    className="flex shrink-0 items-center pl-2 sm:pl-4"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={(v) => toggleSelectOne(p.id, v === true)}
                      aria-label={`Seleccionar ${p.name}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => openProduct(p)}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 text-left transition hover:bg-white sm:gap-4 sm:pr-6"
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
                    <div>
                      <Label className="text-slate-800">Imágenes del producto</Label>
                      <p className="mt-1 text-xs text-slate-500">Hasta {MAX_PRODUCT_IMAGES} fotos. La primera es la portada.</p>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(ev) => void handleEditImagesChange(ev)}
                      />
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {galleryList(draft).map((url, idx) => (
                          <div
                            key={`${url}-${idx}`}
                            className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                          >
                            <Image src={url} alt="" fill className="object-cover" sizes="120px" unoptimized />
                            <button
                              type="button"
                              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-red-600 shadow"
                              aria-label={`Quitar imagen ${idx + 1}`}
                              onClick={() => removeDraftImageAt(idx)}
                            >
                              <X className="h-4 w-4" strokeWidth={2} />
                            </button>
                            {idx === 0 ? (
                              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                Portada
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {galleryList(draft).length < MAX_PRODUCT_IMAGES ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 w-full border-dashed border-slate-300"
                          disabled={imageUploading}
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <Plus className="mr-2 h-4 w-4" strokeWidth={2} />
                          {imageUploading ? 'Subiendo…' : 'Agregar imagen'}
                        </Button>
                      ) : null}
                    </div>
                    <div>
                      <Label className="text-slate-800">Video del producto</Label>
                      <p className="mt-1 text-xs text-slate-500">Un video opcional (p. ej. para la ficha y Recién llegados).</p>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        className="hidden"
                        onChange={(ev) => void handleEditVideoChange(ev)}
                      />
                      {draft.video_url?.trim() ? (
                        <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-200 bg-black">
                          <video
                            src={draft.video_url.trim()}
                            controls
                            playsInline
                            className="max-h-48 w-full object-contain"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow"
                            aria-label="Quitar video"
                            onClick={() => removeDraftVideo()}
                          >
                            <X className="h-4 w-4" strokeWidth={2} />
                          </button>
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 w-full border-dashed border-slate-300"
                        disabled={videoUploading}
                        onClick={() => videoInputRef.current?.click()}
                      >
                        <Plus className="mr-2 h-4 w-4" strokeWidth={2} />
                        {videoUploading ? 'Subiendo…' : draft.video_url?.trim() ? 'Cambiar video' : 'Agregar video'}
                      </Button>
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
                      <Label htmlFor="d-color">Color</Label>
                      <Input
                        id="d-color"
                        value={draft.color}
                        onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                        className="mt-1.5"
                        placeholder="Ej. beige, negro"
                      />
                    </div>
                    <div>
                      <Label htmlFor="d-base-price">Precio efectivo</Label>
                      <Input
                        id="d-base-price"
                        type="number"
                        min={0}
                        value={draft.base_price}
                        onChange={(e) => {
                          const basePrice = Number(e.target.value) || 0;
                          setDraft({
                            ...draft,
                            base_price: basePrice,
                            price: computeFinalPrice(basePrice, draft.tax_applies, draft.tax_percent),
                          });
                        }}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="d-transfer-price">Precio tarjetas</Label>
                      <Input
                        id="d-transfer-price"
                        type="number"
                        min={0}
                        value={draft.transfer_price}
                        onChange={(e) => {
                          const transferPrice = Number(e.target.value) || 0;
                          setDraft({
                            ...draft,
                            transfer_price: transferPrice,
                            final_transfer_price: computeFinalPrice(transferPrice, draft.tax_applies, draft.tax_percent),
                          });
                        }}
                        className="mt-1.5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="d-tax-applies">Impuesto</Label>
                        <select
                          id="d-tax-applies"
                          value={draft.tax_applies ? 'si' : 'no'}
                          onChange={(e) => {
                            const taxApplies = e.target.value === 'si';
                            setDraft({
                              ...draft,
                              tax_applies: taxApplies,
                              price: computeFinalPrice(draft.base_price, taxApplies, draft.tax_percent),
                              final_transfer_price: computeFinalPrice(draft.transfer_price, taxApplies, draft.tax_percent),
                            });
                          }}
                          className="mt-1.5 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        >
                          <option value="no">No</option>
                          <option value="si">Sí</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="d-tax-pct">Impuesto (%)</Label>
                        <Input
                          id="d-tax-pct"
                          type="number"
                          min={0}
                          value={draft.tax_percent ?? 0}
                          onChange={(e) => {
                            const taxPercent = Number(e.target.value) || 0;
                            setDraft({
                              ...draft,
                              tax_percent: taxPercent,
                              price: computeFinalPrice(draft.base_price, draft.tax_applies, taxPercent),
                              final_transfer_price: computeFinalPrice(draft.transfer_price, draft.tax_applies, taxPercent),
                            });
                          }}
                          className="mt-1.5"
                          disabled={!draft.tax_applies}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="d-price">Precio total efectivo</Label>
                        <Input
                          id="d-price"
                          type="number"
                          min={0}
                          value={draft.price}
                          onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="d-final-transfer">Precio final transferencia</Label>
                        <Input
                          id="d-final-transfer"
                          type="number"
                          min={0}
                          value={draft.final_transfer_price}
                          onChange={(e) => setDraft({ ...draft, final_transfer_price: Number(e.target.value) || 0 })}
                          className="mt-1.5"
                        />
                      </div>
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
                          {draft.kind === 'combo' ? (
                            <div className="mt-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              Combo (categoría fija en base: combo)
                            </div>
                          ) : (
                            <>
                              <p className="mt-1 text-xs text-slate-500">
                                Elegí de{' '}
                                <Link href="/app/categorias" className="text-teal-700 underline underline-offset-2">
                                  Categorías
                                </Link>
                                {categoriesLoading ? ' (cargando…)' : null}.
                              </p>
                              {draft.category_db &&
                              categoryTree.length > 0 &&
                              !idsFromCategoryDb(categoryTree, draft.category_db).catId ? (
                                <p className="mt-2 text-xs text-amber-800">
                                  Valor actual en base:{' '}
                                  <code className="rounded bg-amber-50 px-1 py-0.5">{draft.category_db}</code> — no
                                  coincide con el listado; al elegir arriba se reemplaza.
                                </p>
                              ) : null}
                              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                <div>
                                  <Label htmlFor="d-cat-main" className="text-xs text-slate-600">
                                    Categoría
                                  </Label>
                                  <select
                                    id="d-cat-main"
                                    value={panelCategoryId}
                                    onChange={(e) => {
                                      const catId = e.target.value;
                                      setPanelCategoryId(catId);
                                      setPanelSubcategoryId('');
                                      const cat = categoryTree.find((c) => c.id === catId);
                                      const dbVal = cat ? cat.slug : null;
                                      setDraft((d) =>
                                        d
                                          ? {
                                              ...d,
                                              category_db: dbVal,
                                              category: displayCategoryLabel(dbVal),
                                            }
                                          : null,
                                      );
                                    }}
                                    disabled={categoriesLoading || categoryTree.length === 0}
                                    className={categorySelectClass}
                                  >
                                    <option value="">
                                      {categoriesLoading
                                        ? 'Cargando…'
                                        : categoryTree.length === 0
                                          ? 'Sin categorías — creá en Categorías'
                                          : 'Seleccioná'}
                                    </option>
                                    {categoryTree.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label htmlFor="d-cat-sub" className="text-xs text-slate-600">
                                    Subcategoría
                                  </Label>
                                  <select
                                    id="d-cat-sub"
                                    value={panelSubcategoryId}
                                    onChange={(e) => {
                                      const subId = e.target.value;
                                      setPanelSubcategoryId(subId);
                                      const cat = categoryTree.find((c) => c.id === panelCategoryId);
                                      if (!cat) return;
                                      const sub = cat.subcategories.find((s) => s.id === subId);
                                      const dbVal = sub ? `${cat.slug}/${sub.slug}` : cat.slug;
                                      setDraft((d) =>
                                        d
                                          ? {
                                              ...d,
                                              category_db: dbVal,
                                              category: displayCategoryLabel(dbVal),
                                            }
                                          : null,
                                      );
                                    }}
                                    disabled={
                                      !panelCategoryId ||
                                      !selectedEditCategory ||
                                      selectedEditCategory.subcategories.length === 0
                                    }
                                    className={categorySelectClass}
                                  >
                                    <option value="">
                                      {!panelCategoryId
                                        ? 'Elegí primero una categoría'
                                        : !selectedEditCategory?.subcategories.length
                                          ? 'Sin subcategorías (opcional)'
                                          : 'Seleccioná'}
                                    </option>
                                    {(selectedEditCategory?.subcategories ?? []).map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </>
                          )}
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

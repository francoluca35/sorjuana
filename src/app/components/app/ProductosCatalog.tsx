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
import { getPriceSettingsAction } from '@/app/actions/priceSettings';
import { uploadSorjuanaMedia } from '@/app/actions/storage';
import { SizeInventoryEditor } from '@/app/components/app/SizeInventoryEditor';
import { listShopCategoryTreeAction } from '@/app/actions/shopCategories';
import type { CatalogProduct } from '@/lib/data/productCatalog';
import { displayCategoryLabel, PLACEHOLDER_IMG } from '@/lib/data/productCatalog';
import type { ShopCategoryTree } from '@/lib/data/shopCategories';
import { normalizeSizeInventoryForDb, sumSizeInventoryQty, type SizeInventoryRow } from '@/lib/data/productSizes';
import { MAX_PRODUCT_GALLERY_IMAGES } from '@/lib/productMediaLimits';

const sans = 'Montserrat, sans-serif';

function syncDraftImages(d: CatalogProduct, urls: string[]): CatalogProduct {
  const gallery = urls.filter(Boolean).slice(0, MAX_PRODUCT_GALLERY_IMAGES);
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

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function computePricesFromGarmentCost(garmentCost: number, cashPct: number, transferPct: number) {
  const base = Math.max(0, garmentCost);
  const cash = Math.round(base * (1 - clampPercent(cashPct) / 100));
  const transfer = Math.round(base * (1 - clampPercent(transferPct) / 100));
  const card = Math.round(base);
  return { cash, transfer, card };
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

/** Un producto con varios colores en `size_inventory` → un bloque de edición por color (ids `tmp-color-*` para filas extra). */
function splitProductDraftByInventoryColors(p: CatalogProduct): CatalogProduct[] {
  const inv = p.size_inventory ?? [];
  const hasRowColor = inv.some((s) => (s.color?.trim()?.length ?? 0) > 0);
  if (!hasRowColor) {
    return [{ ...p, size_inventory: inv.map((r) => ({ ...r })) }];
  }
  const byColor = new Map<string, SizeInventoryRow[]>();
  for (const row of inv) {
    const key = row.color?.trim() || 'Sin color';
    const list = byColor.get(key);
    const rr = { ...row, color: row.color?.trim() || null };
    if (list) list.push(rr);
    else byColor.set(key, [rr]);
  }
  const entries = Array.from(byColor.entries());
  return entries.map(([colorLabel, rows], idx) => ({
    ...p,
    id: idx === 0 ? p.id : `tmp-color-${idx}`,
    color: colorLabel === 'Sin color' ? '' : colorLabel,
    size_inventory: rows,
    stock: sumSizeInventoryQty(rows),
  }));
}

function mergeStockFromColorVariants(variants: CatalogProduct[]): {
  mergedSizesNorm: SizeInventoryRow[];
  mergedStock: number;
  mergedColors: string;
} {
  const mergedSizes: SizeInventoryRow[] = [];
  for (const v of variants) {
    const color = v.color?.trim() || null;
    const sizesNorm = normalizeSizeInventoryForDb(v.size_inventory);
    if (sizesNorm.length > 0) {
      for (const s of sizesNorm) {
        mergedSizes.push({ color, size: s.size, qty: s.qty });
      }
    } else if (v.stock > 0) {
      mergedSizes.push({ color, size: 'Unico', qty: Math.max(0, Math.floor(v.stock)) });
    }
  }
  const mergedSizesNorm = normalizeSizeInventoryForDb(mergedSizes);
  const mergedStock =
    mergedSizesNorm.length > 0
      ? sumSizeInventoryQty(mergedSizesNorm)
      : variants.reduce((sum, v) => sum + Math.max(0, Math.floor(v.stock)), 0);
  const mergedColors = Array.from(
    new Set(variants.map((v) => v.color?.trim() || '').filter((x) => x.length > 0)),
  ).join(', ');
  return { mergedSizesNorm, mergedStock, mergedColors };
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
  const [editingVariantIds, setEditingVariantIds] = useState<string[]>([]);
  const [groupedVariantDrafts, setGroupedVariantDrafts] = useState<CatalogProduct[]>([]);
  const [newGroupedColor, setNewGroupedColor] = useState('');
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
  const [globalCashDiscountPercent, setGlobalCashDiscountPercent] = useState(0);
  const [globalTransferDiscountPercent, setGlobalTransferDiscountPercent] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getPriceSettingsAction();
        if (cancelled) return;
        setGlobalCashDiscountPercent(Number(cfg.cashDiscountPercent) || 0);
        setGlobalTransferDiscountPercent(Number(cfg.transferDiscountPercent) || 0);
      } catch {
        if (!cancelled) {
          setGlobalCashDiscountPercent(0);
          setGlobalTransferDiscountPercent(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  function effectiveDiscountPercents(d: CatalogProduct): { cash: number; transfer: number } {
    const cash =
      d.cash_discount_percent != null ? clampPercent(d.cash_discount_percent) : clampPercent(globalCashDiscountPercent);
    const transfer =
      d.transfer_discount_percent != null
        ? clampPercent(d.transfer_discount_percent)
        : clampPercent(globalTransferDiscountPercent);
    return { cash, transfer };
  }

  function applyGarmentCostToDraft(prev: CatalogProduct, garmentCost: number): CatalogProduct {
    const { cash, transfer } = effectiveDiscountPercents(prev);
    const priced = computePricesFromGarmentCost(garmentCost, cash, transfer);
    return {
      ...prev,
      base_price: Math.max(0, garmentCost),
      price: priced.cash,
      transfer_price: priced.transfer,
      final_transfer_price: priced.card,
      tax_applies: false,
      tax_percent: null,
    };
  }

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

  const groupedDisplayed = useMemo(() => {
    type ProductGroup = {
      groupKey: string;
      name: string;
      code: string;
      category: string;
      stock: number;
      image: string;
      primary: CatalogProduct;
      ids: string[];
      variantsCount: number;
    };
    const byName = new Map<string, CatalogProduct[]>();
    for (const p of displayed) {
      const key = p.name.trim().toLowerCase();
      const bucket = byName.get(key);
      if (bucket) bucket.push(p);
      else byName.set(key, [p]);
    }
    const out: ProductGroup[] = [];
    for (const [groupKey, rows] of byName) {
      const primary = rows[0]!;
      out.push({
        groupKey,
        name: primary.name,
        code: primary.code,
        category: primary.category,
        stock: rows.reduce((sum, x) => sum + Math.max(0, x.stock), 0),
        image: primary.image,
        primary,
        ids: rows.map((x) => x.id),
        variantsCount: rows.length,
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    if (mainTab === 'stock') {
      out.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
    }
    return out;
  }, [displayed, mainTab]);

  const editingVariants = useMemo(() => {
    if (editingVariantIds.length === 0) return [];
    const ids = new Set(editingVariantIds);
    return products.filter((p) => ids.has(p.id));
  }, [products, editingVariantIds]);

  const editingVariantDraftsEffective = groupedVariantDrafts.length > 0 ? groupedVariantDrafts : editingVariants;

  const editingColorsSummary = useMemo(() => {
    const colors = Array.from(
      new Set(
        editingVariantDraftsEffective
          .map((x) => x.color?.trim() || '')
          .filter((x) => x.length > 0),
      ),
    );
    return colors.join(', ');
  }, [editingVariantDraftsEffective]);

  function buildGroupedDraft(primary: CatalogProduct, variants: CatalogProduct[]): CatalogProduct {
    const bySize = new Map<string, number>();
    for (const variant of variants) {
      for (const row of variant.size_inventory) {
        const size = row.size.trim();
        if (!size) continue;
        bySize.set(size, (bySize.get(size) ?? 0) + Math.max(0, Math.floor(row.qty)));
      }
    }
    const mergedSizes = Array.from(bySize.entries())
      .map(([size, qty]) => ({ size, qty }))
      .sort((a, b) => a.size.localeCompare(b.size));
    const totalStock = variants.reduce((sum, x) => sum + Math.max(0, x.stock), 0);
    const mergedColors = Array.from(
      new Set(
        variants
          .map((x) => x.color?.trim() || '')
          .filter((x) => x.length > 0),
      ),
    ).join(', ');
    return {
      ...primary,
      stock: totalStock,
      color: mergedColors || primary.color,
      size_inventory: mergedSizes,
    };
  }

  function applyStockToSizeInventory(
    rows: ReturnType<typeof normalizeSizeInventoryForDb>,
    nextStock: number,
  ): ReturnType<typeof normalizeSizeInventoryForDb> {
    if (rows.length === 0) return [];
    const target = Math.max(0, Math.floor(nextStock));
    const total = sumSizeInventoryQty(rows);
    if (total === target) return rows;
    const next = rows.map((x) => ({ ...x }));
    if (target > total) {
      next[0]!.qty += target - total;
      return next;
    }
    let remainingToRemove = total - target;
    for (let i = next.length - 1; i >= 0 && remainingToRemove > 0; i--) {
      const canRemove = Math.min(next[i]!.qty, remainingToRemove);
      next[i]!.qty -= canRemove;
      remainingToRemove -= canRemove;
    }
    return next;
  }

  function updateGroupedVariantStock(variantId: string, nextStockRaw: number) {
    const nextStock = Math.max(0, Math.floor(nextStockRaw));
    setGroupedVariantDrafts((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const norm = normalizeSizeInventoryForDb(v.size_inventory);
        const nextRows = norm.length > 0 ? applyStockToSizeInventory(norm, nextStock) : norm;
        const computedStock = nextRows.length > 0 ? sumSizeInventoryQty(nextRows) : nextStock;
        return {
          ...v,
          stock: computedStock,
          size_inventory: nextRows.length > 0 ? nextRows : v.size_inventory,
        };
      }),
    );
  }

  function updateGroupedVariantColor(variantId: string, nextColor: string) {
    const trimmed = nextColor.trim();
    const colorForRows = trimmed || null;
    setGroupedVariantDrafts((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const nextInv = v.size_inventory.map((r) => ({ ...r, color: colorForRows }));
        return { ...v, color: nextColor, size_inventory: nextInv };
      }),
    );
  }

  function updateGroupedVariantSizeInventory(variantId: string, rows: SizeInventoryRow[]) {
    setGroupedVariantDrafts((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        const norm = normalizeSizeInventoryForDb(rows);
        return {
          ...v,
          size_inventory: rows,
          stock: norm.length > 0 ? sumSizeInventoryQty(norm) : v.stock,
        };
      }),
    );
  }

  function addGroupedColorVariant() {
    const color = newGroupedColor.trim();
    if (!color) return;
    const exists = editingVariantDraftsEffective.some(
      (v) => (v.color?.trim().toLowerCase() || 'sin color') === color.toLowerCase(),
    );
    if (exists) {
      toast.error('Ese color ya existe en esta publicación.');
      return;
    }
    const template = editingVariantDraftsEffective[0] ?? draft;
    if (!template) return;
    const tmpId = `tmp-new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newVariant: CatalogProduct = {
      ...template,
      id: tmpId,
      code: template.code === '—' ? '—' : `${template.code}-${color.toLowerCase().replace(/\s+/g, '-')}`,
      color,
      stock: 0,
      size_inventory: [],
    };
    setGroupedVariantDrafts((prev) => [...prev, newVariant]);
    setNewGroupedColor('');
  }

  function removeGroupedColorBlock(variantId: string) {
    if (!String(variantId).startsWith('tmp-')) {
      toast.error('Solo se pueden quitar colores recién agregados (aún no guardados).');
      return;
    }
    if (groupedVariantDrafts.length <= 1) {
      toast.error('Tiene que quedar al menos un color.');
      return;
    }
    setGroupedVariantDrafts((prev) => prev.filter((v) => v.id !== variantId));
  }

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

  function openProduct(p: CatalogProduct, variantIds?: string[]) {
    const ids = variantIds && variantIds.length > 0 ? variantIds : [p.id];
    setEditingVariantIds(ids);
    const variants = products.filter((x) => ids.includes(x.id));
    const baseDraft =
      variants.length > 1
        ? buildGroupedDraft(p, variants)
        : { ...variants[0]! };
    const forDrafts =
      variants.length > 1 ? variants : splitProductDraftByInventoryColors(variants[0]!);
    setGroupedVariantDrafts(forDrafts.map((v) => ({ ...v, size_inventory: v.size_inventory.map((r) => ({ ...r })) })));
    setDraft(applyGarmentCostToDraft(baseDraft, baseDraft.base_price));
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
    if (editingVariantIds.length > 1) {
      const variantsToSave = groupedVariantDrafts.length > 0 ? groupedVariantDrafts : editingVariants;
      if (variantsToSave.length === 0) return;
      const persistedVariants = variantsToSave.filter((v) => !String(v.id).startsWith('tmp-'));
      const primary = persistedVariants[0] ?? variantsToSave[0]!;
      const { mergedSizesNorm, mergedStock, mergedColors } = mergeStockFromColorVariants(variantsToSave);
      const saveRes = await updateProductAction(primary.id, {
        name: primary.name,
        garment_cost: primary.base_price,
        cash_discount_percent: primary.cash_discount_percent ?? globalCashDiscountPercent,
        transfer_discount_percent: primary.transfer_discount_percent ?? globalTransferDiscountPercent,
        compare_at_price: primary.promoPrice,
        category: primary.category_db?.trim() || null,
        description: primary.description,
        color: mergedColors,
        stock: mergedStock,
        cost: primary.cost,
        size_inventory: mergedSizesNorm,
        image_urls: galleryList(primary).slice(0, MAX_PRODUCT_GALLERY_IMAGES),
        video_url: primary.video_url != null ? primary.video_url.trim() || null : null,
      });
      if (!saveRes.ok) {
        toast.error(saveRes.message);
        return;
      }
      const idsToDelete = persistedVariants
        .map((v) => v.id)
        .filter((id) => id !== primary.id);
      if (idsToDelete.length > 0) {
        const delRes = await deleteProductsBulkAction(idsToDelete);
        if (!delRes.ok) {
          toast.error(delRes.message);
          return;
        }
      }
      toast.success('Publicación consolidada en una sola prenda con color/talle.');
      router.refresh();
      setSheetOpen(false);
      return;
    }
    const { cash, transfer } = effectiveDiscountPercents(draft);
    if (draft.kind === 'combo') {
      const sizesNormCombo = normalizeSizeInventoryForDb(draft.size_inventory);
      const nextStockCombo =
        sizesNormCombo.length > 0 ? sumSizeInventoryQty(sizesNormCombo) : Math.max(0, Math.floor(draft.stock));
      const resCombo = await updateProductAction(draft.id, {
        name: draft.name,
        garment_cost: draft.base_price,
        cash_discount_percent: cash,
        transfer_discount_percent: transfer,
        compare_at_price: draft.promoPrice,
        category: draft.category_db?.trim() || null,
        description: draft.description,
        color: draft.color ?? '',
        stock: nextStockCombo,
        cost: draft.cost,
        size_inventory: sizesNormCombo,
        image_urls: galleryList(draft).slice(0, MAX_PRODUCT_GALLERY_IMAGES),
        video_url: draft.video_url != null ? draft.video_url.trim() || null : null,
      });
      if (!resCombo.ok) {
        toast.error(resCombo.message);
        return;
      }
      const gallery = galleryList(draft).slice(0, MAX_PRODUCT_GALLERY_IMAGES);
      const priced = computePricesFromGarmentCost(draft.base_price, cash, transfer);
      const next: CatalogProduct = {
        ...draft,
        gallery_image_urls: gallery,
        image: gallery[0] ?? PLACEHOLDER_IMG,
        size_inventory: sizesNormCombo.length > 0 ? sizesNormCombo : [],
        stock: nextStockCombo,
        category: displayCategoryLabel(draft.category_db?.trim() || null),
        price: priced.cash,
        transfer_price: priced.transfer,
        final_transfer_price: priced.card,
        cash_discount_percent: cash,
        transfer_discount_percent: transfer,
        tax_applies: false,
        tax_percent: null,
      };
      setProducts((prev) => prev.map((x) => (x.id === draft.id ? next : x)));
      setSheetOpen(false);
      toast.success('Cambios guardados.');
      return;
    }
    const stockVariants = groupedVariantDrafts.length > 0 ? groupedVariantDrafts : [];
    const mergedStockPayload =
      stockVariants.length > 0
        ? mergeStockFromColorVariants(stockVariants)
        : {
            mergedSizesNorm: normalizeSizeInventoryForDb(draft.size_inventory),
            mergedStock:
              normalizeSizeInventoryForDb(draft.size_inventory).length > 0
                ? sumSizeInventoryQty(normalizeSizeInventoryForDb(draft.size_inventory))
                : Math.max(0, Math.floor(draft.stock)),
            mergedColors: draft.color ?? '',
          };
    const { mergedSizesNorm, mergedStock, mergedColors } = mergedStockPayload;
    const res = await updateProductAction(draft.id, {
      name: draft.name,
      garment_cost: draft.base_price,
      cash_discount_percent: cash,
      transfer_discount_percent: transfer,
      compare_at_price: draft.promoPrice,
      category: draft.category_db?.trim() || null,
      description: draft.description,
      /** Siempre string: las server actions omiten `undefined` y antes el servidor interpretaba color ausente como `null`. */
      color: mergedColors || draft.color || '',
      stock: mergedStock,
      cost: draft.cost,
      size_inventory: mergedSizesNorm,
      image_urls: galleryList(draft).slice(0, MAX_PRODUCT_GALLERY_IMAGES),
      video_url: draft.video_url != null ? draft.video_url.trim() || null : null,
    });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    const nextStock =
      mergedSizesNorm.length > 0 ? sumSizeInventoryQty(mergedSizesNorm) : Math.max(0, Math.floor(mergedStock));
    const gallery = galleryList(draft).slice(0, MAX_PRODUCT_GALLERY_IMAGES);
    const priced = computePricesFromGarmentCost(draft.base_price, cash, transfer);
    const next: CatalogProduct = {
      ...draft,
      color: mergedColors || draft.color,
      gallery_image_urls: gallery,
      image: gallery[0] ?? PLACEHOLDER_IMG,
      size_inventory: mergedSizesNorm.length > 0 ? mergedSizesNorm : [],
      stock: nextStock,
      category: displayCategoryLabel(draft.category_db?.trim() || null),
      price: priced.cash,
      transfer_price: priced.transfer,
      final_transfer_price: priced.card,
      cash_discount_percent: cash,
      transfer_discount_percent: transfer,
      tax_applies: false,
      tax_percent: null,
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
    groupedDisplayed.length > 0 &&
    groupedDisplayed.every((g) => g.ids.every((id) => selectedIds.has(id)));
  const someDisplayedSelected = groupedDisplayed.some((g) => g.ids.some((id) => selectedIds.has(id)));

  function toggleSelectGroup(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (allDisplayedSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const g of groupedDisplayed) {
          for (const id of g.ids) next.delete(id);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const g of groupedDisplayed) {
          for (const id of g.ids) next.add(id);
        }
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
    const { cash, transfer } = effectiveDiscountPercents(draft);
    const res = await insertProductAction({
      kind,
      name: `${draft.name} (copia)`,
      stock: copyStock,
      sizeInventory: draft.size_inventory.map((r) => ({ ...r })),
      cost: draft.cost,
      garmentCost: draft.base_price,
      cashDiscountPercent: cash,
      transferDiscountPercent: transfer,
      taxApplies: false,
      taxPercent: null,
      description: draft.description.trim() || null,
      color: draft.color?.trim() || null,
      productCode: copyCode,
      category: draft.category_db?.trim() || null,
      minOrderQty: draft.min_order_qty,
      maxOrderQty: draft.max_order_qty,
      imageUrls: galleryList(draft).slice(0, MAX_PRODUCT_GALLERY_IMAGES),
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

    const room = MAX_PRODUCT_GALLERY_IMAGES - galleryList(current).length;
    if (room <= 0) {
      toast.message(`Máximo ${MAX_PRODUCT_GALLERY_IMAGES} imágenes.`);
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

          {groupedDisplayed.length > 0 ? (
            <div className="flex flex-none flex-wrap items-center gap-3 border-b border-slate-200/90 bg-white px-3 py-2.5 sm:px-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-displayed"
                  checked={
                    groupedDisplayed.length === 0
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
                  Seleccionar visibles ({groupedDisplayed.length})
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
              {groupedDisplayed.map((g) => (
                <li key={g.groupKey} className="flex items-stretch">
                  <div
                    className="flex shrink-0 items-center pl-2 sm:pl-4"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={g.ids.every((id) => selectedIds.has(id))}
                      onCheckedChange={(v) => toggleSelectGroup(g.ids, v === true)}
                      aria-label={`Seleccionar ${g.name}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => openProduct(g.primary, g.ids)}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 text-left transition hover:bg-white sm:gap-4 sm:pr-6"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white sm:h-16 sm:w-16">
                      <span
                        className={cn('absolute left-1 top-1 z-10 h-2 w-2 rounded-full ring-2 ring-white', stockDotClass(g.stock))}
                        aria-hidden
                      />
                      <Image src={g.image} alt="" fill className="object-cover" sizes="64px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{g.name}</p>
                      {mainTab === 'items' ? (
                        <p className="truncate text-xs text-slate-500">
                          {g.code} · {g.category}
                          {g.variantsCount > 1 ? ` · ${g.variantsCount} variantes` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">Stock disponible</p>
                      )}
                    </div>
                    <div className={cn('shrink-0 tabular-nums text-base', stockTextClass(g.stock))}>{g.stock}</div>
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
          if (!o) {
            setDraft(null);
            setEditingVariantIds([]);
            setGroupedVariantDrafts([]);
            setNewGroupedColor('');
          }
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
                      <p className="mt-1 text-xs text-slate-500">Hasta {MAX_PRODUCT_GALLERY_IMAGES} fotos. La primera es la portada.</p>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(ev) => void handleEditImagesChange(ev)}
                      />
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
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
                      {galleryList(draft).length < MAX_PRODUCT_GALLERY_IMAGES ? (
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
                      <Label htmlFor="d-garment-cost">Costo de prenda</Label>
                      <Input
                        id="d-garment-cost"
                        type="number"
                        min={0}
                        value={draft.base_price}
                        onChange={(e) => {
                          const garmentCost = Number(e.target.value) || 0;
                          setDraft((prev) => (prev ? applyGarmentCostToDraft(prev, garmentCost) : prev));
                        }}
                        className="mt-1.5"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Los descuentos se toman de <span className="font-medium">Precios</span>
                        {draft.cash_discount_percent != null || draft.transfer_discount_percent != null
                          ? ' (congelados en este producto al guardarlo).'
                          : ' (vigentes ahora; al guardar quedan fijos en el producto).'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Precios calculados</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-600">
                            Efectivo ({effectiveDiscountPercents(draft).cash}%)
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatMoney(draft.price)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-600">
                            Transferencia ({effectiveDiscountPercents(draft).transfer}%)
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatMoney(draft.transfer_price)}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 pt-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-600">Tarjeta (crédito/débito)</span>
                            <span className="font-semibold tabular-nums text-slate-900">
                              {formatMoney(draft.final_transfer_price)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-snug text-slate-500">
                            Débito: un solo pago. Crédito: 3 cuotas sin interés.
                          </p>
                        </div>
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
                ) : draft.kind === 'combo' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">Combo: un solo stock publicado.</p>
                    <div>
                      <Label htmlFor="d-stock-combo">Stock</Label>
                      <Input
                        id="d-stock-combo"
                        type="number"
                        min={0}
                        value={draft.stock}
                        onChange={(e) =>
                          setDraft({ ...draft, stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                        }
                        className="mt-1.5 text-lg font-semibold"
                      />
                    </div>
                    <div>
                      <Label htmlFor="d-cost-combo">Costo unitario (referencia)</Label>
                      <Input
                        id="d-cost-combo"
                        type="number"
                        min={0}
                        value={draft.cost}
                        onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) || 0 })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600">
                      {editingVariantIds.length > 1
                        ? `Al guardar se unifica en una publicación con todos los colores.`
                        : `Por cada color: stock total y talles. Los talles se guardan con su color.`}
                      {editingColorsSummary ? (
                        <>
                          {' '}
                          <span className="font-medium text-slate-800">Resumen: {editingColorsSummary}</span>
                        </>
                      ) : null}
                    </p>
                    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="new-grouped-color" className="text-xs text-slate-600">
                          Nuevo color
                        </Label>
                        <Input
                          id="new-grouped-color"
                          value={newGroupedColor}
                          onChange={(e) => setNewGroupedColor(e.target.value)}
                          placeholder="Ej. negro, beige"
                          className="mt-1 h-9 text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 px-4"
                        onClick={addGroupedColorVariant}
                      >
                        Agregar
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {editingVariantDraftsEffective.map((v) => (
                        <div
                          key={v.id}
                          className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                        >
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1 space-y-1">
                              <Label htmlFor={`color-${v.id}`} className="text-xs font-medium text-slate-600">
                                Color
                              </Label>
                              <Input
                                id={`color-${v.id}`}
                                value={v.color}
                                onChange={(e) => updateGroupedVariantColor(v.id, e.target.value)}
                                className="h-9"
                                placeholder="Nombre del color"
                              />
                            </div>
                            {String(v.id).startsWith('tmp-') ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                aria-label="Quitar este color"
                                onClick={() => removeGroupedColorBlock(v.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                          <div>
                            <Label htmlFor={`stock-${v.id}`} className="text-xs text-slate-600">
                              Stock (total o ajuste rápido si ya cargaste talles)
                            </Label>
                            <Input
                              id={`stock-${v.id}`}
                              type="number"
                              min={0}
                              value={v.stock}
                              onChange={(e) =>
                                updateGroupedVariantStock(v.id, Number(e.target.value) || 0)
                              }
                              className="mt-1 h-9 w-full max-w-[14rem] text-right tabular-nums"
                            />
                          </div>
                          <div className="border-t border-slate-100 pt-2">
                            <SizeInventoryEditor
                              rows={v.size_inventory}
                              onChange={(rows) => updateGroupedVariantSizeInventory(v.id, rows)}
                              disabled={false}
                              idPrefix={`stock-${v.id}`}
                              implicitColor={v.color?.trim() || null}
                            />
                          </div>
                        </div>
                      ))}
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

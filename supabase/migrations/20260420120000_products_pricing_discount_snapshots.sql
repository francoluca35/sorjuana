-- Descuentos vigentes al guardar el producto (snapshot de /app/precios).

alter table public.products add column if not exists cash_discount_percent numeric(5,2) null;
alter table public.products add column if not exists transfer_discount_percent numeric(5,2) null;

comment on column public.products.cash_discount_percent is 'Snapshot: % descuento efectivo aplicado al publicar el producto.';
comment on column public.products.transfer_discount_percent is 'Snapshot: % descuento transferencia aplicado al publicar el producto.';

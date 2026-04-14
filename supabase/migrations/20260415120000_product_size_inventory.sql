-- Inventario por talle: [{ "size": "S", "qty": 3 }, ...]. La columna `stock` sigue siendo el total (suma) para listados y tienda.
alter table public.products add column if not exists size_inventory jsonb not null default '[]'::jsonb;

comment on column public.products.size_inventory is 'Talles disponibles y unidades por talle (JSON array de objetos size/qty).';

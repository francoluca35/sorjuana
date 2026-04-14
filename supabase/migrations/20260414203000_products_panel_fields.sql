-- Campos del formulario de carga y del panel de productos
alter table public.products add column if not exists kind text not null default 'producto';
alter table public.products add column if not exists stock integer not null default 0;
alter table public.products add column if not exists cost numeric null;
alter table public.products add column if not exists base_price numeric null;
alter table public.products add column if not exists tax_applies boolean not null default false;
alter table public.products add column if not exists tax_percent numeric null;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists product_code text;
alter table public.products add column if not exists image_urls text[] not null default '{}';
alter table public.products add column if not exists video_url text;
alter table public.products add column if not exists min_order_qty integer null;
alter table public.products add column if not exists max_order_qty integer null;

comment on column public.products.kind is 'producto | combo | ofertas';
comment on column public.products.image_urls is 'Hasta 3 URLs de imagen (bucket sorjuana u otras)';
comment on column public.products.image_url is 'Primera imagen (compatibilidad tienda / recién llegados)';

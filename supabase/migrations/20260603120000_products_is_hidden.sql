-- Ocultar productos del catálogo público sin borrarlos (panel /app/productos).

alter table public.products
	add column if not exists is_hidden boolean not null default false;

comment on column public.products.is_hidden is
	'Si es true, no aparece en inicio, catálogo ni carruseles públicos.';

create index if not exists products_storefront_visible_idx
	on public.products (created_at desc)
	where is_hidden = false;

drop policy if exists "products_select_public" on public.products;

create policy "products_select_public"
	on public.products
	for select
	using (is_hidden = false or auth.uid() is not null);

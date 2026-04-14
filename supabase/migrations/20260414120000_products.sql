-- Productos para catálogo / Recién llegados (orden por fecha de alta)
create table if not exists public.products (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	category text,
	price numeric not null check (price >= 0),
	compare_at_price numeric null check (compare_at_price is null or compare_at_price >= 0),
	image_url text,
	created_at timestamptz not null default now()
);

create index if not exists products_created_at_desc_idx on public.products (created_at desc);

alter table public.products enable row level security;

drop policy if exists "products_select_public" on public.products;
drop policy if exists "products_insert_authenticated" on public.products;
drop policy if exists "products_update_authenticated" on public.products;
drop policy if exists "products_delete_authenticated" on public.products;

-- Lectura pública para la tienda (home, catálogo futuro)
create policy "products_select_public"
	on public.products for select
	using (true);

-- Altas / ediciones solo usuarios autenticados (panel)
create policy "products_insert_authenticated"
	on public.products for insert
	to authenticated
	with check (true);

create policy "products_update_authenticated"
	on public.products for update
	to authenticated
	using (true)
	with check (true);

create policy "products_delete_authenticated"
	on public.products for delete
	to authenticated
	using (true);

-- Ejemplo (desde el SQL editor, con sesión autenticada o service role):
-- insert into public.products (name, category, price, compare_at_price, image_url)
-- values ('Vestido prueba', 'Italiana', 45900, 52900, 'https://images.unsplash.com/photo-1595777457583?w=800');

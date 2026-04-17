-- Categorías y subcategorías configurables desde el panel (ej. Francés > Pantalón)
create table if not exists public.shop_categories (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	slug text not null,
	sort_order int not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint shop_categories_slug_unique unique (slug)
);

create table if not exists public.shop_subcategories (
	id uuid primary key default gen_random_uuid(),
	category_id uuid not null references public.shop_categories (id) on delete cascade,
	name text not null,
	slug text not null,
	sort_order int not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint shop_subcategories_category_slug_unique unique (category_id, slug)
);

create index if not exists shop_subcategories_category_id_idx on public.shop_subcategories (category_id);

alter table public.shop_categories enable row level security;
alter table public.shop_subcategories enable row level security;

drop policy if exists "shop_categories_select_public" on public.shop_categories;
drop policy if exists "shop_categories_insert_authenticated" on public.shop_categories;
drop policy if exists "shop_categories_update_authenticated" on public.shop_categories;
drop policy if exists "shop_categories_delete_authenticated" on public.shop_categories;

drop policy if exists "shop_subcategories_select_public" on public.shop_subcategories;
drop policy if exists "shop_subcategories_insert_authenticated" on public.shop_subcategories;
drop policy if exists "shop_subcategories_update_authenticated" on public.shop_subcategories;
drop policy if exists "shop_subcategories_delete_authenticated" on public.shop_subcategories;

create policy "shop_categories_select_public"
	on public.shop_categories for select
	using (true);

create policy "shop_categories_insert_authenticated"
	on public.shop_categories for insert
	to authenticated
	with check (true);

create policy "shop_categories_update_authenticated"
	on public.shop_categories for update
	to authenticated
	using (true)
	with check (true);

create policy "shop_categories_delete_authenticated"
	on public.shop_categories for delete
	to authenticated
	using (true);

create policy "shop_subcategories_select_public"
	on public.shop_subcategories for select
	using (true);

create policy "shop_subcategories_insert_authenticated"
	on public.shop_subcategories for insert
	to authenticated
	with check (true);

create policy "shop_subcategories_update_authenticated"
	on public.shop_subcategories for update
	to authenticated
	using (true)
	with check (true);

create policy "shop_subcategories_delete_authenticated"
	on public.shop_subcategories for delete
	to authenticated
	using (true);

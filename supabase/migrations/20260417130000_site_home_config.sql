-- Configuración publicada del inicio (hero, más vendidos, recién llegados). Una sola fila.

create table if not exists public.site_home_config (
	id smallint primary key default 1,
	constraint site_home_config_singleton check (id = 1),
	hero_slides jsonb,
	best_sellers_product_ids jsonb not null default '[]'::jsonb,
	recent_arrivals_product_ids jsonb not null default '[]'::jsonb,
	updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.site_home_config is 'Mapa de página del inicio: hero, IDs de productos destacados (publicado desde /app/mapa-pagina).';

alter table public.site_home_config enable row level security;

create policy "site_home_config_select_anon_authenticated"
	on public.site_home_config
	for select
	to anon, authenticated
	using (true);

create policy "site_home_config_insert_authenticated"
	on public.site_home_config
	for insert
	to authenticated
	with check (true);

create policy "site_home_config_update_authenticated"
	on public.site_home_config
	for update
	to authenticated
	using (true)
	with check (true);

insert into public.site_home_config (id)
values (1)
on conflict (id) do nothing;

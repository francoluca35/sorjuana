-- Configuración global de descuentos por medio de pago para el panel.

create table if not exists public.price_settings (
	id smallint primary key default 1,
	constraint price_settings_singleton check (id = 1),
	cash_discount_percent numeric(5,2) not null default 0,
	transfer_discount_percent numeric(5,2) not null default 0,
	updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.price_settings is 'Descuentos globales para precios en efectivo y transferencia.';

alter table public.price_settings enable row level security;

create policy "price_settings_select_anon_authenticated"
	on public.price_settings
	for select
	to anon, authenticated
	using (true);

create policy "price_settings_insert_authenticated"
	on public.price_settings
	for insert
	to authenticated
	with check (true);

create policy "price_settings_update_authenticated"
	on public.price_settings
	for update
	to authenticated
	using (true)
	with check (true);

insert into public.price_settings (id)
values (1)
on conflict (id) do nothing;

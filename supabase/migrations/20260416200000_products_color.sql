-- Color del producto (texto libre, ej. beige, negro)
alter table public.products add column if not exists color text null;

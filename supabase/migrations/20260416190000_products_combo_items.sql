-- Items que componen un combo (referencia de armado)
alter table public.products add column if not exists combo_items jsonb not null default '[]'::jsonb;

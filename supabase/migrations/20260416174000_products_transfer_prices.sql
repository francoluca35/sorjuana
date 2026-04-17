-- Precio de transferencia para el panel de carga de productos
alter table public.products add column if not exists transfer_price numeric null;
alter table public.products add column if not exists final_transfer_price numeric null;

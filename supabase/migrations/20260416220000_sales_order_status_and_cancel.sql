-- Estado del pedido (pendiente / pagado / cancelado) y restauración de stock al cancelar

alter table public.sales_orders
	add column if not exists status text not null default 'pending';

alter table public.sales_orders
	drop constraint if exists sales_orders_status_check;

alter table public.sales_orders
	add constraint sales_orders_status_check check (status in ('pending', 'paid', 'cancelled'));

comment on column public.sales_orders.status is 'pending: stock ya descontado; paid: cobrado; cancelled: anulado y stock devuelto.';

-- Marcar cobrado: el stock se mantiene descontado
create or replace function public.mark_sales_order_paid(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.sales_orders
	set status = 'paid'
	where id = p_order_id and status = 'pending';

	if not found then
		raise exception 'Pedido no encontrado o ya procesado';
	end if;
end;
$$;

-- Cancelar: devuelve cantidades al inventario según snapshot del pedido
create or replace function public.cancel_sales_order_restore_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	ord record;
	n int;
	i int;
	line jsonb;
	prod record;
	pid uuid;
	req_qty int;
	sz text;
	inv_len int;
	si int;
	e jsonb;
	new_inv jsonb;
	found_size boolean;
	new_qty int;
	stock_sum int;
begin
	select * into ord from public.sales_orders where id = p_order_id for update;
	if not found then
		raise exception 'Pedido no encontrado';
	end if;
	if ord.status <> 'pending' then
		raise exception 'El pedido ya fue procesado';
	end if;

	n := jsonb_array_length(coalesce(ord.items, '[]'::jsonb));
	for i in 0 .. n - 1 loop
		line := ord.items -> i;
		pid := (line ->> 'product_id')::uuid;
		req_qty := floor(greatest(1, coalesce((line ->> 'qty')::numeric, 0)))::int;
		sz := nullif(trim(line ->> 'size'), '');

		select id, stock, size_inventory into prod from public.products where id = pid for update;
		if not found then
			raise exception 'Producto no encontrado en catálogo';
		end if;

		inv_len := coalesce(jsonb_array_length(prod.size_inventory), 0);

		if inv_len > 0 then
			if sz is null or sz = '' then
				raise exception 'Datos de talle inconsistentes en el pedido';
			end if;

			new_inv := '[]'::jsonb;
			found_size := false;

			for si in 0 .. inv_len - 1 loop
				e := prod.size_inventory -> si;
				if e is null then
					continue;
				end if;
				if trim(e ->> 'size') = sz then
					found_size := true;
					new_qty := (e ->> 'qty')::int + req_qty;
					new_inv := new_inv || jsonb_build_array(jsonb_build_object('size', sz, 'qty', new_qty));
				else
					new_inv := new_inv || jsonb_build_array(e);
				end if;
			end loop;

			if not found_size then
				new_inv := new_inv || jsonb_build_array(jsonb_build_object('size', sz, 'qty', req_qty));
			end if;

			select coalesce(sum((elem ->> 'qty')::int), 0)
			into stock_sum
			from jsonb_array_elements(new_inv) as t(elem);

			update public.products
			set
				size_inventory = new_inv,
				stock = stock_sum
			where id = prod.id;
		else
			update public.products
			set stock = stock + req_qty
			where id = prod.id;
		end if;
	end loop;

	update public.sales_orders
	set status = 'cancelled'
	where id = p_order_id;
end;
$$;

revoke all on function public.mark_sales_order_paid(uuid) from public;
grant execute on function public.mark_sales_order_paid(uuid) to service_role;

revoke all on function public.cancel_sales_order_restore_stock(uuid) from public;
grant execute on function public.cancel_sales_order_restore_stock(uuid) to service_role;

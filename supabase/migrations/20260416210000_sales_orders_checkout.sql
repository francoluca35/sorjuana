-- Pedidos desde la tienda: reserva de stock + registro para el panel Ventas

create table if not exists public.sales_orders (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	customer_name text not null,
	customer_phone text not null,
	customer_locality text not null,
	customer_address text not null,
	items jsonb not null default '[]'::jsonb,
	total_amount numeric not null check (total_amount >= 0)
);

create index if not exists sales_orders_created_at_desc_idx on public.sales_orders (created_at desc);

alter table public.sales_orders enable row level security;

drop policy if exists "sales_orders_select_authenticated" on public.sales_orders;
create policy "sales_orders_select_authenticated"
	on public.sales_orders for select
	to authenticated
	using (true);

comment on table public.sales_orders is 'Pedidos confirmados desde checkout (WhatsApp); items = snapshot JSON.';

-- p_items: [{"product_id":"uuid","size":"M","qty":2}, ...]
create or replace function public.checkout_reserve(
	p_customer_name text,
	p_customer_phone text,
	p_customer_locality text,
	p_customer_address text,
	p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	i int;
	n int;
	line_obj jsonb;
	prod record;
	req_qty int;
	sz text;
	e jsonb;
	new_inv jsonb;
	found_size boolean;
	new_qty int;
	total numeric := 0;
	out_items jsonb := '[]'::jsonb;
	unit_price numeric;
	line_total numeric;
	oid uuid;
	pid uuid;
	inv_len_inner int;
	stock_sum int;
	updated_id uuid;
begin
	if p_items is null or jsonb_typeof(p_items) != 'array' then
		raise exception 'Carrito vacío';
	end if;

	n := jsonb_array_length(p_items);
	if n < 1 then
		raise exception 'Carrito vacío';
	end if;

	if length(trim(coalesce(p_customer_name, ''))) < 2
		or length(trim(coalesce(p_customer_phone, ''))) < 6
		or length(trim(coalesce(p_customer_locality, ''))) < 2
		or length(trim(coalesce(p_customer_address, ''))) < 4 then
		raise exception 'Completá todos los datos de contacto.';
	end if;

	for i in 0 .. n - 1 loop
		line_obj := p_items -> i;
		if line_obj is null or jsonb_typeof(line_obj) != 'object' then
			raise exception 'Ítem inválido';
		end if;

		begin
			pid := (line_obj ->> 'product_id')::uuid;
		exception when others then
			raise exception 'Producto inválido';
		end;

		select
			p.id,
			p.name,
			p.price,
			p.product_code,
			p.stock,
			p.size_inventory
		into prod
		from public.products p
		where p.id = pid
		for update;

		if not found then
			raise exception 'Producto no encontrado';
		end if;

		req_qty := floor(greatest(1, coalesce((line_obj ->> 'qty')::numeric, 0)))::int;
		sz := nullif(trim(line_obj ->> 'size'), '');

		inv_len_inner := coalesce(jsonb_array_length(prod.size_inventory), 0);

		if inv_len_inner > 0 then
			if sz is null or sz = '' then
				raise exception 'Falta talle: %', prod.name;
			end if;

			new_inv := '[]'::jsonb;
			found_size := false;

			for si in 0 .. inv_len_inner - 1 loop
				e := prod.size_inventory -> si;
				if e is null then
					continue;
				end if;
				if trim(e ->> 'size') = sz then
					found_size := true;
					new_qty := (e ->> 'qty')::int - req_qty;
					if new_qty < 0 then
						raise exception 'Stock insuficiente: % (%)', prod.name, sz;
					end if;
					new_inv := new_inv || jsonb_build_array(jsonb_build_object('size', sz, 'qty', new_qty));
				else
					new_inv := new_inv || jsonb_build_array(e);
				end if;
			end loop;

			if not found_size then
				raise exception 'Talle no disponible: %', sz;
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
			if prod.stock < req_qty then
				raise exception 'Stock insuficiente: %', prod.name;
			end if;

			update public.products
			set stock = stock - req_qty
			where id = prod.id and stock >= req_qty
			returning id into updated_id;

			if updated_id is null then
				raise exception 'Stock insuficiente: %', prod.name;
			end if;
		end if;

		unit_price := coalesce(prod.price, 0)::numeric;
		line_total := unit_price * req_qty;
		total := total + line_total;

		out_items := out_items || jsonb_build_array(
			jsonb_build_object(
				'product_id', prod.id,
				'product_code', coalesce(prod.product_code, ''),
				'name', prod.name,
				'size', coalesce(sz, ''),
				'qty', req_qty,
				'unit_price', unit_price,
				'line_total', line_total
			)
		);
	end loop;

	insert into public.sales_orders (
		customer_name,
		customer_phone,
		customer_locality,
		customer_address,
		items,
		total_amount
	)
	values (
		trim(p_customer_name),
		trim(p_customer_phone),
		trim(p_customer_locality),
		trim(p_customer_address),
		out_items,
		total
	)
	returning id into oid;

	return jsonb_build_object(
		'ok', true,
		'order_id', oid,
		'total', total,
		'items', out_items
	);
end;
$$;

revoke all on function public.checkout_reserve(text, text, text, text, jsonb) from public;
grant execute on function public.checkout_reserve(text, text, text, text, jsonb) to service_role;

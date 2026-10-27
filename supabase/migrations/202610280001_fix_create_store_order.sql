-- Repair create_store_order after PostgreSQL reported SQLSTATE 42702:
-- qris_image_path conflicts with the function's OUT parameter of the same name.
create or replace function public.create_store_order(
  p_product_id uuid, p_user_game_id text, p_server_id text default null,
  p_customer_email text default null, p_customer_name text default null, p_user_id uuid default null
)
returns table (id uuid, order_number text, public_token uuid, price_idr integer, product_name text, game_name text, qris_image_path text)
language plpgsql security definer set search_path = public as $$
declare
  chosen_product public.products%rowtype;
  chosen_game public.games%rowtype;
  created_order public.orders%rowtype;
begin
  select * into chosen_product from public.products
  where products.id = p_product_id
    and products.is_active = true
    and products.qris_image_path is not null;
  if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;

  select * into chosen_game from public.games
  where games.id = chosen_product.game_id and games.is_active = true;
  if not found then raise exception 'GAME_NOT_AVAILABLE'; end if;

  insert into public.orders (order_number, product_id, game_id, user_id, customer_name, product_name, game_name, amount, price_idr, user_game_id, server_id, customer_email)
  values (
    'DYV-' || to_char(now() at time zone 'utc','YYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
    chosen_product.id, chosen_game.id, p_user_id, nullif(trim(p_customer_name),''), chosen_product.name, chosen_game.name, chosen_product.amount,
    chosen_product.price_idr, trim(p_user_game_id), nullif(trim(p_server_id),''), nullif(trim(p_customer_email),'')
  ) returning * into created_order;

  insert into public.payments (order_id) values (created_order.id);
  return query select created_order.id, created_order.order_number, created_order.public_token,
    created_order.price_idr, created_order.product_name, created_order.game_name, chosen_product.qris_image_path;
end;
$$;

revoke all on function public.create_store_order(uuid,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.create_store_order(uuid,text,text,text,text,uuid) to service_role;

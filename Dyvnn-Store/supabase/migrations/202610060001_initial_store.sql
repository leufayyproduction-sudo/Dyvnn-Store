-- Dyvnn Store initial schema. Apply with `supabase db push` or the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.games (
  id text primary key, slug text not null unique, name text not null,
  publisher text not null default '', category text not null default '', currency text not null,
  image_url text not null default '', accent_color text not null default '#8b5cf6',
  status text not null default 'coming_soon' check (status in ('active','coming_soon')),
  description text not null default '',
  is_active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on update cascade on delete restrict,
  name text not null, amount integer not null check (amount > 0), bonus text,
  price_idr integer not null check (price_idr > 0), is_active boolean not null default true,
  qris_image_path text,
  sort_order integer not null default 0, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique (game_id, name)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique,
  public_token uuid not null unique default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  game_id text not null references public.games(id) on update cascade on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  product_name text not null, game_name text not null, amount integer not null check (amount > 0),
  price_idr integer not null check (price_idr > 0), user_game_id text not null, server_id text,
  customer_email text, status text not null default 'pending_payment'
    check (status in ('pending_payment','proof_submitted','paid','processing','completed','rejected','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
  method text not null default 'qris' check (method in ('qris','manual')),
  status text not null default 'pending' check (status in ('pending','proof_submitted','confirmed','rejected')),
  proof_path text, proof_uploaded_at timestamptz, confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz, admin_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete restrict,
  game_id text not null references public.games(id) on update cascade on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 8 and 1000),
  is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','owner')),
  is_active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists public.store_visits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  route text not null check (char_length(route) between 1 and 180),
  visited_at timestamptz not null default now(),
  visit_day date not null default (timezone('utc', now()))::date,
  unique (session_id, route, visit_day)
);

-- Called by trusted server routes with the service-role key so public users never
-- receive direct INSERT permissions on orders or payments.
drop function if exists public.create_store_order(uuid,text,text,text,uuid);
drop function if exists public.create_store_order(uuid,text,text,text);
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
  select * into chosen_product from public.products where products.id = p_product_id and is_active = true;
  if not found then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;
  select * into chosen_game from public.games
  where games.id = chosen_product.game_id and games.is_active = true and games.status = 'active';
  if not found then raise exception 'GAME_NOT_AVAILABLE'; end if;
  if chosen_product.qris_image_path is null then raise exception 'QRIS_NOT_READY'; end if;

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

create or replace function public.clear_qris_on_price_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.price_idr is distinct from old.price_idr then
    new.qris_image_path := null;
  end if;
  return new;
end;
$$;

create or replace function public.submit_store_payment_proof(p_order_id uuid, p_public_token uuid, p_proof_path text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.payments p set status='proof_submitted', proof_path=p_proof_path, proof_uploaded_at=now()
  from public.orders o
  where p.order_id=o.id and o.id=p_order_id and o.public_token=p_public_token
    and p_proof_path like p_order_id::text || '/%'
    and o.status in ('pending_payment','rejected','proof_submitted');
  if not found then return false; end if;
  update public.orders set status='proof_submitted' where id=p_order_id and public_token=p_public_token;
  return true;
end;
$$;

create or replace function public.submit_store_review(
  p_order_id uuid, p_public_token uuid, p_display_name text, p_rating integer, p_comment text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_review_id uuid;
begin
  insert into public.reviews (order_id, game_id, display_name, rating, comment)
  select o.id, o.game_id, trim(p_display_name), p_rating, trim(p_comment)
  from public.orders o
  where o.id=p_order_id and o.public_token=p_public_token and o.status='completed'
  returning id into new_review_id;
  if new_review_id is null then raise exception 'ORDER_NOT_REVIEWABLE'; end if;
  return new_review_id;
end;
$$;

create or replace function public.admin_set_order_status(
  p_order_id uuid, p_status text, p_admin_id uuid, p_admin_note text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admins where user_id=p_admin_id and is_active=true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_status not in ('pending_payment','proof_submitted','paid','processing','completed','rejected','cancelled') then
    raise exception 'INVALID_ORDER_STATUS';
  end if;
  if p_status='paid' and not exists (select 1 from public.payments where order_id=p_order_id and status='proof_submitted' and proof_path is not null) then
    raise exception 'PAYMENT_PROOF_REQUIRED';
  end if;
  if p_status in ('processing','completed') and not exists (select 1 from public.payments where order_id=p_order_id and status='confirmed') then
    raise exception 'PAYMENT_MUST_BE_CONFIRMED';
  end if;
  update public.orders set status=p_status where id=p_order_id;
  if not found then return false; end if;
  update public.payments set
    status=case when p_status in ('paid','processing','completed') then 'confirmed' when p_status='rejected' then 'rejected' else status end,
    confirmed_by=case when p_status in ('paid','processing','completed') then p_admin_id else confirmed_by end,
    confirmed_at=case when p_status in ('paid','processing','completed') then now() else confirmed_at end,
    admin_note=coalesce(p_admin_note,admin_note)
  where order_id=p_order_id;
  return true;
end;
$$;

revoke all on function public.create_store_order(uuid,text,text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.submit_store_payment_proof(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.submit_store_review(uuid,uuid,text,integer,text) from public, anon, authenticated;
revoke all on function public.admin_set_order_status(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.create_store_order(uuid,text,text,text,text,uuid) to service_role;
grant execute on function public.submit_store_payment_proof(uuid,uuid,text) to service_role;
grant execute on function public.submit_store_review(uuid,uuid,text,integer,text) to service_role;
grant execute on function public.admin_set_order_status(uuid,text,uuid,text) to service_role;

create or replace function public.is_store_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()) and is_active = true);
$$;
revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_updated_at on public.games;
create trigger set_updated_at before update on public.games for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists clear_qris_on_price_change on public.products;
create trigger clear_qris_on_price_change before update of price_idr on public.products
for each row execute function public.clear_qris_on_price_change();
drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.payments;
create trigger set_updated_at before update on public.payments for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.reviews;
create trigger set_updated_at before update on public.reviews for each row execute function public.set_updated_at();

create index if not exists products_game_active_sort_idx on public.products(game_id, is_active, sort_order);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_game_created_idx on public.orders(game_id, created_at desc);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists payments_status_created_idx on public.payments(status, created_at desc);
create index if not exists reviews_published_created_idx on public.reviews(is_published, created_at desc);

alter table public.games enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.admins enable row level security;
alter table public.store_visits enable row level security;

grant select on public.orders, public.admins to authenticated;

drop policy if exists "Public can read active games" on public.games;
create policy "Public can read active games" on public.games for select to anon, authenticated using (is_active);
drop policy if exists "Admins manage games" on public.games;
create policy "Admins manage games" on public.games for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products for select to anon, authenticated using (is_active);
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders" on public.orders for select to authenticated using (public.is_store_admin());
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Admins update orders" on public.orders;
drop policy if exists "Admins manage payments" on public.payments;
create policy "Admins manage payments" on public.payments for select to authenticated using (public.is_store_admin());
drop policy if exists "Public can read published reviews" on public.reviews;
create policy "Public can read published reviews" on public.reviews for select to anon, authenticated using (is_published);
drop policy if exists "Admins manage reviews" on public.reviews;
create policy "Admins manage reviews" on public.reviews for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists "Admins can read own admin profile" on public.admins;
create policy "Admins can read own admin profile" on public.admins for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Admins read visitor analytics" on public.store_visits;
create policy "Admins read visitor analytics" on public.store_visits for select to authenticated using (public.is_store_admin());

insert into public.games (id, slug, name, publisher, category, currency, image_url, accent_color, status, description, is_active)
values
  ('mlbb','mlbb','Mobile Legends','MOONTON','MOBA','Diamonds','/images/mlbb.jpg','#a78bfa','active','Top up Diamonds Mobile Legends dengan proses cepat.',true),
  ('pubg','pubg','PUBG Mobile','Tencent Games','Battle Royale','UC','/images/pubg.jpg','#38bdf8','coming_soon','Pilihan UC PUBG Mobile akan segera tersedia.',true),
  ('ff','ff','Free Fire','Garena','Battle Royale','Diamonds','/images/ff.png','#fb923c','coming_soon','Top up Diamonds Free Fire segera hadir.',true),
  ('hok','hok','Honor of Kings','Level Infinite','MOBA','Tokens','/images/hok.png','#c084fc','coming_soon','Top up Tokens Honor of Kings segera hadir.',true),
  ('roblox','roblox','Roblox','Roblox Corporation','Adventure','Robux','/images/roblox.png','#e5e7eb','coming_soon','Pilihan Robux Roblox segera tersedia.',true)
on conflict (id) do update set slug=excluded.slug, name=excluded.name, publisher=excluded.publisher,
  category=excluded.category, currency=excluded.currency, image_url=excluded.image_url,
  accent_color=excluded.accent_color, status=excluded.status, description=excluded.description;

insert into public.products (game_id, name, amount, bonus, price_idr, sort_order)
values
  ('mlbb','50 Diamonds',50,null,15000,10), ('mlbb','100 Diamonds',100,'Pilihan populer',28000,20), ('mlbb','250 Diamonds',250,null,70000,30)
on conflict (game_id, name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('qris-codes','qris-codes',true,2097152,array['image/png','image/jpeg','image/webp']),
  ('payment-proofs','payment-proofs',false,2097152,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public read active QRIS image" on storage.objects;
drop policy if exists "Admins upload QRIS image" on storage.objects;
create policy "Admins upload QRIS image" on storage.objects for insert to authenticated with check (bucket_id = 'qris-codes' and public.is_store_admin());
drop policy if exists "Admins update QRIS image" on storage.objects;
create policy "Admins update QRIS image" on storage.objects for update to authenticated using (bucket_id = 'qris-codes' and public.is_store_admin()) with check (bucket_id = 'qris-codes' and public.is_store_admin());
drop policy if exists "Admins read payment proofs" on storage.objects;
create policy "Admins read payment proofs" on storage.objects for select to authenticated using (bucket_id = 'payment-proofs' and public.is_store_admin());

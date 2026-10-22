alter table public.reviews add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop function if exists public.submit_store_review(uuid,uuid,text,integer,text);
create or replace function public.submit_store_review(
  p_order_id uuid, p_public_token uuid, p_display_name text, p_rating integer, p_comment text, p_photo_url text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_review_id uuid;
begin
  insert into public.reviews (order_id, game_id, display_name, rating, comment, photo_url)
  select o.id, o.game_id, trim(p_display_name), p_rating, trim(p_comment), p_photo_url
  from public.orders o
  where o.id=p_order_id and o.public_token=p_public_token and o.status='completed'
  returning id into new_review_id;
  if new_review_id is null then raise exception 'ORDER_NOT_REVIEWABLE'; end if;
  return new_review_id;
end;
$$;
revoke all on function public.submit_store_review(uuid,uuid,text,integer,text,text) from public, anon, authenticated;
grant execute on function public.submit_store_review(uuid,uuid,text,integer,text,text) to service_role;

# Dyvnn Store · Supabase and Vercel setup

## 1. Connect Supabase

1. Create a Supabase project and copy its Project URL, anon/public key, and service-role key into the matching entries in `.env.local`.
2. Apply `migrations/202610060001_initial_store.sql`, `migrations/202610220001_review_photos.sql`, and `migrations/202610270001_sync_game_availability.sql` from Supabase **SQL Editor**, or link this folder to your project and run `supabase db push`.
3. The migrations create the store tables, RLS rules, storage buckets, starter games/products, optional review photos, and automatic game availability based on active products with QRIS.

The starter dashboard has no default admin account. Create the first account in Supabase **Authentication → Users → Add user**, then authorize its email in SQL Editor:

```sql
insert into public.admins (user_id, role)
select id, 'owner' from auth.users where email = 'ADMIN_EMAIL_HERE'
on conflict (user_id) do update set role = excluded.role, is_active = true;
```

Admin sign-up is intentionally disabled. `/admin` is only available to active rows in `public.admins`.

## 2. Local run

```bash
npm install
npm run dev
```

Store pages read active games and products from Supabase. Order creation loads the current active product price in a database function, records an order/payment, and returns a private order token. The customer then scans the active QRIS, uploads proof, and sees status updates. An admin confirms proof and may move the order through processing to completed. A completed order token can submit one review, which remains hidden until an admin publishes it.

A game appears as available only after it has at least one active product with a QRIS image configured. Game availability is derived from the active catalog and QRIS readiness. Add each game's real product names, amounts, prices, and QRIS image in `/admin`. Do not use preview prices as live prices.

Customers can optionally attach one PNG, JPG, or WEBP photo (up to 2 MB) to a review. Photos use the public `review-photos` bucket and appear after the review is published.

QRIS images are public so checkout can display them. Payment proofs are in a private bucket; admin requests use short-lived signed URLs. The service-role key is read by server-only route code and must never be added to `NEXT_PUBLIC_*` variables.

## 3. Vercel deployment

1. Import the repository into Vercel and keep the framework preset as **Next.js**.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` under Vercel **Project Settings → Environment Variables** for Production and Preview as appropriate.
3. Deploy. Vercel builds with `npm run build`; no custom output directory is needed.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the production Vercel domain and add the production domain plus any preview domain pattern to Redirect URLs.

Supabase credentials are not included in this repository. The database migration and Vercel settings must be applied to the user's projects before live order processing works.

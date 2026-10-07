# Dyvnn Store

Dyvnn Store is a Next.js 15 game top-up storefront with Supabase-backed catalog, manual QRIS payments, order tracking, customer reviews, and a protected admin panel.

## Local development

```bash
npm install
npm run dev
```

Fill `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is server-only and must not use a `NEXT_PUBLIC_` prefix.

## Supabase setup

See [`supabase/DEPLOYMENT.md`](supabase/DEPLOYMENT.md) for database migration, first-admin bootstrap, storage buckets, and Vercel settings. The SQL migration seeds the five games and starter product prices. Orders use the active product price in the database, upload proof into a private bucket, and expose status through an unguessable order token. Only completed orders can create one review; reviews are hidden until an admin publishes them.

## Admin

Open `/admin`. Admin sign-up is disabled. Create the initial account in Supabase Auth and add its user ID to `public.admins` as described in the deployment guide. The panel manages products/prices, QRIS image, payment confirmation and order status, review moderation, revenue, popular games, and visitor analytics.

## Scripts

- `npm run dev` — local Next.js development server
- `npm run typecheck` — TypeScript validation
- `npm run build` — production build
- `npm start` — production server

The interface remains the supplied Dyvnn Store design. Store artwork is local under `public/images`; see [`ASSET-SOURCES.md`](ASSET-SOURCES.md).

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { getErrorMessage } from '@/lib/errors';

const reviewSchema = z.object({
  orderId: z.string().uuid(), publicToken: z.string().uuid(),
  displayName: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5), comment: z.string().trim().min(8).max(1000),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('reviews')
      .select('id,display_name,rating,comment,created_at,games(name)')
      .eq('is_published', true).order('created_at', { ascending: false }).limit(12);
    if (error) throw error;
    return NextResponse.json({ reviews: data });
  } catch (error) {
    console.error('[Dyvnn Store] Published reviews unavailable:', error);
    return NextResponse.json({ error: 'Review Supabase belum tersedia.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(request, 'reviews', 3, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Batas pengiriman review tercapai. Coba lagi nanti.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Isi nama, rating, dan ulasan dengan benar.' }, { status: 400 });
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('submit_store_review', {
      p_order_id: parsed.data.orderId, p_public_token: parsed.data.publicToken,
      p_display_name: parsed.data.displayName, p_rating: parsed.data.rating, p_comment: parsed.data.comment,
    });
    if (error) throw error;
    return NextResponse.json({ id: data, message: 'Ulasan tersimpan dan menunggu moderasi.' }, { status: 201 });
  } catch (error) {
    console.error('[Dyvnn Store] Review creation failed:', error);
    const detail = getErrorMessage(error);
    const knownErrors: Record<string, string> = {
      ORDER_NOT_REVIEWABLE: 'Ulasan hanya dapat dikirim setelah pesanan selesai.',
      ORDER_ALREADY_REVIEWED: 'Ulasan untuk pesanan ini sudah pernah dikirim.',
      REVIEW_ALREADY_EXISTS: 'Ulasan untuk pesanan ini sudah pernah dikirim.',
    };
    const code = Object.keys(knownErrors).find((value) => detail.includes(value));
    if (code) return NextResponse.json({ error: knownErrors[code] }, { status: 409 });
    return NextResponse.json({ error: 'Ulasan belum dapat dikirim. Silakan coba lagi nanti.' }, { status: 503 });
  }
}

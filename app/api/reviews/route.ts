import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { getErrorMessage } from '@/lib/errors';
import { randomUUID } from 'node:crypto';

const reviewSchema = z.object({
  orderId: z.string().uuid(), publicToken: z.string().uuid(),
  displayName: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5), comment: z.string().trim().min(8).max(1000),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('reviews')
      .select('id,display_name,rating,comment,photo_url,created_at,games(name)')
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
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Form review tidak valid.' }, { status: 400 });
  const parsed = reviewSchema.safeParse({ orderId: form.get('orderId'), publicToken: form.get('publicToken'), displayName: form.get('displayName'), rating: Number(form.get('rating')), comment: form.get('comment') });
  const file = form.get('photo');
  if (!parsed.success || (file !== null && !(file instanceof File))) return NextResponse.json({ error: 'Isi nama, rating, dan ulasan dengan benar.' }, { status: 400 });
  let photoUrl: string | null = null;
  let photoPath: string | null = null;
  if (file instanceof File) {
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Foto maksimal 2 MB.' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = detectImage(bytes);
    if (!image) return NextResponse.json({ error: 'Pilih foto PNG, JPG, atau WEBP yang valid.' }, { status: 400 });
    const supabase = createAdminClient();
    photoPath = `${parsed.data.orderId}/${randomUUID()}.${image.extension}`;
    const { error } = await supabase.storage.from('review-photos').upload(photoPath, bytes, { contentType: image.contentType, upsert: false });
    if (error) return NextResponse.json({ error: 'Foto review gagal diunggah.' }, { status: 500 });
    photoUrl = supabase.storage.from('review-photos').getPublicUrl(photoPath).data.publicUrl;
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('submit_store_review', {
      p_order_id: parsed.data.orderId, p_public_token: parsed.data.publicToken,
      p_display_name: parsed.data.displayName, p_rating: parsed.data.rating, p_comment: parsed.data.comment, p_photo_url: photoUrl,
    });
    if (error) throw error;
    return NextResponse.json({ id: data, message: 'Ulasan tersimpan dan menunggu moderasi.' }, { status: 201 });
  } catch (error) {
    if (photoPath) await createAdminClient().storage.from('review-photos').remove([photoPath]);
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

function detectImage(bytes: Uint8Array): { extension: string; contentType: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return { extension: 'png', contentType: 'image/png' };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return { extension: 'webp', contentType: 'image/webp' };
  return null;
}

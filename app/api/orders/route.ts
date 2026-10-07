import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSessionClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { getErrorMessage } from '@/lib/errors';

const orderSchema = z.object({
  productId: z.string().uuid(),
  userGameId: z.string().trim().regex(/^\d{5,15}$/, 'User ID harus berupa 5–15 digit angka.'),
  serverId: z.string().trim().regex(/^(?:\d{1,6})?$/, 'Server ID harus berupa 1–6 digit angka.').optional().or(z.literal('')),
  customerName: z.string().trim().max(80, 'Nama maksimal 80 karakter.').optional().or(z.literal('')),
  email: z.string().email().max(254).optional().or(z.literal('')),
});

const orderErrors: Record<string, string> = {
  PRODUCT_NOT_AVAILABLE: 'Produk ini tidak tersedia atau sudah dinonaktifkan.',
  GAME_NOT_AVAILABLE: 'Game ini belum tersedia untuk top up.',
  QRIS_NOT_READY: 'Pembayaran untuk produk ini belum siap. Silakan coba lagi nanti.',
};

function getOrderErrorMessage(error: unknown) {
  const detail = getErrorMessage(error);
  const code = Object.keys(orderErrors).find((value) => detail.includes(value));
  return code ? { message: orderErrors[code], status: 409 } : null;
}

export async function POST(request: Request) {
  const limit = rateLimit(request, 'orders', 8, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan membuat order. Coba lagi nanti.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  const input = orderSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Periksa kembali produk dan User ID.' }, { status: 400 });

  try {
    const sessionClient = await createSessionClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    const supabase = createAdminClient();
    const { data: product, error: productError } = await supabase.from('products').select('game_id').eq('id', input.data.productId).maybeSingle();
    if (productError) throw productError;
    if (!product) return NextResponse.json({ error: orderErrors.PRODUCT_NOT_AVAILABLE }, { status: 409 });
    const { data: game, error: gameError } = await supabase.from('games').select('slug').eq('id', product.game_id).maybeSingle();
    if (gameError) throw gameError;
    if (game?.slug === 'mlbb' && !input.data.serverId) {
      return NextResponse.json({ error: 'Server ID wajib diisi untuk Mobile Legends.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('create_store_order', {
      p_product_id: input.data.productId,
      p_user_game_id: input.data.userGameId,
      p_server_id: input.data.serverId || null,
      p_customer_email: input.data.email || null,
      p_customer_name: input.data.customerName || null,
      p_user_id: user?.id ?? null,
    });
    if (error) throw error;
    const order = Array.isArray(data) ? data[0] : data;
    if (!order) return NextResponse.json({ error: 'Produk sudah tidak tersedia.' }, { status: 409 });
    const qrisUrl = order.qris_image_path
      ? supabase.storage.from('qris-codes').getPublicUrl(order.qris_image_path).data.publicUrl
      : null;
    return NextResponse.json({ order, qrisUrl }, { status: 201 });
  } catch (error) {
    const knownError = getOrderErrorMessage(error);
    if (knownError) return NextResponse.json({ error: knownError.message }, { status: knownError.status });
    console.error('[Dyvnn Store] Order creation failed:', error);
    return NextResponse.json({ error: 'Order belum dapat dibuat. Pastikan migrasi dan variabel Supabase sudah siap.' }, { status: 503 });
  }
}

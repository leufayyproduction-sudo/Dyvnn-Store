import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStoreAdmin } from '@/lib/supabase/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { getErrorMessage } from '@/lib/errors';

type Context = { params: Promise<{ resource: string }> };

async function guard() {
  const admin = await getStoreAdmin();
  if (!admin) return { response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  return { admin };
}

export async function GET(_request: Request, { params }: Context) {
  const access = await guard();
  if (access.response) return access.response;
  const { resource } = await params;
  if (resource === 'analytics') {
    const limit = rateLimit(_request, 'admin-analytics', 120, 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Analytics rate limit exceeded.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  }
  const supabase = createAdminClient();

  try {
    if (resource === 'dashboard' || resource === 'analytics') {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [ordersResult, productsResult, visitsResult] = await Promise.all([
        supabase.from('orders').select('id,status,price_idr,game_id,game_name,created_at').gte('created_at', since),
        supabase.from('products').select('id,is_active'),
        supabase.from('store_visits').select('session_id').gte('visited_at', since),
      ]);
      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;
      if (visitsResult.error) throw visitsResult.error;
      const orders = ordersResult.data ?? [];
      const paidOrders = orders.filter((order) => ['paid','processing','completed'].includes(order.status));
      const byGame = new Map<string, { name: string; count: number; revenue: number }>();
      for (const order of orders) {
        const game = byGame.get(order.game_id) ?? { name: order.game_name, count: 0, revenue: 0 };
        game.count += 1;
        if (['paid','processing','completed'].includes(order.status)) game.revenue += order.price_idr;
        byGame.set(order.game_id, game);
      }
      return NextResponse.json({
        revenue: paidOrders.reduce((sum, order) => sum + order.price_idr, 0),
        orders: orders.length, pending: orders.filter((order) => order.status === 'proof_submitted').length,
        visitors: new Set((visitsResult.data ?? []).map((visit) => visit.session_id)).size,
        activeProducts: (productsResult.data ?? []).filter((product) => product.is_active).length,
        popularGames: [...byGame.entries()].map(([id, value]) => ({ id, ...value })).sort((a,b) => b.count-a.count),
        recentOrders: orders.sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,8),
      });
    }
    if (resource === 'products') {
      const { data, error } = await supabase.from('products').select('*,games(name)').order('created_at', { ascending: false });
      if (error) throw error;
      const { data: games, error: gamesError } = await supabase.from('games').select('id,name').order('name');
      if (gamesError) throw gamesError;
      return NextResponse.json({ products: data, games });
    }
    if (resource === 'orders') {
      const { data, error } = await supabase.from('orders').select('*,payments(status,proof_path,admin_note)').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      const orders = await Promise.all((data ?? []).map(async (order) => {
        const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
        const signed = payment?.proof_path
          ? await supabase.storage.from('payment-proofs').createSignedUrl(payment.proof_path, 900)
          : null;
        return { ...order, payment_proof_url: signed?.data?.signedUrl ?? null };
      }));
      return NextResponse.json({ orders });
    }
    if (resource === 'qris') {
      const { data, error } = await supabase.from('products').select('id,name,game_id,qris_image_path,games(name)').order('name');
      if (error) throw error;
      const products = (data ?? []).map((product) => ({
        ...product,
        qrisUrl: product.qris_image_path ? supabase.storage.from('qris-codes').getPublicUrl(product.qris_image_path).data.publicUrl : null,
      }));
      return NextResponse.json({ products });
    }
    if (resource === 'reviews') {
      const { data, error } = await supabase.from('reviews').select('*,games(name),orders(order_number)').order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ reviews: data });
    }
    return NextResponse.json({ error: 'Unknown admin resource.' }, { status: 404 });
  } catch (error) {
    console.error(`[Dyvnn Store] Admin ${resource} read failed:`, error);
    return NextResponse.json({ error: 'Gagal memuat data. Periksa migrasi Supabase dan konfigurasi server.' }, { status: 503 });
  }
}

const productSchema = z.object({
  gameId: z.string().min(1).max(80), name: z.string().trim().min(2).max(100),
  amount: z.coerce.number().int().positive(), priceIdr: z.coerce.number().int().positive(),
  bonus: z.string().trim().max(100).optional().or(z.literal('')),
});

const adminOrderErrors: Record<string, string> = {
  ADMIN_REQUIRED: 'Akun ini tidak memiliki hak administrator.',
  INVALID_ORDER_STATUS: 'Status order yang dipilih tidak valid.',
  PAYMENT_PROOF_REQUIRED: 'Bukti pembayaran belum diterima. Minta pelanggan mengunggah bukti terlebih dahulu.',
  PAYMENT_MUST_BE_CONFIRMED: 'Konfirmasi pembayaran sebelum order diproses atau diselesaikan.',
  ORDER_ALREADY_FINAL: 'Order sudah selesai dan tidak dapat diubah lagi.',
};

export async function POST(request: Request, { params }: Context) {
  const access = await guard();
  if (access.response) return access.response;
  const { resource } = await params;
  const supabase = createAdminClient();

  if (resource === 'products') {
    const input = productSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: 'Lengkapi game, nama, jumlah, dan harga yang valid.' }, { status: 400 });
    const { data, error } = await supabase.from('products').insert({
      game_id: input.data.gameId, name: input.data.name, amount: input.data.amount,
      price_idr: input.data.priceIdr, bonus: input.data.bonus || null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message.includes('duplicate') ? 'Nama produk sudah digunakan untuk game ini.' : 'Gagal menambahkan produk.' }, { status: 400 });
    return NextResponse.json({ product: data }, { status: 201 });
  }

  if (resource === 'qris') {
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    const productId = z.string().uuid().safeParse(form?.get('productId'));
    if (!(file instanceof File) || !productId.success || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Pilih produk dan gambar QRIS maksimal 2 MB.' }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    const image = png ? { extension: 'png', contentType: 'image/png' } : jpeg ? { extension: 'jpg', contentType: 'image/jpeg' } : webp ? { extension: 'webp', contentType: 'image/webp' } : null;
    if (!image) return NextResponse.json({ error: 'Isi file harus berupa gambar PNG, JPG, atau WEBP yang valid.' }, { status: 400 });
    const { data: product, error: productError } = await supabase.from('products').select('id,qris_image_path').eq('id', productId.data).maybeSingle();
    if (productError || !product) return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    const path = `${product.id}/${randomUUID()}.${image.extension}`;
    const { error } = await supabase.storage.from('qris-codes').upload(path, bytes, { contentType: image.contentType, upsert: false });
    if (error) return NextResponse.json({ error: 'Gagal mengunggah QRIS.' }, { status: 500 });
    const { error: updateError } = await supabase.from('products').update({ qris_image_path: path }).eq('id', product.id);
    if (updateError) {
      await supabase.storage.from('qris-codes').remove([path]);
      return NextResponse.json({ error: 'QRIS terunggah, tetapi gagal ditautkan ke produk.' }, { status: 500 });
    }
    if (product.qris_image_path) {
      const { error: cleanupError } = await supabase.storage.from('qris-codes').remove([product.qris_image_path]);
      if (cleanupError) console.warn('[Dyvnn Store] Old product QRIS cleanup failed:', cleanupError.message);
    }
    return NextResponse.json({ success: true, path });
  }
  return NextResponse.json({ error: 'Unsupported admin action.' }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const access = await guard();
  if (access.response) return access.response;
  const { resource } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  const supabase = createAdminClient();

  if (resource === 'products') {
    const input = z.object({ id: z.string().uuid(), priceIdr: z.number().int().positive().optional(), isActive: z.boolean().optional(), name: z.string().trim().min(2).max(100).optional(), bonus: z.string().trim().max(100).nullable().optional() }).safeParse(body);
    if (!input.success || Object.keys(input.data ?? {}).length <= 1) return NextResponse.json({ error: 'Harga atau status produk tidak valid.' }, { status: 400 });
    const { id, priceIdr, isActive, ...rest } = input.data;
    const update: Record<string, unknown> = { ...rest };
    if (priceIdr !== undefined) update.price_idr = priceIdr;
    if (isActive !== undefined) update.is_active = isActive;
    const { error } = await supabase.from('products').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: 'Perubahan produk gagal disimpan.' }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (resource === 'orders') {
    const input = z.object({ id: z.string().uuid(), status: z.enum(['pending_payment','proof_submitted','paid','processing','completed','rejected','cancelled']), adminNote: z.string().max(300).optional() }).safeParse(body);
    if (!input.success) return NextResponse.json({ error: 'Status order tidak valid.' }, { status: 400 });
    const { data, error } = await supabase.rpc('admin_set_order_status', {
      p_order_id: input.data.id, p_status: input.data.status,
      p_admin_id: access.admin.id, p_admin_note: input.data.adminNote ?? null,
    });
    if (error) {
      console.error('[Dyvnn Store] Admin order status update failed:', error);
      const detail = getErrorMessage(error);
      const code = Object.keys(adminOrderErrors).find((value) => detail.includes(value));
      return NextResponse.json({ error: code ? adminOrderErrors[code] : 'Status order gagal diperbarui.' }, { status: code === 'ADMIN_REQUIRED' ? 403 : 400 });
    }
    if (data !== true) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  if (resource === 'reviews') {
    const input = z.object({ id: z.string().uuid(), isPublished: z.boolean() }).safeParse(body);
    if (!input.success) return NextResponse.json({ error: 'Status review tidak valid.' }, { status: 400 });
    const { error } = await supabase.from('reviews').update({ is_published: input.data.isPublished }).eq('id', input.data.id);
    if (error) return NextResponse.json({ error: 'Moderasi review gagal disimpan.' }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Unsupported admin action.' }, { status: 404 });
}

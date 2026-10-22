import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = z.string().uuid().safeParse(new URL(request.url).searchParams.get('token'));
  if (!z.string().uuid().safeParse(id).success || !token.success) {
    return NextResponse.json({ error: 'Link order tidak valid.' }, { status: 400 });
  }
  try {
    const supabase = createAdminClient();
    const { data: order, error } = await supabase.from('orders')
      .select('id,order_number,product_name,game_name,amount,price_idr,user_game_id,server_id,status,created_at,products(qris_image_path),payments(status)')
      .eq('id', id).eq('public_token', token.data).maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    const product = Array.isArray(order.products) ? order.products[0] : order.products;
    const qrisUrl = product?.qris_image_path
      ? supabase.storage.from('qris-codes').getPublicUrl(product.qris_image_path).data.publicUrl
      : null;
    return NextResponse.json({ order, qrisUrl });
  } catch (error) {
    console.error('[Dyvnn Store] Order lookup failed:', error);
    return NextResponse.json({ error: 'Status order belum tersedia. Periksa koneksi Supabase.' }, { status: 503 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: game, error: gameError } = await supabase
      .from('games').select('id,slug,name,publisher,category,currency,image_url,accent_color,is_active,status,description')
      .eq('slug', slug).eq('is_active', true).eq('status', 'active').maybeSingle();
    if (gameError) throw gameError;
    if (!game) return NextResponse.json({ error: 'Game tidak ditemukan.' }, { status: 404 });

    const { data: products, error: productsError } = await supabase
      .from('products').select('id,game_id,name,amount,bonus,price_idr,sort_order,qris_image_path')
      .eq('game_id', game.id).eq('is_active', true).order('sort_order');
    if (productsError) throw productsError;

    const withQris = (products ?? []).map((product) => ({
      ...product,
      qrisUrl: product.qris_image_path ? supabase.storage.from('qris-codes').getPublicUrl(product.qris_image_path).data.publicUrl : null,
    }));
    return NextResponse.json({ game, products: withQris });
  } catch (error) {
    console.error('[Dyvnn Store] Failed to load game catalog:', error);
    return NextResponse.json({ error: 'Katalog Supabase belum siap. Periksa konfigurasi env dan jalankan migrasi database.' }, { status: 503 });
  }
}

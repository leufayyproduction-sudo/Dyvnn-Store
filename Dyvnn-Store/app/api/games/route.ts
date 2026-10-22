import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const [{ data: games, error: gameError }, { data: products, error: productError }, { data: reviews, error: reviewError }] = await Promise.all([
      supabase.from('games').select('id,slug,name,shortName:name,publisher,category,image:image_url,color:accent_color,currency,is_active,status,description').eq('is_active', true).order('name'),
      supabase.from('products').select('id,game_id,name,price_idr,is_active').eq('is_active', true),
      supabase.from('reviews').select('game_id,rating').eq('is_published', true),
    ]);
    if (gameError) throw gameError;
    if (productError) throw productError;
    if (reviewError) throw reviewError;
    const enriched = (games ?? []).map((game) => {
      const gameProducts = (products ?? []).filter((product) => product.game_id === game.id);
      const gameReviews = (reviews ?? []).filter((review) => review.game_id === game.id);
      const cheapest = gameProducts.length ? Math.min(...gameProducts.map((product) => product.price_idr)) : null;
      const rating = gameReviews.length ? (gameReviews.reduce((total, review) => total + review.rating, 0) / gameReviews.length).toFixed(1) : '—';
      return { ...game, available: game.status === 'active' && gameProducts.length > 0, rating, price: cheapest?.toLocaleString('id-ID') ?? '' };
    });
    return NextResponse.json({ games: enriched });
  } catch (error) {
    console.error('[Dyvnn Store] Public game catalog unavailable:', error);
    return NextResponse.json({ error: 'Katalog Supabase belum siap.' }, { status: 503 });
  }
}

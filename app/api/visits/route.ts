import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

const visitSchema = z.object({
  sessionId: z.string().uuid(),
  route: z.string().refine((value) => value === '/' || /^\/games\/[a-z0-9-]+$/.test(value), 'Route is not a storefront page.'),
});

export async function POST(request: Request) {
  const limit = rateLimit(request, 'analytics', 120, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Visit rate limit exceeded.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  const parsed = visitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid visit event.' }, { status: 400 });
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('store_visits').upsert(
      { session_id: parsed.data.sessionId, route: parsed.data.route },
      { onConflict: 'session_id,route,visit_day', ignoreDuplicates: true },
    );
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error) {
    console.error('[Dyvnn Store] Visitor tracking unavailable:', error);
    return NextResponse.json({ error: 'Analytics database is not configured.' }, { status: 503 });
  }
}

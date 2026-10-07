import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export async function middleware(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser verifies the session with Supabase Auth and refreshes expired tokens.
  const { data: { user } } = await supabase.auth.getUser();
  const withRefreshedCookies = (target: NextResponse) => {
    response.cookies.getAll().forEach(({ name, value, ...options }) => target.cookies.set(name, value, options));
    return target;
  };
  const pathname = request.nextUrl.pathname;
  const isAdminApi = pathname.startsWith('/api/admin/');
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  if (!isAdminApi && (!isAdminPage || pathname === '/admin/login')) return response;

  if (!user) {
    if (isAdminApi) return withRefreshedCookies(NextResponse.json({ error: 'Admin access required.' }, { status: 403 }));
    const loginUrl = new URL('/admin/login', request.url);
    return withRefreshedCookies(NextResponse.redirect(loginUrl));
  }

  const { data: admin, error } = await supabase.from('admins').select('user_id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
  if (error || !admin) return withRefreshedCookies(new NextResponse('Forbidden', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};

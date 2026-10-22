import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from './env';

/** Use only in trusted server code or Route Handlers. Never expose this client to the browser. */
export function createAdminClient() {
  const { url } = getSupabasePublicEnv();

  return createSupabaseClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

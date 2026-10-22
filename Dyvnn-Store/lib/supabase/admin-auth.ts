import 'server-only';

import { createClient } from './server';

export async function getStoreAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: admin } = await supabase
    .from('admins')
    .select('role,is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  return admin ? { id: user.id, email: user.email ?? '', role: admin.role as string } : null;
}
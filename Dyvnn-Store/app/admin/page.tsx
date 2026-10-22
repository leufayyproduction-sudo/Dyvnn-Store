import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { getStoreAdmin } from '@/lib/supabase/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getStoreAdmin();
  if (!admin) redirect('/admin/login');
  return <AdminDashboard email={admin.email} />;
}

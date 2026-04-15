import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { checkEnv } from '@/lib/utils/check-env';
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import('./AdminDashboard').then(m => m.AdminDashboard), {
  ssr: false,
});

export default async function AdminPage() {
  const admin = await isAdmin();
  if (!admin) redirect('/my');

  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: totalUsers },
    { count: totalNodes },
    { count: unresolvedCount },
    { data: costToday },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('data_nodes').select('*', { count: 'exact', head: true }),
    supabase.from('unresolved_entities').select('*', { count: 'exact', head: true }).eq('resolution_status', 'pending'),
    supabase.from('api_cost_log').select('cost_usd').gte('created_at', today.toISOString()),
  ]);

  const totalCostToday = costToday?.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0) ?? 0;

  const serviceStatus = checkEnv();

  return (
    <AdminDashboard
      stats={{
        totalUsers: totalUsers ?? 0,
        totalNodes: totalNodes ?? 0,
        unresolvedCount: unresolvedCount ?? 0,
        costToday: totalCostToday,
      }}
      serviceStatus={serviceStatus}
    />
  );
}

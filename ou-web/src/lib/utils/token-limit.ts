import { SupabaseClient } from '@supabase/supabase-js';

const PLAN_LIMITS: Record<string, number> = {
  guest: 10,     // 10 turns total (not daily)
  free: 50,      // 50 turns/day
  pro: 500,      // 500 turns/day
  team: 999999,  // unlimited
};

export async function checkTokenLimit(
  supabase: SupabaseClient,
  userId: string | null,
  plan: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (!userId) {
    // Guest - handled client-side
    return { allowed: true, used: 0, limit: PLAN_LIMITS.guest };
  }

  const today = new Date().toISOString().split('T')[0];

  const { count } = await supabase
    .from('token_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`);

  const used = count || 0;
  return { allowed: used < limit, used, limit };
}

export function getPlanLimits() {
  return PLAN_LIMITS;
}

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? 'unknown';

  await supabase.from('api_audit_log').insert({
    admin_id: user?.id,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ip_address: ip,
  });
}

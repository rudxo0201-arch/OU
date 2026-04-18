import { createClient as createServerClient } from '@supabase/supabase-js';

/**
 * Service Role 클라이언트 — RLS 우회 (서버사이드 only)
 * API Route에서만 사용할 것
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }

  return createServerClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

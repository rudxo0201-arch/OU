import { createClient } from '@/lib/supabase/server';

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;

  return isAdminEmail(user.email);
}

/**
 * 이메일로 관리자 여부 판별 (서버사이드)
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) ?? [];
  if (adminEmails.includes(email)) return true;

  const adminDomain = process.env.ADMIN_EMAIL_DOMAIN || 'ouuniverse.com';
  return email.endsWith(`@${adminDomain}`);
}

/**
 * userId + supabase로 관리자 여부 판별 (서버사이드)
 */
export async function isAdminUserId(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (!profile?.email) return false;
  return isAdminEmail(profile.email);
}

'use client';
import { useAuthStore } from '@/stores/authStore';
import { createClient } from '@/lib/supabase/client';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean);
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN ?? 'ouuniverse.com';

export function useAuth() {
  const { user, isLoading } = useAuthStore();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isAdmin = user?.email
    ? ADMIN_EMAILS.includes(user.email) || user.email.endsWith(`@${ADMIN_DOMAIN}`)
    : false;

  return { user, isLoading, signOut, isAdmin };
}

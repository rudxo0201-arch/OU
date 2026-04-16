import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TryClient } from './TryClient';

export default async function TryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 로그인 사용자 → /my
  if (user) redirect('/my');

  return <TryClient />;
}

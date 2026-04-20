import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import InvitePage from './InvitePage';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createClient();

  const { data: share } = await supabase
    .from('profile_shares')
    .select('shared_fields')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('used_at', null)
    .single();

  if (!share) return { title: 'OU — 초대' };

  const fields = share.shared_fields as Record<string, string>;
  const name = fields.name || '누군가';

  return {
    title: `${name}님의 프로필 — OU`,
    description: `${name}님이 OU로 초대했어요. 가입하면 프로필이 자동으로 등록돼요.`,
  };
}

export default async function Page({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: share } = await supabase
    .from('profile_shares')
    .select('id, shared_fields, expires_at, used_at')
    .eq('token', token)
    .single();

  if (!share) notFound();

  // 만료 또는 사용됨
  const expired = new Date(share.expires_at) < new Date();
  const used = !!share.used_at;

  return (
    <InvitePage
      token={token}
      sharedFields={share.shared_fields as Record<string, string>}
      expired={expired}
      used={used}
    />
  );
}

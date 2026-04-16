import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { UsersThree } from '@phosphor-icons/react/dist/ssr';
import { JoinButton } from './JoinButton';

export default async function JoinPage({ params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Look up invite
  const { data: invite } = await supabase
    .from('group_invites')
    .select('*, groups(id, name, description)')
    .eq('token', params.token)
    .single();

  if (!invite || !invite.groups) return notFound();

  // Check if invite expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <div style={{ padding: '80px 24px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>초대가 만료되었습니다.</span>
          <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>새 초대 링크를 요청해 주세요.</span>
        </div>
      </div>
    );
  }

  const group = invite.groups as { id: string; name: string; description: string | null };

  // If not logged in, redirect to login with return URL
  if (!user) {
    redirect(`/login?next=/join/${params.token}`);
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    redirect(`/groups/${group.id}`);
  }

  return (
    <div style={{ padding: '80px 24px', maxWidth: 480, margin: '0 auto' }}>
      <div
        style={{ padding: 24, borderRadius: 8, border: '0.5px solid #d1d5db' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <UsersThree size={48} weight="thin" color="#9ca3af" />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <h3 style={{ margin: 0, fontWeight: 600 }}>{group.name}</h3>
            {group.description && (
              <span style={{ fontSize: 14, color: 'var(--color-dimmed)', textAlign: 'center' }}>{group.description}</span>
            )}
          </div>

          <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>이 그룹에 참가하시겠습니까?</span>

          <JoinButton groupId={group.id} />
        </div>
      </div>
    </div>
  );
}

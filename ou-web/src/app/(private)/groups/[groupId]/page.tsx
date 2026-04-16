import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { UserPlus, UsersThree } from '@phosphor-icons/react/dist/ssr';

async function handleInvite(formData: FormData) {
  'use server';
  const groupId = formData.get('groupId') as string;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/groups/${groupId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  return data;
}

export default async function GroupDetailPage({ params }: { params: { groupId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', params.groupId)
    .single();

  if (!group) return notFound();

  // Check membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', params.groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) return notFound();

  // Get members
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, profiles(display_name, avatar_url)')
    .eq('group_id', params.groupId)
    .order('joined_at', { ascending: true });

  // Get group DataNodes
  const { data: nodes } = await supabase
    .from('data_nodes')
    .select('id, title, domain, created_at, confidence')
    .eq('group_id', params.groupId)
    .order('created_at', { ascending: false })
    .limit(20);

  const isOwner = membership.role === 'owner';

  return (
    <div style={{ padding: '16px 24px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 style={{ margin: 0, fontWeight: 600 }}>{group.name}</h2>
            {group.description && (
              <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>{group.description}</span>
            )}
          </div>
          {isOwner && (
            <a
              href={`/api/groups/${params.groupId}/invite`}
              data-method="POST"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                border: '0.5px solid #1a1a1a', borderRadius: 6, fontSize: 14, color: '#1a1a1a',
                textDecoration: 'none', cursor: 'pointer',
              }}
            >
              <UserPlus size={16} /> 초대하기
            </a>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: 0 }} />

        {/* Members */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UsersThree size={18} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>멤버 ({members?.length || 0})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members?.map((member) => {
              const profileArr = member.profiles as unknown as { display_name: string | null; avatar_url: string | null }[] | null;
              const profile = profileArr?.[0] ?? null;
              return (
                <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, overflow: 'hidden',
                    }}
                  >
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (profile?.display_name?.[0] || '?')
                    }
                  </div>
                  <span style={{ fontSize: 14 }}>{profile?.display_name || '알 수 없음'}</span>
                  <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 12, border: '0.5px solid #9ca3af', color: '#6b7280' }}>
                    {member.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: 0 }} />

        {/* DataNodes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>기록 ({nodes?.length || 0})</span>
          {(!nodes || nodes.length === 0) ? (
            <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>아직 등록된 기록이 없습니다.</span>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
              {nodes.map((node) => (
                <div
                  key={node.id}
                  style={{ padding: 16, borderRadius: 8, border: '0.5px solid #d1d5db' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.title || node.id}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {node.domain && (
                        <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 12, border: '0.5px solid #9ca3af', color: '#6b7280' }}>
                          {node.domain}
                        </span>
                      )}
                      {node.confidence && (
                        <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 12, border: '0.5px solid #9ca3af', color: '#6b7280' }}>
                          {node.confidence}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

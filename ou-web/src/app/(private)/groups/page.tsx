import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UsersThree, Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: memberships } = await supabase
    .from('group_members')
    .select('role, groups(id, name, description, created_at)')
    .eq('user_id', user.id);

  // Get member counts for each group
  type GroupRow = { id: string; name: string; description: string | null; created_at: string };
  const groups = memberships?.map((m) => ({
    ...(m.groups as unknown as GroupRow),
    role: m.role as string,
  })) ?? [];

  const groupIds = groups.map((g) => g.id);

  const { data: memberCounts } = groupIds.length > 0
    ? await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds)
    : { data: [] };

  const countMap: Record<string, number> = {};
  memberCounts?.forEach((mc) => {
    countMap[mc.group_id] = (countMap[mc.group_id] || 0) + 1;
  });

  return (
    <div style={{ padding: '16px 24px', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontWeight: 600 }}>그룹</h2>
        <Link
          href="/groups/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            border: '0.5px solid #1a1a1a', borderRadius: 6, fontSize: 14, color: '#1a1a1a',
            textDecoration: 'none',
          }}
        >
          <Plus size={16} /> 새 그룹 만들기
        </Link>
      </div>

      {groups.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 8 }}>
          <UsersThree size={48} weight="thin" color="#9ca3af" />
          <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>아직 그룹이 없어요</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              style={{
                padding: 20,
                borderRadius: 8,
                border: '0.5px solid #d1d5db',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{group.name}</span>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, border: '0.5px solid #9ca3af', color: '#6b7280' }}>
                    {group.role}
                  </span>
                </div>
                {group.description && (
                  <span style={{ fontSize: 14, color: 'var(--color-dimmed)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {group.description}
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UsersThree size={14} color="#9ca3af" />
                  <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>
                    {countMap[group.id] || 0}명
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

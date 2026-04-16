import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/nodes/migrate-guest
 * 게스트 채팅에서 생성된 노드 데이터를 로그인 사용자의 DB에 저장
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { nodes } = await req.json();
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return NextResponse.json({ migrated: 0 });
  }

  // 최대 50개만 허용 (악용 방지)
  const toMigrate = nodes.slice(0, 50);

  const rows = toMigrate.map((n: any) => ({
    user_id: user.id,
    raw: n.content?.slice(0, 2000) ?? '',
    domain: n.domain ?? 'knowledge',
    domain_data: n.domain_data ?? {},
    confidence: n.confidence ?? 'low',
    source_type: 'guest_migration',
    visibility: 'private',
  }));

  const { data, error } = await supabase
    .from('data_nodes')
    .insert(rows)
    .select('id, domain');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ migrated: data?.length ?? 0, nodes: data });
}

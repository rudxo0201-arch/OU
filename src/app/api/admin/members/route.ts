import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') ?? '1');
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20');
  const search = searchParams.get('search') ?? '';
  const role = searchParams.get('role') ?? '';
  const status = searchParams.get('status') ?? '';

  const db = createAdminClient();

  let query = db
    .from('profiles')
    .select('id, display_name, email, avatar_url, role, created_at, updated_at, verified, user_level', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,handle.ilike.%${search}%`);
  }
  if (role) {
    query = query.eq('role', role);
  }
  if (status === 'banned') {
    query = query.eq('role', 'banned');
  } else if (status === 'deactivated') {
    query = query.eq('role', 'deactivated');
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 각 회원의 노드 수 (간단 집계)
  const members = await Promise.all(
    (data ?? []).map(async (profile) => {
      const { count: nodeCount } = await db
        .from('data_nodes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id);
      return { ...profile, node_count: nodeCount ?? 0 };
    })
  );

  return NextResponse.json({ data: members, total: count ?? 0 });
}

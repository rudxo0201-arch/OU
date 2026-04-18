import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { logAdminAction } from '@/lib/auth/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') ?? '1');
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20');
  const search = searchParams.get('search') ?? '';
  const viewType = searchParams.get('viewType') ?? '';

  const db = createAdminClient();

  let query = db
    .from('saved_views')
    .select('id, user_id, name, view_type, filter_config, layout_config, custom_code, visibility, created_at, updated_at', { count: 'exact' })
    .neq('view_type', 'admin_roles')
    .neq('view_type', 'ux_flow')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) query = query.ilike('name', `%${search}%`);
  if (viewType) query = query.eq('view_type', viewType);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0 });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id, updates } = await request.json();
  if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from('saved_views')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction('view.update', 'saved_views', id, { updates: Object.keys(updates) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { ids } = await request.json();
  if (!ids?.length) return NextResponse.json({ error: 'ids가 필요합니다.' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.from('saved_views').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction('view.delete', 'saved_views', ids.join(','), { count: ids.length });
  return NextResponse.json({ ok: true });
}

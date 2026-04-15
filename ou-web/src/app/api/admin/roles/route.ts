import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { logAdminAction } from '@/lib/auth/audit';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 역할은 별도 테이블 없이 JSON 기반으로 관리
 * saved_views에 view_type='admin_roles'로 저장
 */

const ROLES_VIEW_TYPE = 'admin_roles';
const ROLES_VIEW_NAME = '__system_roles__';

async function getRolesView(db: ReturnType<typeof createAdminClient>) {
  const { data } = await db
    .from('saved_views')
    .select('id, layout_config')
    .eq('view_type', ROLES_VIEW_TYPE)
    .eq('name', ROLES_VIEW_NAME)
    .single();
  return data;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const db = createAdminClient();
  const view = await getRolesView(db);

  const roles = (view?.layout_config as { roles?: unknown[] })?.roles ?? [
    { id: 'admin', name: 'admin', label: '관리자', permissions: ['admin.access'], is_system: true },
    { id: 'member', name: 'member', label: '일반 회원', permissions: ['chat.use', 'data.create', 'data.view_own'], is_system: true },
    { id: 'banned', name: 'banned', label: '차단', permissions: [], is_system: true },
    { id: 'deactivated', name: 'deactivated', label: '비활성', permissions: [], is_system: true },
  ];

  return NextResponse.json({ roles });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { roles } = await request.json();
  const db = createAdminClient();
  const view = await getRolesView(db);

  if (view) {
    await db
      .from('saved_views')
      .update({ layout_config: { roles }, updated_at: new Date().toISOString() })
      .eq('id', view.id);
  } else {
    await db.from('saved_views').insert({
      name: ROLES_VIEW_NAME,
      view_type: ROLES_VIEW_TYPE,
      layout_config: { roles },
      filter_config: {},
      visibility: 'private',
    });
  }

  await logAdminAction('roles.update', 'saved_views', 'system_roles', { count: roles.length });
  return NextResponse.json({ ok: true });
}

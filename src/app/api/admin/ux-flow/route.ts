import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { logAdminAction } from '@/lib/auth/audit';
import { createAdminClient } from '@/lib/supabase/admin';

const UX_FLOW_VIEW_TYPE = 'ux_flow';
const UX_FLOW_VIEW_NAME = '__system_ux_flow__';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const db = createAdminClient();
  const { data } = await db
    .from('saved_views')
    .select('id, layout_config, updated_at')
    .eq('view_type', UX_FLOW_VIEW_TYPE)
    .eq('name', UX_FLOW_VIEW_NAME)
    .single();

  return NextResponse.json({ data: data?.layout_config ?? null, updated_at: data?.updated_at ?? null });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const flowData = await request.json();
  const db = createAdminClient();

  const { data: existing } = await db
    .from('saved_views')
    .select('id')
    .eq('view_type', UX_FLOW_VIEW_TYPE)
    .eq('name', UX_FLOW_VIEW_NAME)
    .single();

  if (existing) {
    await db
      .from('saved_views')
      .update({ layout_config: flowData, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await db.from('saved_views').insert({
      name: UX_FLOW_VIEW_NAME,
      view_type: UX_FLOW_VIEW_TYPE,
      layout_config: flowData,
      filter_config: {},
      visibility: 'private',
    });
  }

  await logAdminAction('ux_flow.save', 'saved_views', 'system_ux_flow');
  return NextResponse.json({ ok: true });
}

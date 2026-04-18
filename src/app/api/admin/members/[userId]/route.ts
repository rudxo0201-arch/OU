import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { logAdminAction } from '@/lib/auth/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { userId } = await params;
  const { action, role } = await request.json();
  const db = createAdminClient();

  let updates: Record<string, unknown> = {};

  switch (action) {
    case 'deactivate':
      updates = { role: 'deactivated' };
      break;
    case 'activate':
      updates = { role: 'member' };
      break;
    case 'ban':
      updates = { role: 'banned' };
      break;
    case 'unban':
      updates = { role: 'member' };
      break;
    case 'change_role':
      if (!role) return NextResponse.json({ error: '역할을 지정하세요.' }, { status: 400 });
      updates = { role };
      break;
    default:
      return NextResponse.json({ error: '알 수 없는 액션입니다.' }, { status: 400 });
  }

  const { error } = await db.from('profiles').update(updates).eq('id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(`member.${action}`, 'profiles', userId, { action, role });
  return NextResponse.json({ ok: true });
}

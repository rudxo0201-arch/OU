import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateApiKey, listApiKeys, revokeApiKey } from '@/lib/auth/api-key';

export const runtime = 'nodejs';

/**
 * GET /api/settings/api-keys — 내 API Key 목록
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await listApiKeys(supabase, user.id);
  return NextResponse.json({ keys });
}

/**
 * POST /api/settings/api-keys — 새 API Key 생성
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const adminSupabase = createAdminClient();
    const result = await generateApiKey(adminSupabase, user.id, name.trim());
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'API key creation failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/api-keys — API Key 폐기
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { keyId } = await req.json();
  if (!keyId) {
    return NextResponse.json({ error: 'keyId is required' }, { status: 400 });
  }

  await revokeApiKey(supabase, user.id, keyId);
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// POST /api/profile-card/invite-reward
// B가 가입 완료 후 A(sharer)에게 초대 성공 보상 지급
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sharerId, shareId } = await request.json();
  if (!sharerId || !shareId) {
    return NextResponse.json({ error: 'sharerId, shareId 필요' }, { status: 400 });
  }

  // 중복 보상 방지: 같은 shareId로 이미 보상했는지 확인
  const { data: existing } = await supabase
    .from('uni_transactions')
    .select('id')
    .eq('user_id', sharerId)
    .eq('type', 'invite_success')
    .eq('ref_id', shareId)
    .single();

  if (existing) return NextResponse.json({ ok: true, skipped: true });

  // Admin 클라이언트로 sharer에게 유니 적립 (다른 사용자의 balance 수정)
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('uni_balance')
    .eq('id', sharerId)
    .single();

  await adminSupabase.from('uni_transactions').insert({
    user_id: sharerId,
    amount: 300,
    type: 'invite_success',
    ref_id: shareId,
    memo: '친구 초대 성공',
  });

  await adminSupabase
    .from('profiles')
    .update({ uni_balance: (profile?.uni_balance ?? 0) + 300 })
    .eq('id', sharerId);

  return NextResponse.json({ ok: true });
}

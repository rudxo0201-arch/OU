import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addUni, type UniRewardType } from '@/lib/uni/reward';

// GET /api/uni — 잔액 + 최근 트랜잭션 조회
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: profile }, { data: txs }] = await Promise.all([
    supabase.from('profiles').select('uni_balance').eq('id', user.id).single(),
    supabase
      .from('uni_transactions')
      .select('id, amount, type, memo, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    balance: profile?.uni_balance ?? 0,
    transactions: txs ?? [],
  });
}

// POST /api/uni — 유니 적립
// body: { type: UniRewardType, amount?: number, refId?: string, memo?: string }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, amount, refId, memo } = await request.json();

  const REWARD_AMOUNTS: Record<UniRewardType, number> = {
    signup_bonus: 1000,
    invite_success: 300,
    accuracy_swipe: 5,
  };

  const finalAmount = amount ?? REWARD_AMOUNTS[type as UniRewardType];
  if (!finalAmount) return NextResponse.json({ error: '유효하지 않은 보상 타입' }, { status: 400 });

  await addUni({ userId: user.id, amount: finalAmount, type, refId, memo });

  const { data: profile } = await supabase
    .from('profiles')
    .select('uni_balance')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ balance: profile?.uni_balance ?? 0 });
}

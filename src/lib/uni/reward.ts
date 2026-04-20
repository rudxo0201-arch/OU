import { createClient } from '@/lib/supabase/server';

export type UniRewardType =
  | 'signup_bonus'
  | 'invite_success'
  | 'accuracy_swipe';

export async function addUni({
  userId,
  amount,
  type,
  refId,
  memo,
}: {
  userId: string;
  amount: number;
  type: UniRewardType;
  refId?: string;
  memo?: string;
}) {
  const supabase = await createClient();

  // 트랜잭션 기록
  const { error: txError } = await supabase.from('uni_transactions').insert({
    user_id: userId,
    amount,
    type,
    ref_id: refId ?? null,
    memo: memo ?? null,
  });

  if (txError) throw txError;

  // 잔액 업데이트
  const { error: balError } = await supabase.rpc('increment_uni_balance', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (balError) {
    // RPC 없을 경우 fallback: 현재 잔액 조회 후 업데이트
    const { data: profile } = await supabase
      .from('profiles')
      .select('uni_balance')
      .eq('id', userId)
      .single();

    await supabase
      .from('profiles')
      .update({ uni_balance: (profile?.uni_balance ?? 0) + amount })
      .eq('id', userId);
  }
}

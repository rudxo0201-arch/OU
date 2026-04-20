import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** 최근 채팅 내역 반환 (최대 50턴) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ messages: [] });

  const { data, error } = await supabase
    .from('messages')
    .select('id, role, raw, created_at, pair_id')
    .eq('user_id', user.id)
    .eq('type', 'chat')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return NextResponse.json({ messages: [] });

  // 오래된 것부터 정렬 후 반환
  const sorted = [...data].reverse();
  return NextResponse.json({ messages: sorted });
}

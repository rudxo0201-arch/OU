import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveMessageAsync } from '@/lib/pipeline/layer2';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'empty' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 클라이언트는 이미 "기록됨" 표시 — 서버는 백그라운드에서 처리
    // saveMessageAsync를 awaiting하되 클라이언트는 응답을 기다리지 않음 (fire-and-forget fetch)
    saveMessageAsync({
      userId: user?.id,
      userMessage: text.trim(),
      assistantMessage: '', // Quick 채널: 어시스턴트 응답 없음
    }).catch(e => console.error('[Quick] saveMessageAsync failed:', e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Quick] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

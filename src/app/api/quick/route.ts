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

    // 클라이언트는 낙관적으로 "기록됨" 표시 — 서버는 완전히 처리 후 응답
    await saveMessageAsync({
      userId: user?.id,
      userMessage: text.trim(),
      assistantMessage: '',
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Quick] error:', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

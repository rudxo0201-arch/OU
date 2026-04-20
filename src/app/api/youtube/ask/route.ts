/**
 * POST /api/youtube/ask
 *
 * 영상 트랜스크립트를 컨텍스트로, 회원 질문에 AI가 답변.
 * 답변은 VideoOrb가 DataNode에 기록.
 *
 * Body: { videoId, nodeId, question, transcriptContext, currentTime }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeWithFallback } from '@/lib/llm/router';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { question, transcriptContext, currentTime } = body as {
    videoId: string;
    nodeId: string | null;
    question: string;
    transcriptContext: string | null;
    currentTime: number;
  };

  if (!question) return NextResponse.json({ error: 'question 필수' }, { status: 400 });

  const systemPrompt = transcriptContext
    ? `다음은 유튜브 영상의 트랜스크립트입니다:\n\n${transcriptContext.slice(0, 8000)}\n\n위 내용을 참고해 질문에 답해주세요. 답변은 간결하게 (3문장 이내). 관련 내용이 없으면 그렇다고 말해주세요.`
    : '유튜브 영상에 관한 질문입니다. 간결하게 답해주세요 (3문장 이내).';

  const timeContext = currentTime > 0
    ? ` (현재 영상 재생 위치: ${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')})`
    : '';

  try {
    const result = await completeWithFallback(
      [{ role: 'user', content: question + timeContext }],
      { system: systemPrompt, maxTokens: 400, operation: 'youtube_ask' },
    );

    return NextResponse.json({ answer: result.text || '답변을 가져오지 못했어요.' });
  } catch {
    return NextResponse.json({ answer: '답변 중 오류가 발생했어요.' });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeWithFallback } from '@/lib/llm/router';
import { COPY } from '@/lib/copy';

const SYSTEM_PROMPT = `당신은 OU(Own Universe) 서비스의 뷰 설정 도우미입니다.
사용자의 자연어 요청을 받아 JSON 뷰 설정으로 변환합니다.

사용 가능한 도메인:
- task (할일/태스크)
- schedule (일정/스케줄)
- finance (재정/지출/수입)
- habit (습관/루틴)
- emotion (감정/기분)
- knowledge (지식/메모)

사용 가능한 렌더 타입:
- task (칸반 보드)
- todo (투두 리스트)
- calendar (캘린더)
- timeline (타임라인)
- table (테이블)
- heatmap (히트맵)
- chart (차트/그래프)
- journal (일기/노트)

도메인별 필드:
- task: status, priority, due, tag
- schedule: date, time, place
- finance: date, category, amount
- habit: date, habit, streak
- emotion: date, valence, tag
- knowledge: date, topic, tag

필터 연산자: =, !=, >, <, contains, has
기간(range): today, week, month, quarter, year, all

currentConfig가 있으면 그것을 기반으로 부분 수정하세요. 없으면 새로 만드세요.

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "config": {
    "domain": "string",
    "viewType": "string",
    "filters": [{"field": "string", "op": "string", "value": "string|number|boolean"}],
    "groupBy": "string",
    "sort": {"field": "string", "dir": "asc|desc"},
    "range": "string"
  },
  "explanation": "한국어로 한 문장 설명"
}`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: COPY.error.unauthorized }, { status: 401 });

    let body: { prompt: string; currentConfig?: Record<string, unknown>; availableDomains?: string[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    const { prompt, currentConfig, availableDomains } = body;
    if (!prompt?.trim()) {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    const domainNote = availableDomains?.length
      ? `\n\n이 사용자가 보유한 실제 도메인: ${availableDomains.join(', ')}\n(위 목록에 없는 도메인은 사용하지 마세요)`
      : '';

    const userMessage = currentConfig && Object.keys(currentConfig).length > 0
      ? `현재 설정: ${JSON.stringify(currentConfig)}${domainNote}\n\n요청: ${prompt}`
      : `${domainNote ? domainNote + '\n\n' : ''}요청: ${prompt}`;

    const result = await completeWithFallback(
      [{ role: 'user', content: userMessage }],
      { system: SYSTEM_PROMPT, maxTokens: 512, operation: 'view_assist', userId: user.id },
    );

    // JSON 파싱 시도
    let parsed: { config: Record<string, unknown>; explanation: string };
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? result.text);
    } catch {
      return NextResponse.json({ message: '뷰 설정 파싱에 실패했어요. 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({
      config: parsed.config ?? {},
      explanation: parsed.explanation ?? '',
    });
  } catch (e) {
    console.error('[Views/Assist] Error:', e);
    return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
  }
}

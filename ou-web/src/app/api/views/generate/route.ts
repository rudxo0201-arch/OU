import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const VIEW_GEN_SYSTEM = `당신은 OU 데이터 뷰를 생성하는 전문가입니다.
사용자의 요청에 따라 HTML/CSS/JS 코드를 생성합니다.

규칙:
1. 외부 네트워크 fetch 절대 금지
2. const OU = window.OU 로 데이터 접근
3. CSS는 var(--mantine-color-*) 변수 우선 사용
4. 배경색 유채색 금지. 흰~흑 계열만.
5. 완성된 HTML 파일만 출력. 설명 없이.`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if (!sub || sub.plan === 'free') {
      return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 });
    }

    let body: { prompt?: string; nodes?: unknown[]; existingCode?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { prompt, nodes, existingCode } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const messages: Anthropic.MessageParam[] = existingCode
      ? [{ role: 'user', content: `기존 코드:\n\`\`\`html\n${existingCode}\n\`\`\`\n\n수정 요청: ${prompt}` }]
      : [{ role: 'user', content: `OU 데이터 뷰 생성 요청: ${prompt}\n\n데이터 구조: ${JSON.stringify(nodes?.slice(0, 5), null, 2)}` }];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: VIEW_GEN_SYSTEM,
      messages,
    });

    const generatedCode = response.content[0].type === 'text' ? response.content[0].text : '';

    await supabase.from('token_usage').insert({
      user_id: user.id,
      operation: 'view_gen',
      tokens_used: Math.ceil(response.usage.input_tokens / 10) + 20,
      llm_tokens_actual: response.usage.input_tokens + response.usage.output_tokens,
    });

    return NextResponse.json({ code: generatedCode });
  } catch (e) {
    console.error('[ViewGenerate] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

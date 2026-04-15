import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';
import { completeWithFallback } from '@/lib/llm/router';

const DEFAULT_ARCHETYPES = [
  '의대생', '프리랜서', '신혼부부', '은퇴자', '뮤지션', '자취생',
  '고3 수험생', '스타트업 대표', '교환학생', '워킹맘', '대학 새내기',
  '요리사', '유튜버', '간호사', '변호사',
];

const SYSTEM_PROMPT = `너는 OU 서비스의 사용자 경험 시나리오 작가야.
OU는 "말만 하면 데이터가 되고, 원하는 형태로 꺼내 쓸 수 있는" 플랫폼이야.

주어진 아키타입에 대해 감동적이고 구체적인 시나리오를 작성해.
각 시나리오는:
- 3-5문장
- 구체적인 이름과 상황
- OU의 기능이 자연스럽게 녹아듦 (캘린더, 가계부, 그래프, 퀴즈, 공유 등)
- 감정적 울림이 있는 결말
- 제목은 "OO의 XXX" 형식

JSON 배열로 반환: [{ "title": "...", "story": "...", "tags": ["...", "..."] }]`;

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const archetypes: string[] = body.archetypes ?? DEFAULT_ARCHETYPES;
    const count: number = Math.min(Math.max(body.count ?? 3, 1), 10);

    // Generate scenarios via LLM
    const userPrompt = `다음 아키타입들에 대해 각각 ${count}개씩 시나리오를 작성해줘:\n${archetypes.join(', ')}\n\n총 ${archetypes.length * count}개의 시나리오를 JSON 배열로 반환해.`;

    const result = await completeWithFallback(
      [{ role: 'user', content: userPrompt }],
      {
        system: SYSTEM_PROMPT,
        maxTokens: 4096,
        temperature: 0.9,
        operation: 'generate-scenarios',
      },
    );

    // Parse JSON from LLM response
    let scenarios: Array<{ title: string; story: string; tags: string[] }>;
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: 'LLM 응답에서 JSON을 추출할 수 없습니다.', raw: result.text },
          { status: 500 },
        );
      }
      scenarios = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: 'LLM 응답 JSON 파싱 실패', raw: result.text },
        { status: 500 },
      );
    }

    // Return generated scenarios for preview (don't save yet)
    if (body.preview) {
      return NextResponse.json({ scenarios, provider: result.provider });
    }

    // Save to DB
    const supabase = await createClient();

    // Look up admin user
    const { data: adminUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .limit(1);

    let adminUserId: string | null = adminUsers?.[0]?.id ?? null;

    if (!adminUserId) {
      const { data: authData } = await supabase.auth.admin.listUsers();
      const adminAuth = authData?.users?.find(u => u.email === ADMIN_EMAIL);
      adminUserId = adminAuth?.id ?? null;
    }

    if (!adminUserId) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 500 });
    }

    // Dedup by title
    const { data: existingNodes } = await supabase
      .from('data_nodes')
      .select('title')
      .eq('user_id', adminUserId)
      .eq('source_type', 'manual')
      .in('title', scenarios.map(s => s.title));

    const existingTitles = new Set(
      (existingNodes ?? []).map((n: { title: string }) => n.title),
    );

    const newScenarios = scenarios.filter(s => !existingTitles.has(s.title));

    if (newScenarios.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: scenarios.length,
        message: '모든 시나리오가 이미 존재합니다.',
      });
    }

    // Determine next order value
    const { data: maxOrderNode } = await supabase
      .from('data_nodes')
      .select('domain_data')
      .eq('user_id', adminUserId)
      .eq('source_type', 'manual')
      .not('domain_data->category', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextOrder = 30;
    if (maxOrderNode?.[0]?.domain_data?.order) {
      nextOrder = (maxOrderNode[0].domain_data.order as number) + 1;
    }

    const insertPayload = newScenarios.map((s, i) => ({
      user_id: adminUserId,
      title: s.title,
      domain: 'knowledge',
      raw: s.story,
      domain_data: {
        category: 'scenario',
        tags: s.tags,
        order: nextOrder + i,
      },
      visibility: 'public' as const,
      confidence: 1.0,
      source_type: 'manual',
      resolution: 'resolved',
      importance: 3,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('data_nodes')
      .insert(insertPayload)
      .select('id, title');

    if (insertError) {
      return NextResponse.json(
        { error: `저장 실패: ${insertError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      created: inserted?.length ?? 0,
      skipped: existingTitles.size,
      nodes: inserted,
      message: `${inserted?.length ?? 0}개의 시나리오를 생성했습니다.`,
    });
  } catch (e: any) {
    console.error('[Admin/GenerateScenarios] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

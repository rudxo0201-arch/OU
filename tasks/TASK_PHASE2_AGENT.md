# 작업 지시서 — Phase 2 Step 5: 검증 에이전트 + 임베딩 파이프라인

> 선행 조건: TASK_PHASE2_GROUP_AI.md 완료
> 완료 기준: 주간 배치 검증 + 벡터 임베딩 + 유사도 검색 동작

---

## 사전 읽기

```
DATA.md           검증 시스템 (자동 → 집단지성 → 관리자), 임베딩 티어
DATA_STANDARD.md  confidence 정의, embed_status, embed_tier
ROADMAP.md        AI 에이전트 2번(트리플 추출), 3번(임베딩), 5번(검증)
```

---

## 구현 목록

```
[ ] 벡터 임베딩 파이프라인 (sentences → embedding)
[ ] 임베딩 티어 관리 (hot/warm/cold)
[ ] 유사도 검색 API (하이브리드: SQL + 벡터)
[ ] 트리플 추출 에이전트 (Haiku 배치)
[ ] 검증 에이전트 (주간 Cron)
[ ] 집단지성 검토 UI
[ ] api_cost_log 기록
```

---

## Step 1. 임베딩 파이프라인

### `src/lib/pipeline/layer3.ts`

```typescript
// Layer 3: 백그라운드 비동기 처리
// sentences → 임베딩 → triples 추출

import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// sentences 임베딩 (text-embedding-3-small)
export async function embedPendingSentences(nodeId: string) {
  const supabase = await createClient();

  const { data: sentences } = await supabase
    .from('sentences')
    .select('id, text')
    .eq('node_id', nodeId)
    .eq('embed_status', 'pending')
    .limit(50);

  if (!sentences?.length) return;

  // 배치 임베딩 (API 비용 절감)
  const texts = sentences.map(s => s.text);
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  // 비용 기록
  await supabase.from('api_cost_log').insert({
    operation: 'embed',
    model: 'text-embedding-3-small',
    tokens: response.usage.total_tokens,
    cost_usd: response.usage.total_tokens * 0.00000002,
    node_id: nodeId,
  });

  // 각 문장에 임베딩 저장
  for (let i = 0; i < sentences.length; i++) {
    await supabase
      .from('sentences')
      .update({
        embedding: response.data[i].embedding,
        embed_status: 'done',
      })
      .eq('id', sentences[i].id);
  }
}

// 트리플 추출 (Claude Haiku — 배치 처리)
export async function extractTriples(nodeId: string) {
  const supabase = await createClient();
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic();

  const { data: sentences } = await supabase
    .from('sentences')
    .select('id, text, section_id')
    .eq('node_id', nodeId)
    .limit(20);

  if (!sentences?.length) return;

  const text = sentences.map(s => s.text).join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: `아래 텍스트에서 트리플(주어, 서술어, 목적어)을 추출하세요.
서술어는 반드시 아래 목록만 사용:
is_a, part_of, causes, derived_from, related_to,
opposite_of, requires, example_of, involves, located_at, occurs_at

JSON 배열로만 출력. 설명 없이.
예: [{"subject":"A","predicate":"is_a","object":"B"}]`,
    messages: [{ role: 'user', content: text }],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '[]';

  let triples = [];
  try {
    triples = JSON.parse(content.replace(/```json?|```/g, '').trim());
  } catch { return; }

  // 비용 기록
  await supabase.from('api_cost_log').insert({
    operation: 'extract_triple',
    model: 'claude-haiku-4-5',
    tokens: response.usage.input_tokens + response.usage.output_tokens,
    cost_usd: (response.usage.input_tokens * 0.00000025 + response.usage.output_tokens * 0.00000125),
    node_id: nodeId,
  });

  // 트리플 저장
  for (const t of triples) {
    if (!t.subject || !t.predicate || !t.object) continue;

    const validPredicates = [
      'is_a','part_of','causes','derived_from','related_to',
      'opposite_of','requires','example_of','involves','located_at','occurs_at'
    ];
    if (!validPredicates.includes(t.predicate)) continue;

    await supabase.from('triples').insert({
      node_id: nodeId,
      subject: t.subject,
      predicate: t.predicate,
      object: t.object,
      source_level: 'sentence',
      source_type: 'extracted',
      confidence: 'medium',
    });
  }
}
```

---

## Step 2. 하이브리드 검색 API

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { query, mode = 'hybrid' } = await req.json();

  let results = [];

  if (mode === 'keyword' || mode === 'hybrid') {
    // SQL 키워드 검색
    const { data: sqlResults } = await supabase
      .from('data_nodes')
      .select('id, domain, raw, view_hint, created_at')
      .eq('user_id', user.id)
      .textSearch('raw', query)
      .limit(10);
    results = [...(sqlResults ?? [])];
  }

  if (mode === 'semantic' || mode === 'hybrid') {
    // 쿼리 임베딩 생성
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const queryEmbedding = embRes.data[0].embedding;

    // pgvector 유사도 검색
    const { data: vectorResults } = await supabase.rpc('match_sentences', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 10,
      user_id: user.id,
    });

    // 중복 제거 후 병합
    const existingIds = new Set(results.map((r: any) => r.id));
    (vectorResults ?? []).forEach((r: any) => {
      if (!existingIds.has(r.node_id)) {
        results.push(r);
      }
    });
  }

  return NextResponse.json({ results });
}
```

Supabase SQL Editor에서 함수 생성:
```sql
CREATE OR REPLACE FUNCTION match_sentences(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE(node_id uuid, text text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT s.node_id, s.text,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM sentences s
  JOIN data_nodes n ON s.node_id = n.id
  WHERE n.user_id = match_sentences.user_id
    AND s.embed_status = 'done'
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

---

## Step 3. 검증 에이전트 (주간 Cron)

```typescript
// src/app/api/cron/verify/route.ts
// Vercel Cron Job: 매주 월요일 02:00 KST

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  // Cron 인증
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // confidence = 'medium' 이상 된 지 7일 이상 DataNode 검증
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: nodes } = await supabase
    .from('data_nodes')
    .select('id, domain, raw, is_admin_node')
    .eq('confidence', 'medium')
    .is('last_verified_at', null)
    .lt('created_at', weekAgo)
    .limit(50);

  let verified = 0;
  let flagged = 0;

  for (const node of nodes ?? []) {
    // 간단한 자동 검증: 내용이 너무 짧거나 모호하면 플래그
    const isSuspicious = !node.raw || node.raw.length < 10;

    if (isSuspicious) {
      // verification_requests에 등록
      await supabase.from('verification_requests').insert({
        node_id: node.id,
        reason: 'auto_flagged',
        status: 'open',
      });
      flagged++;
    } else {
      // 검증 통과 → last_verified_at 업데이트
      await supabase
        .from('data_nodes')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', node.id);
      verified++;
    }
  }

  return NextResponse.json({ verified, flagged });
}
```

`vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/verify",
    "schedule": "0 17 * * 1"
  }]
}
```

환경변수 추가:
```env
CRON_SECRET=your-random-secret
```

---

## Step 4. 집단지성 검토 UI

```typescript
// src/app/(private)/admin/verify/page.tsx
// 관리자 + 관련 분야 회원에게 검토 요청 표시

// verification_requests 목록
// 각 항목: DataNode 내용 + 투표 버튼 (맞아요/틀려요/모르겠어요)
// N표 이상 → confidence 자동 변경
```

---

## 완료 체크리스트

```
[ ] 새 DataNode 생성 후 embedPendingSentences 호출 확인
[ ] sentences.embedding 저장 확인 (Supabase 대시보드)
[ ] extractTriples 실행 → triples 테이블 저장 확인
[ ] 하이브리드 검색 API 동작 (SQL + 벡터)
[ ] match_sentences 함수 Supabase 등록 확인
[ ] 검증 Cron Route 인증 동작
[ ] api_cost_log 비용 기록 확인
[ ] pnpm build 통과
[ ] git commit: "feat: 임베딩 파이프라인 + 트리플 추출 + 검증 에이전트"
```

---

## Phase 2 완료

Phase 2 전체 체크리스트:
```
✅ TASK_PHASE2_FILE_UPLOAD   파일 업로드 + R2
✅ TASK_PHASE2_VIEWER        OU 내장 뷰어 + 구독 시스템
✅ TASK_PHASE2_SUBSCRIPTION  Pro 구독 + 토큰 + 광고
✅ TASK_PHASE2_GROUP_AI      그룹 + AI 뷰 생성기
✅ TASK_PHASE2_AGENT         검증 에이전트 + 임베딩
```

## 다음 단계

Phase 3 — 생태계:
```
TASK_PHASE3_SNS.md       SNS 채널 (/feed, 프로필뷰)
TASK_PHASE3_CHAT.md      OU 채팅 (/messages, DataView 메시지)
TASK_PHASE3_CREATOR.md   크리에이터 수익화 + 마켓플레이스
TASK_PHASE3_B2B.md       B2B 교육 (Team 플랜)
```

# 작업 지시서 — Phase 2 Step 4: 그룹 + AI 뷰 생성기

> 선행 조건: TASK_PHASE2_SUBSCRIPTION.md 완료
> 완료 기준: 그룹 생성 + 공동 DB + AI 뷰 생성 (Pro)

---

## 사전 읽기

```
PLATFORM.md    레이어 2(그룹), 그룹 구성, 권한 모델
VIEWS.md       레이어 4 AI 뷰 생성기, 샌드박스, DataNode 주입 방식
BUSINESS.md    뷰 생성 토큰 소비, Pro 전용
```

---

## 파트 A: 그룹

### 구현 목록
```
[ ] 그룹 생성 UI
[ ] 멤버 초대 (링크 / 이메일)
[ ] 그룹 공동 DB (group_id 기반)
[ ] 그룹 공동 뷰
[ ] 권한 (Owner / Editor / Viewer)
[ ] 공동 편집 충돌 처리 (Last-write-wins)
[ ] 마감 알림
```

---

### Step A-1. 그룹 생성 API

```typescript
// src/app/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description } = await req.json();

  const { data: group } = await supabase.from('groups').insert({
    name,
    description,
    owner_id: user.id,
    visibility: 'private',
  }).select().single();

  // 생성자를 Owner로 자동 추가
  await supabase.from('group_members').insert({
    group_id: group!.id,
    user_id: user.id,
    role: 'owner',
  });

  return NextResponse.json({ group });
}
```

### Step A-2. 초대 링크 생성

```typescript
// src/app/api/groups/[groupId]/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 초대 토큰 생성 (단순 UUID)
  const token = crypto.randomUUID();

  await supabase.from('group_invites').insert({
    group_id: params.groupId,
    token,
    created_by: user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/join/${token}`;
  return NextResponse.json({ inviteUrl });
}
```

### Step A-3. 그룹 채팅 → 공동 DB 저장

`/api/chat/route.ts` 수정 — group_id 지원:

```typescript
// group_id가 있으면 그룹 DataNode로 저장
const { groupId } = await req.json();

// saveMessageAsync에 groupId 전달
saveMessageAsync({
  userId: user?.id,
  groupId: groupId ?? null,
  userMessage,
  assistantMessage: fullText,
});
```

`layer2.ts`에서 group_id 추가:
```typescript
await supabase.from('data_nodes').insert({
  user_id: input.userId,
  group_id: input.groupId ?? null,  // 그룹 DataNode
  ...
});
```

### Step A-4. 그룹 홈 UI

```typescript
// src/app/(private)/groups/[groupId]/page.tsx
// 그룹 공동 DB + 공동 뷰 목록 표시
// 멤버 목록 + 권한 표시
// 그룹 채팅 → 공동 DataNode 생성
```

---

## 파트 B: AI 뷰 생성기 (Pro)

### 구현 목록
```
[ ] 자연어 → Claude Code → HTML/CSS/JS 생성
[ ] DataNode 변수 주입 (OU 객체)
[ ] iframe 샌드박스 렌더링
[ ] 반복 수정 (토큰 소비)
[ ] 생성된 뷰 저장 → 사이드바 등록
[ ] 마켓 판매 (Phase 3)
```

---

### Step B-1. AI 뷰 생성 API

```typescript
// src/app/api/views/generate/route.ts
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Pro 플랜 확인
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single();

  if (sub?.plan === 'free') {
    return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 });
  }

  const { prompt, nodes, existingCode } = await req.json();

  const messages = existingCode
    ? [
        { role: 'user' as const, content: `기존 코드:\n\`\`\`html\n${existingCode}\n\`\`\`\n\n수정 요청: ${prompt}` },
      ]
    : [
        { role: 'user' as const, content: `OU 데이터 뷰 생성 요청: ${prompt}\n\n데이터 구조: ${JSON.stringify(nodes?.slice(0, 5), null, 2)}` },
      ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: VIEW_GEN_SYSTEM,
    messages,
  });

  const generatedCode = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // 토큰 사용량 기록 (뷰 생성은 chat보다 높은 소비)
  await supabase.from('token_usage').insert({
    user_id: user.id,
    operation: 'view_gen',
    tokens_used: Math.ceil(response.usage.input_tokens / 10) + 20, // 뷰 생성 = 채팅 대비 높은 소비
    llm_tokens_actual: response.usage.input_tokens + response.usage.output_tokens,
  });

  return NextResponse.json({ code: generatedCode });
}
```

### Step B-2. AI 뷰 생성기 UI

```typescript
// src/components/views/AIViewGenerator.tsx
'use client';

import { useState } from 'react';
import { Stack, Textarea, Button, Text, Box, Group } from '@mantine/core';
import { confirmViewGeneration } from '@/lib/token/guard';
import { useNavigationStore } from '@/stores/navigationStore';

interface AIViewGeneratorProps {
  nodes: any[];
}

export function AIViewGenerator({ nodes }: AIViewGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { addSavedView } = useNavigationStore();

  const handleGenerate = () => {
    // 뷰 생성 전 토큰 소비 안내
    confirmViewGeneration(20, async () => {
      setLoading(true);
      const res = await fetch('/api/views/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, nodes, existingCode: generatedCode || undefined }),
      });

      if (res.status === 403) {
        alert('AI 뷰 생성은 Pro 플랜에서 사용할 수 있어요.');
        setLoading(false);
        return;
      }

      const { code } = await res.json();
      setGeneratedCode(code);
      setLoading(false);
    });
  };

  const handleSave = async () => {
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: prompt.slice(0, 30),
        viewType: 'custom',
        customCode: generatedCode,
      }),
    });
    const { view } = await res.json();
    addSavedView({ id: view.id, name: view.name, viewType: 'custom' });
  };

  return (
    <Stack gap="md">
      <Textarea
        label="어떤 뷰를 만들까요?"
        placeholder="내 독서 기록을 책장 스타일로 보여줘. 읽은 책은 세워서, 안 읽은 건 눕혀서."
        minRows={3}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />

      <Button
        loading={loading}
        onClick={handleGenerate}
        disabled={!prompt.trim()}
      >
        {generatedCode ? '수정하기' : 'AI로 만들기'}
      </Button>

      {/* 샌드박스 렌더링 */}
      {generatedCode && (
        <Stack gap="sm">
          <Text fz="xs" c="dimmed">미리보기</Text>
          <Box style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}>
            <iframe
              srcDoc={injectOUData(generatedCode, nodes)}
              style={{ width: '100%', height: 400, border: 'none' }}
              sandbox="allow-scripts"  // 외부 네트워크 차단
              title="AI 뷰 미리보기"
            />
          </Box>
          <Group>
            <Button variant="light" onClick={handleSave}>저장하기</Button>
            <Button variant="subtle" color="gray" onClick={handleGenerate} loading={loading}>
              다시 생성
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}

// DataNode를 window.OU로 주입
function injectOUData(html: string, nodes: any[]): string {
  const script = `<script>window.OU = { nodes: ${JSON.stringify(nodes)} };</script>`;
  return html.replace('<body>', `<body>${script}`);
}
```

---

## 완료 체크리스트

```
파트 A — 그룹:
[ ] 그룹 생성 → group_members Owner 자동 추가
[ ] 초대 링크 생성 → /join/[token] 접속 → 멤버 추가
[ ] 그룹 채팅 → group_id 있는 DataNode 저장
[ ] 그룹 뷰 → 그룹 DataNode만 필터링 렌더링
[ ] Owner/Editor/Viewer 권한 구분

파트 B — AI 뷰 생성기:
[ ] Free 플랜 → PRO_REQUIRED 에러 → 업그레이드 안내
[ ] Pro 플랜 → AI 뷰 생성 동작
[ ] 뷰 생성 전 토큰 소비 안내 모달
[ ] iframe sandbox 외부 fetch 차단 확인
[ ] OU.nodes 데이터 주입 확인
[ ] 반복 수정 → 기존 코드 기반 수정
[ ] 생성 뷰 저장 → Sidebar 아이콘 등록
[ ] 토큰 소비 기록 (token_usage)

[ ] pnpm build 통과
[ ] git commit: "feat: 그룹 + AI 뷰 생성기 (Pro)"
```

---

## 다음 작업

**TASK_PHASE2_AGENT.md** → 검증 에이전트 (주간 배치)

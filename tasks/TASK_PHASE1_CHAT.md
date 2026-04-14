# 작업 지시서 — Phase 1 Step 3: OU-Chat

> 선행 조건: TASK_PHASE1_APPSHELL.md 완료
> 완료 기준: 채팅 → 스트리밍 → NodeCreatedBadge → 저장 유도 E2E 동작

---

## 사전 읽기

```
CLAUDE.md
DATA.md              Layer 1/2/3 파이프라인
DATA_STANDARD.md     DataNode 스키마, 트리플 구조
/ou-frontend/SKILL.md  섹션 6(컴포넌트 명세), 8(전송 시퀀스), 9(킬러 데모 플로우)
VISION.md            킬러 데모 시나리오
```

---

## 구현 목록

```
[ ] ChatInterface 레이아웃
[ ] ChatInput (첨부 포함)
[ ] MessageStream (스트리밍 + 중단/취소)
[ ] LLM API Route (스트리밍, 서버사이드)
[ ] Layer 1: 응답 생성 (트리플화 프롬프트)
[ ] Layer 2: DataNode 저장 (비동기, 응답 완료 후)
[ ] Layer 3: 트리플 추출 + 임베딩 (백그라운드 큐)
[ ] NodeCreatedBadge
[ ] SaveNudge (비로그인 5턴)
[ ] TokenGauge
[ ] 비로그인 5턴 카운터
[ ] 온보딩 첫 메시지
```

---

## Step 1. LLM Provider 추상화

### `src/lib/llm/provider.ts`

```typescript
// 멀티 프로바이더 추상화 — 어떤 모델이든 교체 가능
export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamOptions {
  messages: LLMMessage[];
  systemPrompt?: string;
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

// Claude Sonnet (기본)
export async function streamWithClaude(opts: StreamOptions) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: opts.systemPrompt,
    messages: opts.messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    })),
  });

  let fullText = '';
  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      fullText += chunk.delta.text;
      opts.onChunk(chunk.delta.text);
    }
  }
  opts.onComplete(fullText);
}
```

### `src/lib/llm/prompts.ts`

```typescript
// OU 핵심 해자: 트리플화를 염두에 둔 답변 생성
// 사용자는 자연스러운 문장으로 보이지만
// 내부적으로 표준 서술어 11개 안에서 관계 표현

export const OU_SYSTEM_PROMPT = `당신은 OU의 AI 어시스턴트입니다.

**핵심 원칙: 트리플화를 염두에 둔 답변 생성**
답변 시 개념 간 관계를 아래 표준 서술어로 명확히 표현하세요:
- is_a: "A는 B이다" (상위 개념)
- part_of: "A는 B의 일부이다"
- causes: "A는 B를 유발한다"
- derived_from: "A는 B에서 파생됐다"
- related_to: "A는 B와 연관된다"
- opposite_of: "A는 B의 반대이다"
- requires: "A는 B를 필요로 한다"
- example_of: "A는 B의 예시이다"
- involves: "A는 B를 수반한다"
- located_at: "A는 B에 위치한다"
- occurs_at: "A는 B 시점에 발생한다"

사용자에게는 자연스러운 문장으로 표현하되,
개념 간 관계가 위 서술어로 추출 가능한 구조로 답변하세요.

답변은 간결하고 명확하게. 마크다운 헤딩(##)으로 구조화하면 더 좋습니다.`;
```

---

## Step 2. Chat API Route

### `src/app/api/chat/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { streamWithClaude } from '@/lib/llm/provider';
import { OU_SYSTEM_PROMPT } from '@/lib/llm/prompts';
import { saveMessageAsync } from '@/lib/pipeline/layer2';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { messages, isGuest } = await req.json();

  // 토큰 한도 체크 (로그인 사용자)
  if (user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('token_limit')
      .eq('user_id', user.id)
      .single();

    const { data: usage } = await supabase
      .from('token_usage')
      .select('tokens_used')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalUsed = usage?.reduce((sum, u) => sum + u.tokens_used, 0) ?? 0;
    if (totalUsed >= (sub?.token_limit ?? 100)) {
      return new Response(JSON.stringify({ error: 'TOKEN_LIMIT_EXCEEDED' }), {
        status: 429,
      });
    }
  }

  // SSE 스트리밍 응답
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamWithClaude({
          messages,
          systemPrompt: OU_SYSTEM_PROMPT,
          onChunk: (text) => {
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          },
          onComplete: async (fullText) => {
            // Layer 2: 비동기로 DataNode 저장 (응답 완료 후)
            if (user || isGuest) {
              saveMessageAsync({
                userId: user?.id,
                userMessage: messages[messages.length - 1].content,
                assistantMessage: fullText,
              }).catch(console.error); // 실패해도 사용자 경험 영향 없음
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullText })}\n\n`));
            controller.close();
          },
          onError: (error) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
            controller.close();
          },
        });
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## Step 3. Layer 2 — DataNode 저장 (비동기)

### `src/lib/pipeline/layer2.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { classifyDomain } from './classifier';
import { detectUnresolved } from './unresolved';

interface SaveMessageInput {
  userId?: string;
  userMessage: string;
  assistantMessage: string;
}

// 응답 완료 직후 ~0.5초, 비동기 처리
// 실패해도 사용자 경험 영향 없음
export async function saveMessageAsync(input: SaveMessageInput) {
  const supabase = await createClient();

  // 1. messages 테이블 저장
  const { data: userMsg } = await supabase.from('messages').insert({
    user_id: input.userId,
    role: 'user',
    raw: input.userMessage,
    type: 'chat',
  }).select().single();

  const { data: assistantMsg } = await supabase.from('messages').insert({
    user_id: input.userId,
    role: 'assistant',
    raw: input.assistantMessage,
    type: 'chat',
    pair_id: userMsg?.id,
  }).select().single();

  // 2. 도메인 분류 (규칙 기반)
  const { domain, viewHint, confidence } = await classifyDomain(
    input.userMessage + '\n' + input.assistantMessage
  );

  // 3. DataNode 저장
  const { data: node } = await supabase.from('data_nodes').insert({
    user_id: input.userId,
    message_id: assistantMsg?.id,
    domain,
    source_type: 'chat',
    confidence,
    resolution: 'resolved',
    view_hint: viewHint,
    visibility: 'private',
  }).select().single();

  // 4. UNRESOLVED 엔티티 감지
  if (node) {
    await detectUnresolved({
      userId: input.userId,
      nodeId: node.id,
      text: input.userMessage,
      contextSnippet: [
        { role: 'user', text: input.userMessage },
        { role: 'assistant', text: input.assistantMessage },
      ],
    });
  }

  // Layer 3은 별도 큐로 처리 (트리플 추출 + 임베딩)
  // TODO: Upstash 큐 연동 (Phase 1 후반)

  return node;
}
```

### `src/lib/pipeline/classifier.ts`

```typescript
// 규칙 기반 도메인 분류 (Phase 1)
// Phase 2에서 LLM 기반으로 업그레이드

const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  schedule: [
    /(\d{1,2}월|\d{1,2}일|월요일|화요일|수요일|목요일|금요일|토요일|일요일)/,
    /(다음주|이번주|내일|모레|오늘|약속|미팅|결혼식|생일|발인)/,
  ],
  task: [
    /(해야|할 일|과제|마감|제출|처리|완료|진행)/,
  ],
  finance: [
    /(\d+원|\d+만원|결제|지출|소비|지불|구매)/,
  ],
  knowledge: [
    /(이란|이란?|라는|개념|원리|방법|이유|왜냐하면)/,
  ],
  idea: [
    /(아이디어|생각|기획|만들면|해보면|어떨까)/,
  ],
  emotion: [
    /(기분|감정|슬프|기쁘|화나|걱정|행복|우울|힘들)/,
  ],
};

export async function classifyDomain(text: string) {
  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    if (patterns.some(p => p.test(text))) {
      const viewHintMap: Record<string, string> = {
        schedule: 'calendar',
        task: 'task',
        finance: 'chart',
        knowledge: 'knowledge_graph',
        idea: 'mindmap',
        emotion: 'journal',
      };
      return {
        domain,
        viewHint: viewHintMap[domain] ?? null,
        confidence: 'medium' as const,
      };
    }
  }
  return { domain: 'knowledge', viewHint: 'knowledge_graph', confidence: 'low' as const };
}
```

---

## Step 4. ChatInterface UI

### `src/components/chat/ChatInterface.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Stack, Box, ScrollArea } from '@mantine/core';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { TokenGauge } from './TokenGauge';
import { SaveNudge } from './SaveNudge';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/stores/chatStore';

export function ChatInterface() {
  const { user } = useAuth();
  const { messages, addMessage, turnCount } = useChatStore();
  const [streaming, setStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const viewport = useRef<HTMLDivElement>(null);

  // 스크롤 자동 하단 이동
  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // 온보딩 첫 메시지
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        id: 'onboarding',
        role: 'assistant',
        content: '안녕하세요! 저는 OU예요. 뭐든 말씀해보세요.\n일정도, 아이디어도, 궁금한 것도. 저장하고 싶으면 나중에 가입하면 돼요.',
        createdAt: new Date(),
      });
    }
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: text, createdAt: new Date() };
    addMessage(userMsg);

    const controller = new AbortController();
    setAbortController(controller);
    setStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    addMessage({ id: assistantId, role: 'assistant', content: '', createdAt: new Date(), streaming: true });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .filter(m => m.id !== 'onboarding')
            .concat(userMsg)
            .map(m => ({ role: m.role, content: m.content })),
          isGuest: !user,
        }),
        signal: controller.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.text) {
            fullText += data.text;
            useChatStore.getState().updateMessage(assistantId, { content: fullText });
          }
          if (data.done) {
            useChatStore.getState().updateMessage(assistantId, {
              streaming: false,
              nodeCreated: data.domain ? { domain: data.domain } : undefined,
            });
          }
          if (data.error === 'TOKEN_LIMIT_EXCEEDED') {
            // 업그레이드 모달 트리거
            useChatStore.getState().setShowUpgradeModal(true);
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        useChatStore.getState().updateMessage(assistantId, {
          content: '[연결이 끊어졌어요. 다시 시도해주세요.]',
          streaming: false,
        });
      }
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    abortController?.abort();
  };

  return (
    <Stack h="100vh" gap={0}>
      {/* 토큰 게이지 */}
      <TokenGauge />

      {/* 메시지 스트림 */}
      <ScrollArea flex={1} viewportRef={viewport}>
        <Stack gap="md" p="md" maw={720} mx="auto">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </Stack>
      </ScrollArea>

      {/* 비로그인 저장 유도 */}
      {!user && turnCount >= 5 && <SaveNudge trigger="turn_limit" />}

      {/* 입력창 */}
      <Box p="md" maw={720} mx="auto" w="100%">
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          streaming={streaming}
          disabled={false}
        />
      </Box>
    </Stack>
  );
}
```

---

## Step 5. ChatStore (Zustand)

### `src/stores/chatStore.ts`

```typescript
import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  streaming?: boolean;
  nodeCreated?: { domain: string };
}

interface ChatStore {
  messages: ChatMessage[];
  turnCount: number;
  showUpgradeModal: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setShowUpgradeModal: (show: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>(set => ({
  messages: [],
  turnCount: 0,
  showUpgradeModal: false,
  addMessage: msg => set(s => ({
    messages: [...s.messages, msg],
    turnCount: msg.role === 'user' ? s.turnCount + 1 : s.turnCount,
  })),
  updateMessage: (id, updates) => set(s => ({
    messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m),
  })),
  setShowUpgradeModal: show => set({ showUpgradeModal: show }),
  reset: () => set({ messages: [], turnCount: 0 }),
}));
```

---

## Step 6. NodeCreatedBadge

### `src/components/chat/NodeCreatedBadge.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Badge, Group } from '@mantine/core';
import { useRouter } from 'next/navigation';

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '📅 일정',
  task: '📋 할 일',
  knowledge: '🔭 지식',
  idea: '💡 아이디어',
  finance: '💰 지출',
  emotion: '💭 감정',
  relation: '👤 인물',
  habit: '🔄 습관',
};

interface NodeCreatedBadgeProps {
  domain: string;
  nodeId?: string;
}

export function NodeCreatedBadge({ domain, nodeId }: NodeCreatedBadgeProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  // 10초 후 자동 소멸
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Group justify="flex-end" mt={4}>
      <Badge
        variant="outline"
        color="gray"
        style={{ cursor: 'pointer', animation: 'fadeInUp 150ms ease' }}
        onClick={() => router.push('/my')}
      >
        {DOMAIN_LABELS[domain] ?? '💫'} 노드가 생성됐어요
      </Badge>
    </Group>
  );
}
```

---

## Step 7. SaveNudge

### `src/components/chat/SaveNudge.tsx`

```typescript
'use client';

import { Box, Group, Text, Button } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SaveNudgeProps {
  trigger: 'turn_limit' | 'view_created' | 'session_end';
  nodeCount?: number;
}

export function SaveNudge({ trigger, nodeCount }: SaveNudgeProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSave = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  if (trigger === 'turn_limit') {
    return (
      <Box
        px="md"
        py="sm"
        style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <Group justify="space-between">
          <Text fz="sm" c="dimmed">
            대화가 쌓이고 있어요 🌌 저장하지 않으면 사라져요
          </Text>
          <Button size="xs" variant="light" onClick={handleSave}>
            Google로 저장
          </Button>
        </Group>
      </Box>
    );
  }

  return null;
}
```

---

## Step 8. /chat 페이지 연결

### `src/app/(private)/chat/page.tsx`

```typescript
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function ChatPage() {
  return <ChatInterface />;
}
```

> `/chat`은 비로그인도 5턴 허용.
> 미들웨어에서 `/chat`을 PRIVATE_ROUTES에서 제외하거나
> 별도 처리 필요 → `TASK_PHASE1_AUTH.md`의 미들웨어 수정 참고.

---

## 완료 체크리스트

```
[ ] 채팅 입력 → 스트리밍 응답 동작
[ ] 스트리밍 중단 (■ 버튼) 동작
[ ] NodeCreatedBadge 응답 완료 후 0.5초 등장
[ ] NodeCreatedBadge 10초 후 자동 소멸
[ ] NodeCreatedBadge 클릭 → /my 이동
[ ] 비로그인 5턴 후 SaveNudge 등장
[ ] SaveNudge Google 버튼 → OAuth 동작
[ ] messages 테이블 저장 확인 (Supabase 대시보드)
[ ] data_nodes 테이블 저장 확인
[ ] 온보딩 첫 메시지 자동 출력
[ ] 네트워크 끊김 → 에러 메시지 표시
[ ] pnpm build 통과
[ ] git commit: "feat: OU-Chat 핵심 구현 (스트리밍 + DataNode 파이프라인)"
```

---

## 다음 작업

**TASK_PHASE1_VIEWS.md** → 기본 DataView 3종 (CalendarView, KanbanView, KnowledgeGraphView)

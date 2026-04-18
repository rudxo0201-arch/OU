# 작업 지시서 — Phase 1 Step 6: 정확도 높이기 + 킬러 데모 완성

> 선행 조건: TASK_PHASE1_GRAPHVIEW.md 완료
> 완료 기준: 킬러 데모 시나리오 E2E 완주

---

## 사전 읽기

```
VISION.md              UNRESOLVED 엔티티, 정확도 높이기 UX, 킬러 데모 시나리오
DATA_STANDARD.md       unresolved_entities 테이블
/ou-frontend/SKILL.md  섹션 6-4(AccuracyInbox), 9(킬러 데모 플로우)
```

---

## 구현 목록

```
[ ] /accuracy 페이지 (받은 편지함 모델)
[ ] UNRESOLVED 엔티티 감지 로직
[ ] 객관식 선택 → 엔티티 해소
[ ] 자동 해소 감지 (맥락 누적 시)
[ ] Sidebar UNRESOLVED 배지 카운터
[ ] 킬러 데모 E2E 검증
[ ] 비로그인 체험 플로우 최종 확인
```

---

## Step 1. UNRESOLVED 감지 로직

### `src/lib/pipeline/unresolved.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

// 대명사/모호 지시어 패턴
const UNRESOLVED_PATTERNS = [
  { pattern: /\b(걔|걔네|그 사람|그분|그녀|그|쟤)\b/g, type: 'person' },
  { pattern: /\b(거기|그곳|저기|거기서)\b/g, type: 'location' },
  { pattern: /\b(그것|그거|그게|그걸|이것|이거)\b/g, type: 'thing' },
  { pattern: /\b(그 일|그 얘기|그때 일|그 사건)\b/g, type: 'event' },
];

interface DetectInput {
  userId?: string;
  nodeId: string;
  text: string;
  contextSnippet: Array<{ role: string; text: string }>;
}

export async function detectUnresolved(input: DetectInput) {
  if (!input.userId) return;

  const supabase = await createClient();
  const found: Array<{ raw: string; type: string }> = [];

  for (const { pattern, type } of UNRESOLVED_PATTERNS) {
    const matches = input.text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!found.find(f => f.raw === match)) {
          found.push({ raw: match, type });
        }
      });
    }
  }

  if (found.length === 0) return;

  // unresolved_entities 테이블에 저장
  await supabase.from('unresolved_entities').insert(
    found.map(f => ({
      user_id: input.userId,
      node_id: input.nodeId,
      raw_text: f.raw,
      context_snippet: input.contextSnippet,
      resolution_status: 'pending',
    }))
  );
}
```

---

## Step 2. /accuracy 페이지

### `src/app/(private)/accuracy/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server';
import { AccuracyClient } from './AccuracyClient';

export default async function AccuracyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: entities } = await supabase
    .from('unresolved_entities')
    .select('*')
    .eq('user_id', user!.id)
    .eq('resolution_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  return <AccuracyClient entities={entities ?? []} />;
}
```

### `src/app/(private)/accuracy/AccuracyClient.tsx`

```typescript
'use client';

import { useState } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button,
  TextInput, Badge, Box, Progress, Center
} from '@mantine/core';
import { CheckCircle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

interface UnresolvedEntity {
  id: string;
  raw_text: string;
  context_snippet: Array<{ role: string; text: string }>;
  candidates?: string[];
}

interface AccuracyClientProps {
  entities: UnresolvedEntity[];
}

// 타입별 기본 선택지
const DEFAULT_CANDIDATES: Record<string, string[]> = {
  person:   ['친구', '직장 동료', '가족', '지인'],
  location: ['집', '회사', '학교', '카페'],
  thing:    ['물건', '문서', '음식', '앱'],
  event:    ['약속', '회의', '사건', '대화'],
};

export function AccuracyClient({ entities: initialEntities }: AccuracyClientProps) {
  const supabase = createClient();
  const [entities, setEntities] = useState(initialEntities);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [customInput, setCustomInput] = useState('');

  const current = entities[currentIdx];
  const progress = Math.round(((currentIdx) / (entities.length || 1)) * 100);

  const handleResolve = async (resolvedTo: string) => {
    if (!current) return;

    await supabase
      .from('unresolved_entities')
      .update({
        resolution_status: 'manual',
        resolved_node_id: null, // TODO: 실제 노드 연결
      })
      .eq('id', current.id);

    // 다음 항목으로
    setCurrentIdx(i => i + 1);
    setCustomInput('');
  };

  const handleSkip = () => {
    setCurrentIdx(i => i + 1);
    setCustomInput('');
  };

  // 전부 처리 완료
  if (!current || currentIdx >= entities.length) {
    return (
      <Center h="60vh">
        <Stack align="center" gap="md">
          <CheckCircle size={48} weight="light" />
          <Text fw={600} fz="lg">완벽해요!</Text>
          <Text c="dimmed" ta="center">
            우주가 더 정교해졌어요 🌟
          </Text>
        </Stack>
      </Center>
    );
  }

  const candidates = current.candidates ?? DEFAULT_CANDIDATES['person'] ?? [];

  return (
    <Stack gap="xl" p="xl" maw={600} mx="auto">
      <Stack gap="xs">
        <Title order={2}>정확도 높이기</Title>
        <Text c="dimmed" fz="sm">
          OU가 아직 모르는 것들이에요. 알려주시면 더 정확해져요.
        </Text>
        <Progress value={progress} size="xs" mt="xs" color="gray" />
        <Text fz="xs" c="dimmed">{currentIdx}/{entities.length}</Text>
      </Stack>

      <Paper p="lg">
        <Stack gap="lg">
          {/* 대화 컨텍스트 스니펫 */}
          {current.context_snippet?.length > 0 && (
            <Stack gap="xs">
              <Text fz="xs" c="dimmed">이 대화에서</Text>
              <Box
                p="sm"
                style={{
                  background: 'var(--mantine-color-dark-6)',
                  borderRadius: 8,
                  borderLeft: '2px solid var(--mantine-color-default-border)',
                }}
              >
                {current.context_snippet.map((msg, i) => (
                  <Text key={i} fz="sm" mb={4}>
                    <Text span c="dimmed" fz="xs">{msg.role === 'user' ? '나' : 'OU'}: </Text>
                    <Text span
                      style={{
                        background: msg.text.includes(current.raw_text)
                          ? 'var(--mantine-color-yellow-9)'
                          : 'transparent',
                      }}
                    >
                      {msg.text}
                    </Text>
                  </Text>
                ))}
              </Box>
            </Stack>
          )}

          {/* 질문 */}
          <Text fw={600}>
            <Badge variant="outline" color="gray" mr="xs">{current.raw_text}</Badge>
            가 누구예요 / 무엇이에요?
          </Text>

          {/* 객관식 선택지 */}
          <Stack gap="xs">
            {candidates.map(candidate => (
              <Button
                key={candidate}
                variant="light"
                color="gray"
                justify="flex-start"
                onClick={() => handleResolve(candidate)}
              >
                {candidate}
              </Button>
            ))}

            {/* 직접 입력 */}
            <Group gap="xs">
              <TextInput
                placeholder="직접 입력..."
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                flex={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customInput.trim()) {
                    handleResolve(customInput.trim());
                  }
                }}
              />
              <Button
                variant="light"
                onClick={() => customInput.trim() && handleResolve(customInput.trim())}
                disabled={!customInput.trim()}
              >
                입력
              </Button>
            </Group>
          </Stack>

          {/* 건너뛰기 */}
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            onClick={handleSkip}
          >
            건너뛰기
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
```

---

## Step 3. Sidebar UNRESOLVED 배지

`src/components/ui/Sidebar.tsx`의 `/accuracy` 항목에 배지 추가:

```typescript
// useEffect로 UNRESOLVED 카운트 조회
const [unresolvedCount, setUnresolvedCount] = useState(0);

useEffect(() => {
  if (!user) return;
  supabase
    .from('unresolved_entities')
    .select('id', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('resolution_status', 'pending')
    .then(({ count }) => setUnresolvedCount(count ?? 0));
}, [user]);

// NavButton의 /accuracy 항목에 배지 오버레이
// item.id === 'accuracy' && unresolvedCount > 0 → Badge 표시
```

---

## Step 4. 킬러 데모 E2E 검증

VISION.md의 킬러 데모 시나리오를 순서대로 실행:

```
1. 비로그인으로 /chat 접속
   → 온보딩 메시지 출력 확인

2. "다음주 일요일 희민이 결혼식" 입력
   → 스트리밍 응답 확인
   → NodeCreatedBadge "💫 일정 노드가 생성됐어요" 확인
   → 5회 이상 대화 후 SaveNudge 등장 확인

3. SaveNudge [Google로 저장] 클릭
   → OAuth 완료 → /my 리다이렉트

4. /my 접속
   → schedule DataNode 3개 이상 → CalendarView 자동 표시 확인
   → "희민 결혼식" 날짜 하이라이트 확인

5. "나 결혼식 언제였지?" 채팅 입력
   → OU가 캘린더뷰 언급하는 응답 확인
   → ViewRecommendBadge 표시 확인

6. /accuracy 접속
   → UNRESOLVED 항목 있으면 표시
   → 선택지 선택 → 해소 확인

7. 전체 pnpm build 통과 확인
```

---

## Step 5. 최종 정리

### 환경변수 실제 값 입력 확인
```env
NEXT_PUBLIC_SUPABASE_URL=✅
NEXT_PUBLIC_SUPABASE_ANON_KEY=✅
ANTHROPIC_API_KEY=✅
GEMINI_API_KEY=✅ (이미지 첨부 OCR용, Phase 2)
```

### git 최종 커밋
```bash
git add .
git commit -m "feat: Phase 1 MVP 완성

- 인증 (Google OAuth + 이메일 verify)
- OU-Chat (스트리밍 + 중단/취소 + NodeCreatedBadge)
- DataNode 파이프라인 (Layer 1/2)
- AppShell + Sidebar + MobileNav
- 기본 DataView 3종 (Calendar, Kanban, KnowledgeGraph)
- PixiJS GraphView 60fps (Web Worker)
- 정확도 높이기 (/accuracy)
- 비로그인 5턴 → SaveNudge → OAuth 가입
- 킬러 데모 시나리오 E2E 통과"

git push origin main
```

---

## 완료 체크리스트

```
[ ] /accuracy 페이지 렌더링
[ ] UNRESOLVED 엔티티 감지 (대명사 패턴)
[ ] 객관식 선택 → 처리 완료 → 항목 사라짐
[ ] 직접 입력 → 처리
[ ] 건너뛰기 동작
[ ] 전부 처리 → "완벽해요!" 빈 상태
[ ] Sidebar /accuracy 배지 카운터
[ ] 킬러 데모 E2E 완주 (7단계 전부)
[ ] 전체 pnpm build 타입 에러 없이 통과
[ ] git 최종 커밋 + push
```

---

## Phase 1 완료 — 다음 단계

Phase 1 체크리스트 전부 완료 후 ROADMAP.md Phase 2로:

```
TASK_PHASE2_FILE_UPLOAD.md  → PDF 업로드 + R2 연동
TASK_PHASE2_VIEWER.md       → OU 내장 뷰어 (PDF.js)
TASK_PHASE2_SUBSCRIPTION.md → 광고 + Pro 구독 수익화
```

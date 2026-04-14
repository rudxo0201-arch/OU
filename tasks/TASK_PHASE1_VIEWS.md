# 작업 지시서 — Phase 1 Step 4: 기본 DataView 3종

> 선행 조건: TASK_PHASE1_CHAT.md 완료
> 완료 기준: 채팅 → NodeCreatedBadge 클릭 → 해당 뷰 렌더링 동작

---

## 사전 읽기

```
VIEWS.md                 뷰 타입 분류, 뷰 레지스트리 패턴, 추천 시스템
DATA_STANDARD.md         domain → view_hint 매핑
/ou-frontend/SKILL.md    섹션 6-3(ViewRenderer), 11(빈 상태)
```

---

## 구현 목록

```
[ ] ViewRenderer (뷰 레지스트리 패턴)
[ ] CalendarView (schedule DataNode)
[ ] KanbanView (task DataNode)
[ ] KnowledgeGraphView (knowledge DataNode, 간단한 버전)
[ ] /my 페이지에 뷰 목록 + 렌더링 연결
[ ] ViewRecommendBadge (채팅 인라인)
[ ] 뷰 저장 → Sidebar 아이콘 등록
```

---

## Step 1. 뷰 레지스트리

### `src/components/views/registry.ts`

```typescript
// 새 뷰 추가 = 이 파일에 등록만. 다른 파일 수정 금지.
import type { ComponentType } from 'react';

export interface ViewProps {
  nodes: any[];        // DataNode[]
  filters?: Record<string, any>;
  onSave?: () => void;
}

import { CalendarView }        from './CalendarView';
import { KanbanView }          from './KanbanView';
import { KnowledgeGraphView }  from './KnowledgeGraphView';

export const VIEW_REGISTRY: Record<string, ComponentType<ViewProps>> = {
  calendar:        CalendarView,
  task:            KanbanView,
  knowledge_graph: KnowledgeGraphView,
  // Phase 2 이후 추가 예정:
  // mindmap:      MindmapView,
  // chart:        ChartView,
  // journal:      JournalView,
  // relation_graph: RelationGraphView,
};

// domain → 기본 view_hint 매핑 (DATA_STANDARD.md 기준)
export const DOMAIN_VIEW_MAP: Record<string, string> = {
  schedule:  'calendar',
  task:      'task',
  habit:     'heatmap',
  knowledge: 'knowledge_graph',
  idea:      'mindmap',
  relation:  'relation_graph',
  emotion:   'journal',
  finance:   'chart',
};
```

### `src/components/views/ViewRenderer.tsx`

```typescript
'use client';

import { Box, Paper } from '@mantine/core';
import { VIEW_REGISTRY } from './registry';

interface ViewRendererProps {
  viewType: string;
  nodes: any[];
  filters?: Record<string, any>;
  onSave?: () => void;
  inline?: boolean;   // 채팅 인라인 렌더링 여부
}

export function ViewRenderer({ viewType, nodes, filters, onSave, inline }: ViewRendererProps) {
  const View = VIEW_REGISTRY[viewType];

  // ⚠️ 필터 원칙 (CLAUDE.md 불변):
  // 빈 결과가 나오는 뷰는 렌더링 자체를 하지 않는다.
  // 사용자는 빈 뷰를 볼 수 없다. 빈 상태 UI 표시 금지.
  // → 호출부(MyPageClient 등)에서 nodes.length > 0 체크 후 렌더링할 것.
  if (!nodes || nodes.length === 0) return null;

  // 등록되지 않은 뷰 타입 (개발 환경 디버그용, 사용자에게 노출 금지)
  if (!View) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[ViewRenderer] 등록되지 않은 뷰 타입: ${viewType}`);
    }
    return null;
  }

  return (
    <Box
      style={inline ? {
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        overflow: 'hidden',
        maxHeight: 400,
      } : undefined}
    >
      <View nodes={nodes} filters={filters} onSave={onSave} />
    </Box>
  );
}
```

---

## Step 2. CalendarView

### `src/components/views/CalendarView.tsx`

```typescript
'use client';

import { useState } from 'react';
import {
  Box, Grid, Text, Stack, Group,
  Badge, ActionIcon, Paper
} from '@mantine/core';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

export function CalendarView({ nodes }: ViewProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');
  const startDay = startOfMonth.day(); // 0=일요일

  // schedule DataNode에서 날짜 추출
  const events = nodes
    .filter(n => n.domain === 'schedule' && n.domain_data?.date)
    .map(n => ({
      id: n.id,
      date: dayjs(n.domain_data.date),
      title: n.domain_data.title ?? n.raw?.slice(0, 20) ?? '일정',
    }));

  const getEventsForDate = (date: dayjs.Dayjs) =>
    events.filter(e => e.date.format('YYYY-MM-DD') === date.format('YYYY-MM-DD'));

  // 달력 날짜 배열 생성
  const days: (dayjs.Dayjs | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: endOfMonth.date() }, (_, i) =>
      startOfMonth.add(i, 'day')
    ),
  ];

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Stack gap="sm" p="md">
      {/* 헤더 */}
      <Group justify="space-between">
        <ActionIcon variant="subtle" color="gray" onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))}>
          <CaretLeft size={16} />
        </ActionIcon>
        <Text fw={600}>{currentMonth.format('YYYY년 M월')}</Text>
        <ActionIcon variant="subtle" color="gray" onClick={() => setCurrentMonth(m => m.add(1, 'month'))}>
          <CaretRight size={16} />
        </ActionIcon>
      </Group>

      {/* 요일 헤더 */}
      <Grid columns={7} gutter={4}>
        {WEEKDAYS.map(day => (
          <Grid.Col key={day} span={1}>
            <Text ta="center" fz={11} c="dimmed">{day}</Text>
          </Grid.Col>
        ))}
      </Grid>

      {/* 날짜 그리드 */}
      <Grid columns={7} gutter={4}>
        {days.map((day, i) => {
          if (!day) return <Grid.Col key={`empty-${i}`} span={1} />;
          const dayEvents = getEventsForDate(day);
          const isToday = day.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');

          return (
            <Grid.Col key={day.format('YYYY-MM-DD')} span={1}>
              <Paper
                p={4}
                style={{
                  minHeight: 60,
                  border: isToday
                    ? '1px solid var(--mantine-color-brand-6)'
                    : '0.5px solid var(--mantine-color-default-border)',
                  borderRadius: 4,
                }}
              >
                <Text
                  fz={11}
                  fw={isToday ? 700 : 400}
                  c={isToday ? 'brand.6' : undefined}
                >
                  {day.date()}
                </Text>
                <Stack gap={2} mt={2}>
                  {dayEvents.slice(0, 2).map(e => (
                    <Badge
                      key={e.id}
                      size="xs"
                      variant="light"
                      color="gray"
                      style={{ fontSize: 9, maxWidth: '100%' }}
                    >
                      {e.title}
                    </Badge>
                  ))}
                  {dayEvents.length > 2 && (
                    <Text fz={9} c="dimmed">+{dayEvents.length - 2}</Text>
                  )}
                </Stack>
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>
    </Stack>
  );
}
```

---

## Step 3. KanbanView

### `src/components/views/KanbanView.tsx`

```typescript
'use client';

import { Group, Stack, Paper, Text, Badge, ScrollArea } from '@mantine/core';
import type { ViewProps } from './registry';

const COLUMNS = [
  { id: 'todo',        label: '할 일',  color: 'gray'  },
  { id: 'in_progress', label: '진행 중', color: 'blue'  },
  { id: 'done',        label: '완료',   color: 'green' },
];

export function KanbanView({ nodes }: ViewProps) {
  const tasks = nodes.filter(n => n.domain === 'task');

  const getTasksByStatus = (status: string) =>
    tasks.filter(n => (n.domain_data?.status ?? 'todo') === status);

  return (
    <ScrollArea>
      <Group gap="md" p="md" align="flex-start" wrap="nowrap">
        {COLUMNS.map(col => {
          const colTasks = getTasksByStatus(col.id);
          return (
            <Stack key={col.id} gap="sm" style={{ minWidth: 200, flex: 1 }}>
              {/* 컬럼 헤더 */}
              <Group gap="xs">
                <Text fz="sm" fw={600}>{col.label}</Text>
                <Badge size="xs" variant="light" color={col.color}>
                  {colTasks.length}
                </Badge>
              </Group>

              {/* 태스크 카드 */}
              {colTasks.map(task => (
                <Paper key={task.id} p="sm">
                  <Text fz="sm" lineClamp={2}>
                    {task.domain_data?.title ?? task.raw?.slice(0, 50) ?? '태스크'}
                  </Text>
                  {task.domain_data?.due && (
                    <Text fz={11} c="dimmed" mt={4}>
                      마감: {task.domain_data.due}
                    </Text>
                  )}
                </Paper>
              ))}

              {colTasks.length === 0 && (
                <Text fz="xs" c="dimmed" ta="center" py="sm">없음</Text>
              )}
            </Stack>
          );
        })}
      </Group>
    </ScrollArea>
  );
}
```

---

## Step 4. KnowledgeGraphView (간단한 버전)

> Phase 1: D3 기반 간단한 그래프. PixiJS 풀버전은 TASK_PHASE1_GRAPHVIEW.md에서.

### `src/components/views/KnowledgeGraphView.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Box, Text, Stack } from '@mantine/core';
import type { ViewProps } from './registry';

// Phase 1: SVG 기반 간단한 노드 시각화
// Phase 2: PixiJS WebGL로 업그레이드 (TASK_PHASE1_GRAPHVIEW.md)
export function KnowledgeGraphView({ nodes }: ViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = svgRef.current;
    const W = svg.clientWidth || 400;
    const H = svg.clientHeight || 300;

    // 간단한 원형 배치
    const angleStep = (2 * Math.PI) / nodes.length;
    const radius = Math.min(W, H) * 0.35;
    const cx = W / 2;
    const cy = H / 2;

    svg.innerHTML = '';

    nodes.slice(0, 20).forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      // 노드 원
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(x));
      circle.setAttribute('cy', String(y));
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', 'var(--mantine-color-brand-6)');
      circle.setAttribute('opacity', '0.8');
      svg.appendChild(circle);

      // 중심 → 노드 선
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(cx));
      line.setAttribute('y1', String(cy));
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', 'var(--mantine-color-default-border)');
      line.setAttribute('stroke-width', '0.5');
      svg.insertBefore(line, circle);

      // 라벨
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y - 10));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', 'currentColor');
      text.textContent = (node.raw ?? '').slice(0, 10);
      svg.appendChild(text);
    });

    // 중심 노드
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', String(cx));
    centerCircle.setAttribute('cy', String(cy));
    centerCircle.setAttribute('r', '10');
    centerCircle.setAttribute('fill', 'var(--mantine-color-brand-6)');
    svg.appendChild(centerCircle);

  }, [nodes]);

  if (nodes.length === 0) return null;

  return (
    <Stack gap="xs" p="sm">
      <Text fz="xs" c="dimmed">지식 그래프 (Phase 2에서 PixiJS로 업그레이드)</Text>
      <Box style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <svg
          ref={svgRef}
          width="100%"
          height={300}
          style={{ display: 'block' }}
        />
      </Box>
    </Stack>
  );
}
```

---

## Step 5. /my 페이지 — DataView 목록

### `src/app/(private)/my/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server';
import { MyPageClient } from './MyPageClient';

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 저장된 뷰 목록
  const { data: savedViews } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  // 최근 DataNode (그래프뷰용)
  const { data: nodes } = await supabase
    .from('data_nodes')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return <MyPageClient savedViews={savedViews ?? []} nodes={nodes ?? []} />;
}
```

### `src/app/(private)/my/MyPageClient.tsx`

```typescript
'use client';

import { Stack, Title, Text, SimpleGrid, Paper, Group, Button, Badge } from '@mantine/core';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { DOMAIN_VIEW_MAP } from '@/components/views/registry';
import { Plus } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface MyPageClientProps {
  savedViews: any[];
  nodes: any[];
}

export function MyPageClient({ savedViews, nodes }: MyPageClientProps) {
  const router = useRouter();

  // 도메인별 노드 그룹화 (뷰 추천용)
  const domainGroups = nodes.reduce((acc, node) => {
    if (!acc[node.domain]) acc[node.domain] = [];
    acc[node.domain].push(node);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Stack gap="xl" p="xl">
      <Group justify="space-between">
        <Title order={2}>내 우주</Title>
        <Button
          leftSection={<Plus size={16} />}
          variant="light"
          size="sm"
          onClick={() => router.push('/chat')}
        >
          채팅으로 추가
        </Button>
      </Group>

      {/* 저장된 뷰들 */}
      {savedViews.length > 0 && (
        <Stack gap="md">
          <Text fw={600} fz="sm">저장된 뷰</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {savedViews.map(view => (
              <Paper
                key={view.id}
                p="md"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/view/${view.id}`)}
              >
                <Group gap="xs">
                  <Text fz={18}>{view.icon ?? '◆'}</Text>
                  <Stack gap={2}>
                    <Text fz="sm" fw={500}>{view.name}</Text>
                    <Badge size="xs" variant="light" color="gray">
                      {view.view_type}
                    </Badge>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {/* 도메인별 빠른 뷰 — 필터 원칙: nodes 있는 domain만 표시, ViewRenderer는 null 반환 안 함 */}
      {Object.entries(domainGroups)
        .filter(([_, nodes]) => (nodes as any[]).length >= 3)  // 3개 미만 → 뷰 미표시 (빈 뷰 방지)
        .map(([domain, domainNodes]) => {
          const viewType = DOMAIN_VIEW_MAP[domain];
          if (!viewType) return null;
          return (
            <Stack key={domain} gap="sm">
              <Group justify="space-between">
                <Text fw={600} fz="sm" tt="capitalize">{domain} ({(domainNodes as any[]).length}개)</Text>
                <Button size="xs" variant="subtle">저장하기</Button>
              </Group>
              <ViewRenderer
                viewType={viewType}
                nodes={domainNodes as any[]}
              />
            </Stack>
          );
        })}

      {/* 빈 상태 */}
      {nodes.length === 0 && (
        <Stack align="center" py="xl" gap="md">
          <Text c="dimmed">아직 우주가 비어있어요</Text>
          <Button onClick={() => router.push('/chat')}>대화 시작하기</Button>
        </Stack>
      )}
    </Stack>
  );
}
```

---

## Step 6. ViewRecommendBadge (채팅 인라인)

### `src/components/chat/ViewRecommendBadge.tsx`

```typescript
'use client';

import { Paper, Group, Text, Button } from '@mantine/core';
import { useState } from 'react';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { useNavigationStore } from '@/stores/navigationStore';

interface ViewRecommendBadgeProps {
  domain: string;
  viewType: string;
  nodes: any[];
}

const RECOMMEND_COPY: Record<string, string> = {
  calendar:        '📅 일정이 꽤 쌓였네요. 캘린더뷰로 볼까요?',
  task:            '📋 할 일이 쌓이고 있어요. 칸반뷰로 볼까요?',
  knowledge_graph: '🔭 지식이 쌓이고 있어요. 그래프뷰로 볼까요?',
  chart:           '💰 지출이 쌓였네요. 차트뷰로 볼까요?',
};

export function ViewRecommendBadge({ domain, viewType, nodes }: ViewRecommendBadgeProps) {
  const [shown, setShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const { addSavedView } = useNavigationStore();

  const handleShow = () => setShown(true);

  const handleSave = () => {
    addSavedView({
      id: `${domain}-${Date.now()}`,
      name: `${domain} 뷰`,
      viewType,
    });
    setSaved(true);
  };

  if (saved) return (
    <Text fz="sm" c="dimmed">뷰가 저장됐어요 ✓</Text>
  );

  return (
    <Paper p="sm">
      <Group justify="space-between" mb={shown ? 'sm' : 0}>
        <Text fz="sm">{RECOMMEND_COPY[viewType] ?? '뷰로 볼까요?'}</Text>
        <Group gap="xs">
          {!shown && (
            <Button size="xs" variant="light" onClick={handleShow}>
              네, 보여줘
            </Button>
          )}
          {shown && (
            <Button size="xs" variant="light" onClick={handleSave}>
              저장하기
            </Button>
          )}
          <Button size="xs" variant="subtle" color="gray" onClick={() => {}}>
            괜찮아
          </Button>
        </Group>
      </Group>
      {shown && (
        <ViewRenderer viewType={viewType} nodes={nodes} inline />
      )}
    </Paper>
  );
}
```

---

## 완료 체크리스트

```
[ ] ViewRenderer 뷰 레지스트리 패턴 동작
[ ] CalendarView: schedule DataNode → 날짜 렌더링
[ ] KanbanView: task DataNode → 컬럼별 카드 렌더링
[ ] KnowledgeGraphView: knowledge DataNode → SVG 노드 렌더링
[ ] /my 페이지: 도메인별 DataNode 3개 이상 → 뷰 자동 표시
[ ] ViewRecommendBadge: [네, 보여줘] → 인라인 렌더링
[ ] ViewRecommendBadge: [저장하기] → Sidebar 아이콘 등록
[ ] 빈 상태: "채팅에서 말씀해보세요" 표시
[ ] 필터 원칙: 3개 미만 도메인은 뷰 미표시
[ ] pnpm build 통과
[ ] git commit: "feat: 기본 DataView 3종 (Calendar, Kanban, KnowledgeGraph)"
```

---

## 다음 작업

**TASK_PHASE1_GRAPHVIEW.md** → PixiJS 그래프뷰 (60fps)

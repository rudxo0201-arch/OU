# 작업 지시서 — Phase 3 Step 1: SNS 채널 (/feed + 프로필뷰)

> 선행 조건: Phase 2 전체 완료
> 완료 기준: /feed 피드뷰 + 프로필뷰 + 공개 DataNode 공유 동작

---

## 사전 읽기

```
PLATFORM.md    레이어 4(SNS 채널), 프로필뷰, 피드뷰, 상호작용=DataNode
VIEWS.md       피드뷰, 갤러리뷰
BUSINESS.md    광고 위치 (인기 DataView 열람 시), "Made with OU" 배지
```

---

## 구현 목록

```
[ ] /feed 피드 페이지
[ ] 피드뷰 (구독한 사람들의 DataNode 시간순)
[ ] 프로필뷰 (/profile/[handle])
[ ] DataNode 공개 설정 (private/link/public)
[ ] 팔로우/언팔로우
[ ] 좋아요 → DataNode 저장
[ ] 댓글 → DataNode + relation 연결
[ ] "Made with OU" 배지 (공개 DataView 하단)
[ ] OG 이미지 자동 생성 (공유 시 미리보기)
[ ] 멀티 페르소나 (personas 테이블)
```

---

## Step 1. /feed 페이지

### `src/app/(private)/feed/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server';
import { FeedClient } from './FeedClient';

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 팔로우한 페르소나들의 공개 DataNode
  const { data: feedNodes } = await supabase
    .from('data_nodes')
    .select(`
      *,
      profiles(display_name, avatar_url)
    `)
    .eq('visibility', 'public')
    .neq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(30);

  return <FeedClient nodes={feedNodes ?? []} />;
}
```

### `src/app/(private)/feed/FeedClient.tsx`

```typescript
'use client';

import { Stack, Text, Paper, Group, Avatar, Badge,
         ActionIcon, Box, Divider } from '@mantine/core';
import { Heart, ChatCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { DOMAIN_VIEW_MAP } from '@/components/views/registry';
import { AdBanner } from '@/components/ui/AdBanner';

export function FeedClient({ nodes }: { nodes: any[] }) {
  const handleLike = async (nodeId: string) => {
    // 좋아요 = DataNode 생성
    // {subject: 나, predicate: 'related_to', object: nodeId}
    await fetch('/api/social/like', {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return (
    <Stack gap="md" maw={640} mx="auto" p="xl">
      {nodes.map((node, i) => (
        <Box key={node.id}>
          <Paper p="md">
            {/* 작성자 */}
            <Group mb="sm">
              <Avatar src={node.profiles?.avatar_url} size="sm" radius="xl" />
              <Text fz="sm" fw={500}>{node.profiles?.display_name}</Text>
              <Badge variant="light" color="gray" size="xs">{node.domain}</Badge>
              <Text fz="xs" c="dimmed" ml="auto">
                {new Date(node.created_at).toLocaleDateString('ko-KR')}
              </Text>
            </Group>

            {/* 내용 */}
            <Text fz="sm" mb="sm" lineClamp={3}>{node.raw}</Text>

            {/* DataView 렌더링 (데이터 있을 때만) */}
            {DOMAIN_VIEW_MAP[node.domain] && (
              <Box mb="sm">
                <ViewRenderer
                  viewType={DOMAIN_VIEW_MAP[node.domain]}
                  nodes={[node]}
                  inline
                />
              </Box>
            )}

            {/* 상호작용 */}
            <Group gap="md">
              <ActionIcon variant="subtle" color="gray" onClick={() => handleLike(node.id)}>
                <Heart size={18} weight="light" />
              </ActionIcon>
              <ActionIcon variant="subtle" color="gray">
                <ChatCircle size={18} weight="light" />
              </ActionIcon>
              <ActionIcon variant="subtle" color="gray">
                <ArrowsClockwise size={18} weight="light" />
              </ActionIcon>
            </Group>

            {/* Made with OU 배지 */}
            <Divider my="xs" />
            <Text fz={10} c="dimmed" ta="right">Made with OU</Text>
          </Paper>

          {/* 광고 (Free 플랜, 5개마다) */}
          {i % 5 === 4 && <AdBanner position="feed" plan="free" />}
        </Box>
      ))}
    </Stack>
  );
}
```

---

## Step 2. 프로필뷰

### `src/app/(public)/profile/[handle]/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from './ProfileClient';
import { notFound } from 'next/navigation';

export default async function ProfilePage({ params }: { params: { handle: string } }) {
  const supabase = await createClient();

  const { data: persona } = await supabase
    .from('personas')
    .select('*, profiles(*)')
    .eq('handle', params.handle)
    .single();

  if (!persona) return notFound();

  // 이 페르소나의 공개 DataNode
  const { data: nodes } = await supabase
    .from('persona_node_visibility')
    .select('data_nodes(*)')
    .eq('persona_id', persona.id)
    .eq('is_visible', true)
    .limit(50);

  const publicNodes = nodes?.map(n => n.data_nodes) ?? [];

  return <ProfileClient persona={persona} nodes={publicNodes} />;
}
```

### `src/app/(public)/profile/[handle]/ProfileClient.tsx`

```typescript
'use client';

import { Stack, Group, Avatar, Text, Button, SimpleGrid, Paper, Badge } from '@mantine/core';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { DOMAIN_VIEW_MAP } from '@/components/views/registry';

export function ProfileClient({ persona, nodes }: { persona: any; nodes: any[] }) {
  // 도메인별 그룹화
  const domainGroups = nodes.reduce((acc, node) => {
    if (!acc[node.domain]) acc[node.domain] = [];
    acc[node.domain].push(node);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Stack gap="xl" maw={800} mx="auto" p="xl">
      {/* 프로필 헤더 */}
      <Group>
        <Avatar src={persona.avatar_url} size="xl" radius="xl" />
        <Stack gap={4}>
          <Text fw={700} fz="xl">{persona.display_name}</Text>
          <Text c="dimmed" fz="sm">@{persona.handle}</Text>
          <Text fz="sm">{persona.bio}</Text>
        </Stack>
        <Button variant="light" ml="auto">팔로우</Button>
      </Group>

      {/* 공개 DataView들 */}
      {Object.entries(domainGroups)
        .filter(([_, ns]) => (ns as any[]).length > 0)
        .map(([domain, ns]) => {
          const viewType = DOMAIN_VIEW_MAP[domain];
          if (!viewType) return null;
          return (
            <Stack key={domain} gap="sm">
              <Badge variant="light" color="gray">{domain}</Badge>
              <ViewRenderer viewType={viewType} nodes={ns as any[]} />
            </Stack>
          );
        })}

      {/* Made with OU */}
      <Text fz="xs" c="dimmed" ta="center">Made with OU · ouuniverse.com</Text>
    </Stack>
  );
}
```

---

## Step 3. OG 이미지 생성 (공유 시 미리보기)

### `src/app/api/og/[nodeId]/route.tsx`

```typescript
import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: { nodeId: string } }) {
  const supabase = await createClient();
  const { data: node } = await supabase
    .from('data_nodes')
    .select('raw, domain')
    .eq('id', params.nodeId)
    .single();

  return new ImageResponse(
    (
      <div style={{
        background: '#060810', color: 'white',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: 60, fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: 20, opacity: 0.5, marginBottom: 20 }}>OU · {node?.domain}</div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.4 }}>
          {node?.raw?.slice(0, 100)}
        </div>
        <div style={{ marginTop: 'auto', fontSize: 16, opacity: 0.4 }}>ouuniverse.com</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## Step 4. 멀티 페르소나

### `src/app/(private)/settings/personas/page.tsx`

```typescript
// 페르소나 목록 + 생성 + 공개 DataNode 설정
// personas 테이블 CRUD
// persona_node_visibility 설정 UI
```

---

## 완료 체크리스트

```
[ ] /feed 피드 렌더링 (공개 DataNode 시간순)
[ ] 좋아요 → data_nodes 저장 확인
[ ] /profile/[handle] 공개 프로필 렌더링
[ ] 팔로우 버튼 동작
[ ] OG 이미지 자동 생성 (/api/og/[nodeId])
[ ] "Made with OU" 배지 공개 뷰 하단 표시
[ ] Sidebar에 /feed 아이콘 활성화
[ ] pnpm build 통과
[ ] git commit: "feat: SNS 채널 (피드뷰 + 프로필뷰 + 공유)"
```

---

## 다음 작업

**TASK_PHASE3_MESSAGES.md** → OU 채팅 (/messages)

# 작업 지시서 — Phase 1 Step 7: 관리자 패널

> 선행 조건: TASK_PHASE1_ACCURACY.md 완료 (Phase 1 마지막 Step)
> 완료 기준: /admin 대시보드 + DataNode 관리 + 비용 모니터링 동작

---

## 사전 읽기

```
CLAUDE.md        관리자 정의, 보안 원칙 (2FA, IP 화이트리스트, 감사 로그)
VISION.md        관리자 역할 (생태계 첫 번째 생산자, 기본 DB 구축)
TECH.md          관리자 보안 (@ouuniverse.com, 1Password, 세션 30분)
ROADMAP.md       AI 에이전트 8번(비용 모니터링), KPI
```

---

## 구현 목록

```
[ ] /admin 레이아웃 (관리자 전용 보호)
[ ] 대시보드 탭 (DAU, DataNode 수, UNRESOLVED 비율, API 비용)
[ ] DataNode 관리 탭 (검색 + 필터 + 편집)
[ ] 신뢰도 큐 탭 (verification_requests)
[ ] 비용 모니터링 탭 (api_cost_log 차트)
[ ] 관리자 감사 로그 (api_audit_log)
[ ] 세션 타임아웃 30분 (관리자)
[ ] Sidebar에 관리자 메뉴 조건부 표시 완성
```

---

## Step 1. /admin 레이아웃 보호

### `src/app/(private)/admin/layout.tsx`

```typescript
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/roles';
import { logAdminAction } from '@/lib/auth/audit';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  if (!admin) redirect('/my');

  return (
    <div>
      {children}
    </div>
  );
}
```

---

## Step 2. 감사 로그 유틸

### `src/lib/auth/audit.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, any>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? 'unknown';

  await supabase.from('api_audit_log').insert({
    admin_id: user?.id,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
    ip_address: ip,
  });
}
```

---

## Step 3. 관리자 대시보드

### `src/app/(private)/admin/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server';
import { AdminDashboard } from './AdminDashboard';

export default async function AdminPage() {
  const supabase = await createClient();

  // 통계 조회
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: totalUsers },
    { count: totalNodes },
    { count: unresolvedCount },
    { data: costToday },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('data_nodes').select('*', { count: 'exact', head: true }),
    supabase.from('unresolved_entities')
      .select('*', { count: 'exact', head: true })
      .eq('resolution_status', 'pending'),
    supabase.from('api_cost_log')
      .select('cost_usd')
      .gte('created_at', today.toISOString()),
  ]);

  const totalCostToday = costToday?.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0) ?? 0;

  return (
    <AdminDashboard
      stats={{
        totalUsers: totalUsers ?? 0,
        totalNodes: totalNodes ?? 0,
        unresolvedCount: unresolvedCount ?? 0,
        costToday: totalCostToday,
      }}
    />
  );
}
```

### `src/app/(private)/admin/AdminDashboard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Tabs, Stack, Title, SimpleGrid, Paper, Text, Group, Badge } from '@mantine/core';
import { DataNodeManager } from './DataNodeManager';
import { VerifyQueue } from './VerifyQueue';
import { CostMonitor } from './CostMonitor';

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    totalNodes: number;
    unresolvedCount: number;
    costToday: number;
  };
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  return (
    <Stack gap="xl" p="xl">
      <Title order={2}>관리자 패널</Title>

      {/* 통계 카드 */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <StatCard label="전체 회원" value={stats.totalUsers.toLocaleString()} />
        <StatCard label="전체 DataNode" value={stats.totalNodes.toLocaleString()} />
        <StatCard
          label="UNRESOLVED"
          value={stats.unresolvedCount.toLocaleString()}
          alert={stats.unresolvedCount > 100}
        />
        <StatCard
          label="오늘 API 비용"
          value={`$${stats.costToday.toFixed(4)}`}
          alert={stats.costToday > 10}
        />
      </SimpleGrid>

      {/* 탭 */}
      <Tabs defaultValue="nodes">
        <Tabs.List>
          <Tabs.Tab value="nodes">DataNode 관리</Tabs.Tab>
          <Tabs.Tab value="verify">
            신뢰도 큐
            {stats.unresolvedCount > 0 && (
              <Badge size="xs" ml="xs" color="red">{stats.unresolvedCount}</Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="cost">비용 모니터링</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="nodes" pt="md">
          <DataNodeManager />
        </Tabs.Panel>
        <Tabs.Panel value="verify" pt="md">
          <VerifyQueue />
        </Tabs.Panel>
        <Tabs.Panel value="cost" pt="md">
          <CostMonitor />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function StatCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <Paper p="md">
      <Text fz="xs" c="dimmed">{label}</Text>
      <Text fz="xl" fw={700} c={alert ? 'red' : undefined}>{value}</Text>
    </Paper>
  );
}
```

---

## Step 4. DataNode 관리 탭

### `src/app/(private)/admin/DataNodeManager.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Stack, Group, TextInput, Select, Table,
  Badge, ActionIcon, Text, Pagination
} from '@mantine/core';
import { MagnifyingGlass, PencilSimple } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

export function DataNodeManager() {
  const supabase = createClient();
  const [nodes, setNodes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => { fetchNodes(); }, [search, domain, confidence, page]);

  const fetchNodes = async () => {
    let query = supabase
      .from('data_nodes')
      .select('id, domain, confidence, resolution, raw, created_at, user_id', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (search) query = query.ilike('raw', `%${search}%`);
    if (domain) query = query.eq('domain', domain);
    if (confidence) query = query.eq('confidence', confidence);

    const { data, count } = await query;
    setNodes(data ?? []);
    setTotal(count ?? 0);
  };

  const confidenceColor: Record<string, string> = {
    high: 'green', medium: 'yellow', low: 'red',
  };

  return (
    <Stack gap="md">
      <Group>
        <TextInput
          placeholder="검색..."
          leftSection={<MagnifyingGlass size={16} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          flex={1}
        />
        <Select
          placeholder="도메인"
          data={['schedule','task','knowledge','idea','relation','emotion','finance','unresolved']}
          value={domain}
          onChange={setDomain}
          clearable
          w={140}
        />
        <Select
          placeholder="신뢰도"
          data={['high','medium','low']}
          value={confidence}
          onChange={setConfidence}
          clearable
          w={120}
        />
      </Group>

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>내용</Table.Th>
            <Table.Th>도메인</Table.Th>
            <Table.Th>신뢰도</Table.Th>
            <Table.Th>생성일</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {nodes.map(node => (
            <Table.Tr key={node.id}>
              <Table.Td>
                <Text fz="sm" lineClamp={1} maw={300}>
                  {node.raw ?? '-'}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color="gray" size="sm">{node.domain}</Badge>
              </Table.Td>
              <Table.Td>
                <Badge
                  variant="light"
                  color={confidenceColor[node.confidence] ?? 'gray'}
                  size="sm"
                >
                  {node.confidence}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text fz="xs" c="dimmed">
                  {new Date(node.created_at).toLocaleDateString('ko-KR')}
                </Text>
              </Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" size="sm">
                  <PencilSimple size={14} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Pagination
        total={Math.ceil(total / PAGE_SIZE)}
        value={page}
        onChange={setPage}
        size="sm"
      />
    </Stack>
  );
}
```

---

## Step 5. 신뢰도 큐 탭 (집단지성)

### `src/app/(private)/admin/VerifyQueue.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Stack, Paper, Group, Text, Button, Badge } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';

export function VerifyQueue() {
  const supabase = createClient();
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('verification_requests')
      .select('*, data_nodes(raw, domain)')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(20);
    setRequests(data ?? []);
  };

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    await supabase
      .from('verification_requests')
      .update({
        status: action === 'approve' ? 'resolved' : 'escalated',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);
    fetchRequests();
  };

  if (requests.length === 0) {
    return <Text c="dimmed" ta="center" py="xl">검토 대기 항목이 없어요 ✓</Text>;
  }

  return (
    <Stack gap="md">
      {requests.map(req => (
        <Paper key={req.id} p="md">
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <Badge variant="light" color="gray">{req.data_nodes?.domain}</Badge>
              <Badge variant="outline" size="xs">{req.reason}</Badge>
            </Group>
            <Group gap="xs">
              <Text fz="xs" c="dimmed">
                승인 {req.vote_approve} / 거부 {req.vote_reject}
              </Text>
            </Group>
          </Group>

          <Text fz="sm" mb="md" lineClamp={3}>
            {req.data_nodes?.raw ?? '-'}
          </Text>

          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              color="green"
              onClick={() => handleResolve(req.id, 'approve')}
            >
              승인
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              onClick={() => handleResolve(req.id, 'reject')}
            >
              거부
            </Button>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
```

---

## Step 6. 비용 모니터링 탭

### `src/app/(private)/admin/CostMonitor.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Stack, Table, Text, Group, Badge, Paper } from '@mantine/core';
import { createClient } from '@/lib/supabase/client';

export function CostMonitor() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => { fetchCosts(); }, []);

  const fetchCosts = async () => {
    const { data } = await supabase
      .from('api_cost_log')
      .select('operation, model, tokens, cost_usd, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    setLogs(data ?? []);

    // operation별 합산
    const sums: Record<string, number> = {};
    data?.forEach(log => {
      sums[log.operation] = (sums[log.operation] ?? 0) + (log.cost_usd ?? 0);
    });
    setSummary(sums);
  };

  const totalCost = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <Stack gap="md">
      {/* 요약 */}
      <Paper p="md">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>최근 50건 합계</Text>
          <Text fw={700} fz="lg">${totalCost.toFixed(4)}</Text>
        </Group>
        <Group gap="xs">
          {Object.entries(summary).map(([op, cost]) => (
            <Badge key={op} variant="light" color="gray">
              {op}: ${cost.toFixed(4)}
            </Badge>
          ))}
        </Group>
      </Paper>

      {/* 로그 테이블 */}
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>작업</Table.Th>
            <Table.Th>모델</Table.Th>
            <Table.Th>토큰</Table.Th>
            <Table.Th>비용(USD)</Table.Th>
            <Table.Th>시각</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {logs.map(log => (
            <Table.Tr key={log.id}>
              <Table.Td>
                <Badge variant="light" color="gray" size="xs">{log.operation}</Badge>
              </Table.Td>
              <Table.Td><Text fz="xs">{log.model}</Text></Table.Td>
              <Table.Td><Text fz="xs">{log.tokens?.toLocaleString()}</Text></Table.Td>
              <Table.Td>
                <Text fz="xs" c={log.cost_usd > 0.01 ? 'red' : undefined}>
                  ${log.cost_usd?.toFixed(6)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text fz="xs" c="dimmed">
                  {new Date(log.created_at).toLocaleString('ko-KR')}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
```

---

## Step 7. Sidebar 관리자 메뉴 완성

`src/components/ui/Sidebar.tsx` — isAdmin 체크 추가:

```typescript
// useAuth에 isAdmin 추가 필요
const { user, signOut } = useAuth();
const [admin, setAdmin] = useState(false);

useEffect(() => {
  if (user?.email?.endsWith('@ouuniverse.com')) {
    setAdmin(true);
  }
}, [user]);

// 관리자 메뉴 표시
{admin && (
  <Tooltip label="관리자" position="right" disabled={!collapsed}>
    <UnstyledButton
      className={classes.navButton}
      data-active={pathname.startsWith('/admin') || undefined}
      onClick={() => router.push('/admin')}
    >
      <Crown size={22} weight={pathname.startsWith('/admin') ? 'fill' : 'light'} />
      {!collapsed && <Text fz="sm">관리자</Text>}
    </UnstyledButton>
  </Tooltip>
)}
```

---

## Step 8. 관리자 세션 타임아웃 (30분)

미들웨어에서 관리자 경로 세션 시간 체크:

```typescript
// src/middleware.ts 에 추가
if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && user) {
  const { data: session } = await supabase.auth.getSession();
  const lastActivity = session?.session?.updated_at;

  if (lastActivity) {
    const inactiveMs = Date.now() - new Date(lastActivity).getTime();
    const thirtyMin = 30 * 60 * 1000;

    if (inactiveMs > thirtyMin) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?reason=timeout', request.url));
    }
  }
}
```

---

## 완료 체크리스트

```
[ ] /admin 비관리자 접근 → /my 리다이렉트
[ ] 대시보드: 회원수, DataNode수, UNRESOLVED수, 오늘 API 비용 표시
[ ] DataNode 관리: 검색 + 도메인/신뢰도 필터 + 페이지네이션
[ ] 신뢰도 큐: verification_requests 목록 + 승인/거부 동작
[ ] 비용 모니터링: api_cost_log 표시 + operation별 합계
[ ] Sidebar 관리자 메뉴 @ouuniverse.com 계정에만 표시
[ ] 관리자 세션 30분 타임아웃
[ ] api_audit_log 기록 동작 확인
[ ] pnpm build 통과
[ ] git commit: "feat: 관리자 패널 (대시보드 + DataNode 관리 + 비용 모니터링)"
```

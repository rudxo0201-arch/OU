'use client';

import { useState, useEffect } from 'react';
import { Tabs, Stack, Title, SimpleGrid, Paper, Text, Badge, Group, Avatar, Button, Box, SegmentedControl } from '@mantine/core';
import { Users, Database, Warning, CurrencyDollar, ArrowRight, ClockCounterClockwise, CheckCircle, XCircle, Table, Eye, UserList, FlowArrow, Lightning, Robot, Leaf } from '@phosphor-icons/react';
import type { ServiceStatus } from '@/lib/utils/check-env';
import { SERVICE_LABELS } from '@/lib/utils/check-env';
import { DataNodeManager } from './DataNodeManager';
import { VerifyQueue } from './VerifyQueue';
import { CostMonitor } from './CostMonitor';
import { AuditLog } from './AuditLog';
import { DBEditor } from './DBEditor';
import { ViewEditor } from './ViewEditor';
import { ViewSettings } from './ViewSettings';
import { MemberManager } from './MemberManager';
import { RoleManager } from './RoleManager';
import { ScenarioGenerator } from './ScenarioGenerator';
import { AgentDashboard } from './AgentDashboard';
import { BonchoManager } from './BonchoManager';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const UXFlowEditor = dynamic(() => import('./UXFlowEditor').then(m => m.UXFlowEditor), { ssr: false });

interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    totalNodes: number;
    unresolvedCount: number;
    costToday: number;
  };
  serviceStatus: ServiceStatus;
}

function StatCard({ label, value, icon, alert }: { label: string; value: string; icon: React.ReactNode; alert?: boolean }) {
  return (
    <Paper p="md">
      <Group justify="space-between" mb="xs">
        <Text fz="xs" c="dimmed">{label}</Text>
        <Box c="dimmed">{icon}</Box>
      </Group>
      <Text fz="xl" fw={700} c={alert ? 'red' : undefined}>{value}</Text>
    </Paper>
  );
}

interface RecentUser {
  id: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
}

export function AdminDashboard({ stats, serviceStatus }: AdminDashboardProps) {
  const router = useRouter();
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [todaySignups, setTodaySignups] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    // Recent users
    supabase
      .from('profiles')
      .select('id, display_name, email, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setRecentUsers(data ?? []));

    // Today signups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .then(({ count }) => setTodaySignups(count ?? 0));
  }, []);

  return (
    <Stack gap="xl" p="xl">
      <Title order={2}>관리자 패널</Title>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <StatCard
          label="전체 회원"
          value={stats.totalUsers.toLocaleString()}
          icon={<Users size={18} weight="light" />}
        />
        <StatCard
          label="전체 데이터"
          value={stats.totalNodes.toLocaleString()}
          icon={<Database size={18} weight="light" />}
        />
        <StatCard
          label="미확인 항목"
          value={stats.unresolvedCount.toLocaleString()}
          icon={<Warning size={18} weight="light" />}
          alert={stats.unresolvedCount > 100}
        />
        <StatCard
          label="오늘 API 비용"
          value={`$${stats.costToday.toFixed(4)}`}
          icon={<CurrencyDollar size={18} weight="light" />}
          alert={stats.costToday > 10}
        />
      </SimpleGrid>

      {/* Service Status */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="md">서비스 상태</Text>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {(Object.keys(serviceStatus) as Array<keyof ServiceStatus>).map(key => (
            <Group key={key} gap="xs" wrap="nowrap">
              {serviceStatus[key]
                ? <CheckCircle size={16} weight="fill" color="var(--mantine-color-green-6)" />
                : <XCircle size={16} weight="fill" color="var(--mantine-color-red-6)" />
              }
              <Text fz="xs" c={serviceStatus[key] ? undefined : 'dimmed'}>
                {SERVICE_LABELS[key]}
              </Text>
            </Group>
          ))}
        </SimpleGrid>
      </Paper>

      {/* Quick info row */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {/* Recent Users */}
        <Paper p="md">
          <Group justify="space-between" mb="md">
            <Text fw={600} fz="sm">최근 가입 회원</Text>
            <Badge variant="light" color="gray" size="sm">오늘 +{todaySignups}</Badge>
          </Group>
          {recentUsers.length === 0 ? (
            <Text fz="sm" c="dimmed" ta="center" py="md">아직 회원이 없어요.</Text>
          ) : (
            <Stack gap="xs">
              {recentUsers.slice(0, 5).map(u => (
                <Group key={u.id} gap="sm" wrap="nowrap">
                  <Avatar src={u.avatar_url ?? undefined} size="sm" radius="xl" color="gray">
                    {(u.display_name ?? '?')[0]}
                  </Avatar>
                  <Box flex={1} style={{ overflow: 'hidden' }}>
                    <Text fz="sm" fw={500} lineClamp={1}>
                      {u.display_name ?? '이름 없음'}
                    </Text>
                    <Text fz="xs" c="dimmed" lineClamp={1}>{u.email}</Text>
                  </Box>
                  <Text fz="xs" c="dimmed">
                    {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Quick Actions */}
        <Paper p="md">
          <Text fw={600} fz="sm" mb="md">빠른 작업</Text>
          <Stack gap="xs">
            <Button
              variant="light"
              color="gray"
              fullWidth
              justify="space-between"
              rightSection={<ArrowRight size={14} />}
              onClick={() => router.push('/chat')}
            >
              새 대화 시작
            </Button>
            <Button
              variant="light"
              color="gray"
              fullWidth
              justify="space-between"
              rightSection={<ArrowRight size={14} />}
              onClick={() => router.push('/accuracy')}
            >
              미확인 항목 확인하기
            </Button>
            <Button
              variant="light"
              color="gray"
              fullWidth
              justify="space-between"
              rightSection={<ArrowRight size={14} />}
              onClick={() => router.push('/market')}
            >
              마켓 관리
            </Button>
            <Button
              variant="light"
              color="gray"
              fullWidth
              justify="space-between"
              rightSection={<ArrowRight size={14} />}
              onClick={() => router.push('/settings')}
            >
              설정
            </Button>
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* Tabs for detailed management */}
      <Tabs defaultValue="nodes">
        <Tabs.List style={{ flexWrap: 'wrap' }}>
          <Tabs.Tab value="nodes">데이터 관리</Tabs.Tab>
          <Tabs.Tab value="verify">
            검토 대기
            {stats.unresolvedCount > 0 && <Badge size="xs" ml="xs" color="red">{stats.unresolvedCount}</Badge>}
          </Tabs.Tab>
          <Tabs.Tab value="cost">비용 모니터링</Tabs.Tab>
          <Tabs.Tab value="audit">감사 로그</Tabs.Tab>
          <Tabs.Tab value="db" leftSection={<Table size={14} />}>DB 에디터</Tabs.Tab>
          <Tabs.Tab value="views" leftSection={<Eye size={14} />}>뷰 관리</Tabs.Tab>
          <Tabs.Tab value="members" leftSection={<UserList size={14} />}>회원 관리</Tabs.Tab>
          <Tabs.Tab value="ux-flow" leftSection={<FlowArrow size={14} />}>UX 플로우</Tabs.Tab>
          <Tabs.Tab value="scenarios" leftSection={<Lightning size={14} />}>시나리오 생성</Tabs.Tab>
          <Tabs.Tab value="agents" leftSection={<Robot size={14} />}>AI 에이전트</Tabs.Tab>
          <Tabs.Tab value="boncho" leftSection={<Leaf size={14} />}>본초DB</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="nodes" pt="md"><DataNodeManager /></Tabs.Panel>
        <Tabs.Panel value="verify" pt="md"><VerifyQueue /></Tabs.Panel>
        <Tabs.Panel value="cost" pt="md"><CostMonitor /></Tabs.Panel>
        <Tabs.Panel value="audit" pt="md"><AuditLog /></Tabs.Panel>
        <Tabs.Panel value="db" pt="md"><DBEditor /></Tabs.Panel>
        <Tabs.Panel value="views" pt="md"><ViewTabContent /></Tabs.Panel>
        <Tabs.Panel value="members" pt="md"><MemberTabContent /></Tabs.Panel>
        <Tabs.Panel value="ux-flow" pt="md"><UXFlowEditor /></Tabs.Panel>
        <Tabs.Panel value="scenarios" pt="md"><ScenarioGenerator /></Tabs.Panel>
        <Tabs.Panel value="agents" pt="md"><AgentDashboard /></Tabs.Panel>
        <Tabs.Panel value="boncho" pt="md"><BonchoManager /></Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

/** 뷰 관리 탭 내부 — SegmentedControl로 편집/설정 전환 */
function ViewTabContent() {
  const [subTab, setSubTab] = useState('editor');
  return (
    <Stack gap="md">
      <SegmentedControl
        value={subTab}
        onChange={setSubTab}
        data={[
          { label: '뷰 편집', value: 'editor' },
          { label: '뷰 설정', value: 'settings' },
        ]}
        size="xs"
      />
      {subTab === 'editor' ? <ViewEditor /> : <ViewSettings />}
    </Stack>
  );
}

/** 회원 관리 탭 내부 — SegmentedControl로 회원/권한 전환 */
function MemberTabContent() {
  const [subTab, setSubTab] = useState('members');
  return (
    <Stack gap="md">
      <SegmentedControl
        value={subTab}
        onChange={setSubTab}
        data={[
          { label: '회원 목록', value: 'members' },
          { label: '권한 그룹', value: 'roles' },
        ]}
        size="xs"
      />
      {subTab === 'members' ? <MemberManager /> : <RoleManager />}
    </Stack>
  );
}

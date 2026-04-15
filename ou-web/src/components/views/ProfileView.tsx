'use client';

import { useState, useMemo } from 'react';
import {
  Box, Group, Text, Stack, Avatar, Badge, Tabs,
  SimpleGrid, ScrollArea, Divider,
} from '@mantine/core';
import {
  User, Eye, EyeSlash, Planet, IdentificationCard, UsersThree,
} from '@phosphor-icons/react';

interface ProfileViewProps {
  nodes: any[];
  filters?: Record<string, any>;
}

/**
 * 프로필 뷰 (Profile View)
 * 회원의 프로필을 데이터뷰 형태로 렌더링
 * - 기본 정보
 * - 페르소나별 공개 데이터
 * - 도메인별 데이터 통계
 * - 공개 노드 목록
 */
export function ProfileView({ nodes }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  // 프로필 데이터 추출 (첫 노드 또는 domain_data에서)
  const profileData = useMemo(() => {
    const profileNode = nodes.find(n => n.domain_data?.type === 'profile');
    const dd = profileNode?.domain_data ?? {};
    return {
      displayName: dd.display_name ?? dd.name ?? '이름 없음',
      handle: dd.handle ?? '',
      bio: dd.bio ?? '',
      avatarUrl: dd.avatar_url ?? null,
      personas: dd.personas ?? [],
    };
  }, [nodes]);

  // 도메인별 통계
  const domainStats = useMemo(() => {
    const stats = new Map<string, number>();
    for (const n of nodes) {
      if (n.domain && n.domain !== 'unresolved') {
        stats.set(n.domain, (stats.get(n.domain) ?? 0) + 1);
      }
    }
    return Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({ domain, count }));
  }, [nodes]);

  // 공개/비공개 노드 분류
  const publicNodes = useMemo(() => nodes.filter(n => n.visibility === 'public'), [nodes]);
  const privateNodes = useMemo(() => nodes.filter(n => n.visibility !== 'public'), [nodes]);

  const totalNodes = nodes.length;

  return (
    <Box p="md">
      {/* 프로필 헤더 */}
      <Group gap="md" mb="lg" align="flex-start">
        <Avatar
          src={profileData.avatarUrl}
          size={64}
          radius="xl"
          color="gray"
        >
          <User size={28} weight="light" />
        </Avatar>
        <Stack gap={4} style={{ flex: 1 }}>
          <Text fw={600} fz="lg">{profileData.displayName}</Text>
          {profileData.handle && (
            <Text fz="xs" c="dimmed">@{profileData.handle}</Text>
          )}
          {profileData.bio && (
            <Text fz="sm" c="dimmed" lineClamp={2}>{profileData.bio}</Text>
          )}
          <Group gap="md" mt={4}>
            <Group gap={4}>
              <Planet size={14} weight="light" />
              <Text fz="xs" c="dimmed">{totalNodes} Planet</Text>
            </Group>
            <Group gap={4}>
              <Eye size={14} weight="light" />
              <Text fz="xs" c="dimmed">{publicNodes.length} 공개</Text>
            </Group>
          </Group>
        </Stack>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab} variant="outline" color="gray">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IdentificationCard size={14} />}>
            개요
          </Tabs.Tab>
          <Tabs.Tab value="public" leftSection={<Eye size={14} />}>
            공개 데이터
          </Tabs.Tab>
          {profileData.personas.length > 0 && (
            <Tabs.Tab value="personas" leftSection={<UsersThree size={14} />}>
              페르소나
            </Tabs.Tab>
          )}
        </Tabs.List>

        {/* 개요 */}
        <Tabs.Panel value="overview" pt="md">
          <Stack gap="md">
            <Text fz="xs" fw={600} c="dimmed" tt="uppercase">도메인별 데이터</Text>
            {domainStats.length > 0 ? (
              <SimpleGrid cols={2} spacing="xs">
                {domainStats.map(({ domain, count }) => (
                  <Group
                    key={domain}
                    px="sm"
                    py="xs"
                    style={{
                      border: '0.5px solid var(--mantine-color-default-border)',
                      borderRadius: 8,
                    }}
                    justify="space-between"
                  >
                    <Text fz="sm">{DOMAIN_LABELS[domain] ?? domain}</Text>
                    <Badge variant="light" color="gray" size="sm">{count}</Badge>
                  </Group>
                ))}
              </SimpleGrid>
            ) : (
              <Text fz="sm" c="dimmed">아직 데이터가 없습니다</Text>
            )}
          </Stack>
        </Tabs.Panel>

        {/* 공개 데이터 */}
        <Tabs.Panel value="public" pt="md">
          <ScrollArea h={400}>
            {publicNodes.length > 0 ? (
              <Stack gap={4}>
                {publicNodes.map(node => (
                  <Group
                    key={node.id}
                    px="md"
                    py="sm"
                    style={{
                      border: '0.5px solid var(--mantine-color-default-border)',
                      borderRadius: 8,
                    }}
                  >
                    <Badge variant="light" color="gray" size="xs">{node.domain ?? '-'}</Badge>
                    <Text fz="sm" lineClamp={1} style={{ flex: 1 }}>
                      {node.domain_data?.title ?? node.raw?.slice(0, 60) ?? '(제목 없음)'}
                    </Text>
                    <Text fz="xs" c="dimmed">
                      {node.created_at ? new Date(node.created_at).toLocaleDateString('ko-KR') : ''}
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Stack align="center" py="xl">
                <EyeSlash size={48} weight="light" color="var(--mantine-color-gray-5)" />
                <Text fz="sm" c="dimmed">공개된 데이터가 없습니다</Text>
              </Stack>
            )}
          </ScrollArea>
        </Tabs.Panel>

        {/* 페르소나 */}
        {profileData.personas.length > 0 && (
          <Tabs.Panel value="personas" pt="md">
            <Stack gap="md">
              {profileData.personas.map((persona: any, idx: number) => (
                <Box
                  key={idx}
                  p="md"
                  style={{
                    border: '0.5px solid var(--mantine-color-default-border)',
                    borderRadius: 8,
                  }}
                >
                  <Group gap="sm" mb="xs">
                    <Avatar size={32} radius="xl" color="gray">
                      {persona.display_name?.[0] ?? '?'}
                    </Avatar>
                    <Stack gap={0}>
                      <Text fz="sm" fw={500}>{persona.display_name ?? '페르소나'}</Text>
                      {persona.handle && (
                        <Text fz="xs" c="dimmed">@{persona.handle}</Text>
                      )}
                    </Stack>
                    <Badge
                      variant="dot"
                      color={persona.visibility === 'public' ? 'gray' : 'dark'}
                      size="xs"
                      ml="auto"
                    >
                      {persona.visibility === 'public' ? '공개' : '비공개'}
                    </Badge>
                  </Group>
                  {persona.bio && (
                    <Text fz="xs" c="dimmed">{persona.bio}</Text>
                  )}
                </Box>
              ))}
            </Stack>
          </Tabs.Panel>
        )}
      </Tabs>
    </Box>
  );
}

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  habit: '습관',
  knowledge: '지식',
  idea: '아이디어',
  relation: '관계',
  emotion: '감정',
  finance: '가계',
  product: '상품',
  broadcast: '방송',
  education: '교육',
  media: '미디어',
  location: '장소',
};

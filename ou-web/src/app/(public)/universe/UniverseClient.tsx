'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box, Stack, Title, Text, Paper, Group, Badge, Center, Button,
  TextInput, UnstyledButton, Loader, Divider, SimpleGrid, Accordion,
  ThemeIcon, Modal, Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  Planet, MagnifyingGlass, Sparkle, Lightning, GraduationCap,
  Question, ChatCircleDots, Robot, Eye, Camera, ShareNetwork,
  UsersThree, Star, CheckCircle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PublicNode {
  id: string;
  title?: string;
  domain: string;
  importance?: number;
  created_at: string;
  raw?: string;
  user_id: string;
  domain_data?: Record<string, any>;
  profiles?: { display_name?: string; handle?: string } | null;
}

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  knowledge: '지식',
  idea: '아이디어',
  relation: '관계',
  emotion: '감정',
  finance: '가계부',
  habit: '습관',
  product: '기능',
  education: '활용법',
};

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'AI 대화': <ChatCircleDots size={20} weight="light" />,
  '자동 정리': <Robot size={20} weight="light" />,
  '다양한 보기': <Eye size={20} weight="light" />,
  '이미지 인식': <Camera size={20} weight="light" />,
  '공유하기': <ShareNetwork size={20} weight="light" />,
  '그룹': <UsersThree size={20} weight="light" />,
};

interface UniverseClientProps {
  initialNodes: PublicNode[];
  activeDomains: string[];
  introNodes: PublicNode[];
  featureNodes: PublicNode[];
  usecaseNodes: PublicNode[];
  faqNodes: PublicNode[];
  scenarioNodes: PublicNode[];
}

export function UniverseClient({
  initialNodes,
  activeDomains,
  introNodes,
  featureNodes,
  usecaseNodes,
  faqNodes,
  scenarioNodes,
}: UniverseClientProps) {
  const router = useRouter();
  const [nodes, setNodes] = useState(initialNodes);
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialNodes.length >= 30);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Realization modal state
  const [realizeModalOpen, setRealizeModalOpen] = useState(false);
  const [realizeTarget, setRealizeTarget] = useState<PublicNode | null>(null);
  const [realizeStory, setRealizeStory] = useState('');
  const [realizeSubmitting, setRealizeSubmitting] = useState(false);

  // Realization counts per scenario
  const [realizeCounts, setRealizeCounts] = useState<Record<string, number>>({});

  const hasAdminContent =
    introNodes.length > 0 ||
    featureNodes.length > 0 ||
    usecaseNodes.length > 0 ||
    faqNodes.length > 0 ||
    scenarioNodes.length > 0;

  // Fetch realization counts for all scenarios
  useEffect(() => {
    if (scenarioNodes.length === 0) return;
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        scenarioNodes.map(async (node) => {
          try {
            const res = await fetch(`/api/social/realize?scenarioId=${node.id}`);
            if (res.ok) {
              const data = await res.json();
              counts[node.id] = data.count ?? 0;
            }
          } catch {
            counts[node.id] = 0;
          }
        })
      );
      setRealizeCounts(counts);
    };
    fetchCounts();
  }, [scenarioNodes]);

  // Filter by search and domain
  const filtered = nodes.filter(node => {
    const matchesDomain = !selectedDomain || node.domain === selectedDomain;
    const matchesSearch = !search ||
      (node.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (node.raw ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  // Load more
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/universe/browse?page=${page + 1}&limit=30`);
      if (res.ok) {
        const { nodes: moreNodes } = await res.json();
        if (moreNodes && moreNodes.length > 0) {
          setNodes(prev => [...prev, ...moreNodes]);
          setPage(p => p + 1);
          if (moreNodes.length < 30) setHasMore(false);
        } else {
          setHasMore(false);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const domainTabs = activeDomains.map(d => ({
    id: d,
    label: DOMAIN_LABELS[d] ?? d,
  }));

  const openRealizeModal = (node: PublicNode) => {
    setRealizeTarget(node);
    setRealizeStory('');
    setRealizeModalOpen(true);
  };

  const submitRealization = async () => {
    if (!realizeTarget || !realizeStory.trim()) return;

    setRealizeSubmitting(true);
    try {
      const res = await fetch('/api/social/realize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioNodeId: realizeTarget.id,
          story: realizeStory.trim(),
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.ok) {
        setRealizeModalOpen(false);
        setRealizeCounts(prev => ({
          ...prev,
          [realizeTarget.id]: (prev[realizeTarget.id] ?? 0) + 1,
        }));
        notifications.show({
          message: '이야기가 공유되었어요!',
          color: 'gray',
        });
      } else {
        const data = await res.json();
        notifications.show({
          message: data.error || '공유에 실패했어요. 다시 시도해주세요.',
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        message: '공유에 실패했어요. 다시 시도해주세요.',
        color: 'red',
      });
    } finally {
      setRealizeSubmitting(false);
    }
  };

  return (
    <Box style={{ width: '100%', minHeight: '100vh' }}>
      {/* Hero Header */}
      <Stack align="center" gap="xs" py="xl" px="xl">
        <Planet size={36} weight="thin" color="var(--mantine-color-gray-6)" />
        <Title order={2} fw={600}>OU Universe</Title>
        <Text size="sm" c="dimmed">모두가 공유한 기록들</Text>
      </Stack>

      {/* ── Admin: OU 소개 Section ── */}
      {introNodes.length > 0 && (
        <Box maw={800} mx="auto" px="xl" mb="xl">
          <Group gap="xs" mb="md">
            <Sparkle size={18} weight="light" color="var(--mantine-color-gray-5)" />
            <Text fw={600} fz="lg">OU 소개</Text>
          </Group>
          <Stack gap="sm">
            {introNodes.map(node => (
              <Paper
                key={node.id}
                p="lg"
                withBorder
                style={{
                  borderColor: 'var(--mantine-color-default-border)',
                  background: 'var(--mantine-color-dark-7, var(--mantine-color-gray-0))',
                }}
              >
                <Text fw={600} mb={4}>{node.title}</Text>
                <Text fz="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                  {node.raw}
                </Text>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* ── Admin: 기능 Section ── */}
      {featureNodes.length > 0 && (
        <Box maw={800} mx="auto" px="xl" mb="xl">
          <Group gap="xs" mb="md">
            <Lightning size={18} weight="light" color="var(--mantine-color-gray-5)" />
            <Text fw={600} fz="lg">기능</Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {featureNodes.map(node => (
              <Paper
                key={node.id}
                p="md"
                withBorder
                style={{
                  borderColor: 'var(--mantine-color-default-border)',
                  background: 'var(--mantine-color-dark-7, var(--mantine-color-gray-0))',
                }}
              >
                <Group gap="xs" mb={8}>
                  <ThemeIcon variant="light" color="gray" size="sm" radius="xl">
                    {FEATURE_ICONS[node.title ?? ''] ?? <Lightning size={14} weight="light" />}
                  </ThemeIcon>
                  <Text fw={600} fz="sm">{node.title}</Text>
                </Group>
                <Text fz="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                  {node.raw}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* ── Admin: 활용법 Section ── */}
      {usecaseNodes.length > 0 && (
        <Box maw={800} mx="auto" px="xl" mb="xl">
          <Group gap="xs" mb="md">
            <GraduationCap size={18} weight="light" color="var(--mantine-color-gray-5)" />
            <Text fw={600} fz="lg">활용법</Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            {usecaseNodes.map(node => (
              <Paper
                key={node.id}
                p="md"
                withBorder
                style={{
                  borderColor: 'var(--mantine-color-default-border)',
                  background: 'var(--mantine-color-dark-7, var(--mantine-color-gray-0))',
                }}
              >
                <Text fw={600} fz="sm" mb={4}>{node.title}</Text>
                <Text fz="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                  {node.raw}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* ── Scenario Section ── */}
      {scenarioNodes.length > 0 && (
        <Box maw={800} mx="auto" px="xl" mb="xl">
          <Group gap="xs" mb="md">
            <Star size={18} weight="light" color="var(--mantine-color-gray-5)" />
            <Text fw={600} fz="lg">이런 경험, 해보셨나요?</Text>
          </Group>
          <Stack gap="sm">
            {scenarioNodes.map(node => (
              <Paper
                key={node.id}
                p="lg"
                withBorder
                style={{
                  borderColor: 'var(--mantine-color-default-border)',
                  background: 'var(--mantine-color-dark-7, var(--mantine-color-gray-0))',
                }}
              >
                <UnstyledButton
                  component={Link}
                  href={`/scenario/${node.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}
                >
                  <Text fw={600} mb={4}>{node.title}</Text>
                  <Text fz="sm" c="dimmed" style={{ lineHeight: 1.6 }} lineClamp={3}>
                    {node.raw}
                  </Text>
                </UnstyledButton>

                <Group justify="space-between" mt="md">
                  {(realizeCounts[node.id] ?? 0) > 0 ? (
                    <Group gap={4}>
                      <CheckCircle size={14} weight="light" color="var(--mantine-color-gray-5)" />
                      <Text fz="xs" c="dimmed">
                        {realizeCounts[node.id]}명 실현
                      </Text>
                    </Group>
                  ) : (
                    <Box />
                  )}
                  <Button
                    variant="light"
                    color="gray"
                    size="xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openRealizeModal(node);
                    }}
                  >
                    나도 이랬어요!
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* ── Admin: FAQ Section ── */}
      {faqNodes.length > 0 && (
        <Box maw={800} mx="auto" px="xl" mb="xl">
          <Group gap="xs" mb="md">
            <Question size={18} weight="light" color="var(--mantine-color-gray-5)" />
            <Text fw={600} fz="lg">자주 묻는 질문</Text>
          </Group>
          <Accordion
            variant="separated"
            styles={{
              item: {
                borderColor: 'var(--mantine-color-default-border)',
                background: 'var(--mantine-color-dark-7, var(--mantine-color-gray-0))',
              },
              control: { padding: 'var(--mantine-spacing-md)' },
              panel: { padding: 'var(--mantine-spacing-md)', paddingTop: 0 },
            }}
          >
            {faqNodes.map(node => (
              <Accordion.Item key={node.id} value={node.id}>
                <Accordion.Control>
                  <Text fw={500} fz="sm">{node.title}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text fz="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                    {node.raw}
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Box>
      )}

      {/* ── Divider between admin content and community ── */}
      {hasAdminContent && (
        <Box maw={800} mx="auto" px="xl" mb="lg">
          <Divider
            label={
              <Text fz="xs" c="dimmed">
                공유된 기록들
              </Text>
            }
            labelPosition="center"
          />
        </Box>
      )}

      {/* Search */}
      <Box maw={640} mx="auto" px="xl" mb="md">
        <TextInput
          placeholder="검색어를 입력하세요..."
          leftSection={<MagnifyingGlass size={16} weight="light" />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="md"
          styles={{
            input: {
              borderColor: 'var(--mantine-color-default-border)',
              backgroundColor: 'transparent',
            },
          }}
        />
      </Box>

      {/* Domain filter tabs - only show domains that have data */}
      {domainTabs.length > 0 && (
        <Group gap="xs" justify="center" px="xl" mb="lg">
          <UnstyledButton
            onClick={() => setSelectedDomain(null)}
            px="sm"
            py={6}
            style={{
              borderRadius: 'var(--mantine-radius-xl)',
              border: '0.5px solid var(--mantine-color-default-border)',
              background: selectedDomain === null
                ? 'var(--mantine-color-dark-4)'
                : 'transparent',
              transition: 'background 150ms',
            }}
          >
            <Text
              fz="sm"
              fw={selectedDomain === null ? 600 : 400}
              c={selectedDomain === null ? undefined : 'dimmed'}
            >
              전체
            </Text>
          </UnstyledButton>
          {domainTabs.map(tab => (
            <UnstyledButton
              key={tab.id}
              onClick={() => setSelectedDomain(tab.id)}
              px="sm"
              py={6}
              style={{
                borderRadius: 'var(--mantine-radius-xl)',
                border: '0.5px solid var(--mantine-color-default-border)',
                background: selectedDomain === tab.id
                  ? 'var(--mantine-color-dark-4)'
                  : 'transparent',
                transition: 'background 150ms',
              }}
            >
              <Text
                fz="sm"
                fw={selectedDomain === tab.id ? 600 : 400}
                c={selectedDomain === tab.id ? undefined : 'dimmed'}
              >
                {tab.label}
              </Text>
            </UnstyledButton>
          ))}
        </Group>
      )}

      {/* Community Content */}
      <Box maw={700} mx="auto" px="xl" pb="xl">
        {filtered.length === 0 ? (
          <Center py={80}>
            <Stack align="center" gap="md">
              <Planet size={48} weight="light" color="var(--mantine-color-gray-5)" />
              <Text fw={600}>
                {search || selectedDomain ? '검색 결과가 없어요' : '아직 공유된 내용이 없어요'}
              </Text>
              <Text c="dimmed" fz="sm" ta="center">
                {search || selectedDomain
                  ? '다른 검색어나 카테고리를 시도해보세요.'
                  : '대화를 시작하고 내 기록을 공개해보세요.'}
              </Text>
              {(search || selectedDomain) ? (
                <Button
                  variant="light"
                  color="gray"
                  onClick={() => { setSearch(''); setSelectedDomain(null); }}
                >
                  전체 보기
                </Button>
              ) : (
                <Button component={Link} href="/login" variant="light" color="gray">
                  시작하기
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {filtered.map(node => (
              <Paper
                key={node.id}
                p="md"
                component={Link}
                href={`/view/${node.id}`}
                style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
                    {node.title || (node.raw ? node.raw.slice(0, 60) : node.id)}
                  </Text>
                  <Badge variant="light" color="gray" size="xs">
                    {DOMAIN_LABELS[node.domain] ?? node.domain}
                  </Badge>
                </Group>
                {node.raw && node.title && (
                  <Text size="xs" c="dimmed" lineClamp={2} mb={4}>
                    {node.raw}
                  </Text>
                )}
                <Group justify="space-between">
                  <Text
                    fz="xs"
                    c="dimmed"
                    component={Link}
                    href={node.profiles?.handle ? `/profile/${node.profiles.handle}` : '#'}
                    onClick={e => e.stopPropagation()}
                    style={{ textDecoration: 'none' }}
                  >
                    {node.profiles?.display_name ?? '익명'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(node.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </Group>
              </Paper>
            ))}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <Center ref={observerRef} py="xl">
                {loading && <Loader size="sm" color="gray" />}
              </Center>
            )}
          </Stack>
        )}
      </Box>

      {/* ── Realization Modal ── */}
      <Modal
        opened={realizeModalOpen}
        onClose={() => setRealizeModalOpen(false)}
        title={<Text fw={600}>나도 이랬어요!</Text>}
        size="md"
        centered
      >
        {realizeTarget && (
          <Stack gap="md">
            {/* Quoted scenario */}
            <Paper
              p="md"
              style={{
                background: 'var(--mantine-color-dark-6, var(--mantine-color-gray-1))',
                borderRadius: 'var(--mantine-radius-sm)',
              }}
            >
              <Text fz="xs" c="dimmed" mb={4}>{realizeTarget.title}</Text>
              <Text fz="sm" c="dimmed" style={{ lineHeight: 1.5 }} lineClamp={4}>
                {realizeTarget.raw}
              </Text>
            </Paper>

            <Textarea
              placeholder="당신의 이야기를 들려주세요"
              value={realizeStory}
              onChange={e => setRealizeStory(e.target.value)}
              minRows={4}
              maxRows={8}
              autosize
            />

            <Button
              color="dark"
              fullWidth
              onClick={submitRealization}
              loading={realizeSubmitting}
              disabled={!realizeStory.trim()}
            >
              공유하기
            </Button>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}

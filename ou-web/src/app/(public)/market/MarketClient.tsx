'use client';

import { useState, useMemo } from 'react';
import {
  Stack, Title, Text, SimpleGrid, Paper, Badge, Button, Box, Group,
  Center, UnstyledButton, Notification, Modal, Avatar, Divider,
  SegmentedControl,
} from '@mantine/core';
import {
  Storefront, Eye, Users, Check,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { getUserRank } from '@/lib/utils/rank';

interface MarketItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  view_type?: string;
  price_krw: number;
  purchase_count: number;
  created_at?: string;
  profiles?: {
    display_name?: string;
    avatar_url?: string;
    handle?: string;
  } | null;
  /** node count of the creator, for rank display */
  creator_node_count?: number;
}

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'study', label: '학습' },
  { id: 'schedule', label: '일정' },
  { id: 'finance', label: '가계부' },
  { id: 'habit', label: '습관' },
  { id: 'work', label: '업무' },
  { id: 'creative', label: '창작' },
];

type SortMode = 'popular' | 'latest';

export function MarketClient({ items }: { items: MarketItem[] }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);

  const filteredItems = useMemo(() => {
    let result = selectedCategory === 'all'
      ? items
      : items.filter(item => item.category === selectedCategory);

    if (sortMode === 'latest') {
      result = [...result].sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    } else {
      result = [...result].sort((a, b) => b.purchase_count - a.purchase_count);
    }

    return result;
  }, [items, selectedCategory, sortMode]);

  const handleSubscribe = async (item: MarketItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (subscribedIds.has(item.id)) {
      // Unsubscribe
      setSubscribingId(item.id);
      try {
        const res = await fetch('/api/views/subscribe', {
          method: 'DELETE',
          body: JSON.stringify({ itemId: item.id }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.status === 401) {
          router.push('/login?next=/market');
          return;
        }
        if (res.ok) {
          setSubscribedIds(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          setNotification(`"${item.name}" 구독을 취소했어요.`);
          setTimeout(() => setNotification(null), 3000);
        }
      } catch {
        // silently fail
      } finally {
        setSubscribingId(null);
      }
      return;
    }

    setSubscribingId(item.id);
    try {
      const res = await fetch('/api/views/subscribe', {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.status === 401) {
        router.push('/login?next=/market');
        return;
      }
      if (res.ok) {
        setSubscribedIds(prev => new Set(prev).add(item.id));
        setNotification(`"${item.name}" 구독 완료!`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch {
      // silently fail
    } finally {
      setSubscribingId(null);
    }
  };

  const creatorRank = (item: MarketItem) => {
    return getUserRank(item.creator_node_count ?? 0);
  };

  return (
    <Stack gap="xl" maw={1000} mx="auto" p="xl">
      {notification && (
        <Notification
          icon={<Check size={16} />}
          color="gray"
          onClose={() => setNotification(null)}
          withBorder
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, maxWidth: 320 }}
        >
          {notification}
        </Notification>
      )}

      <div>
        <Title order={2}>마켓</Title>
        <Text c="dimmed" fz="sm">다른 사용자들이 만든 보기 방식을 둘러보세요</Text>
      </div>

      {/* Categories + Sort */}
      <Group justify="space-between" align="flex-end">
        <Group gap="xs">
          {CATEGORIES.map(cat => (
            <UnstyledButton
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              px="sm"
              py={6}
              style={{
                borderRadius: 'var(--mantine-radius-xl)',
                border: '0.5px solid var(--mantine-color-default-border)',
                background: selectedCategory === cat.id
                  ? 'var(--mantine-color-dark-4)'
                  : 'transparent',
                transition: 'background 150ms',
              }}
            >
              <Text
                fz="sm"
                fw={selectedCategory === cat.id ? 600 : 400}
                c={selectedCategory === cat.id ? undefined : 'dimmed'}
              >
                {cat.label}
              </Text>
            </UnstyledButton>
          ))}
        </Group>

        <SegmentedControl
          size="xs"
          value={sortMode}
          onChange={(val) => setSortMode(val as SortMode)}
          data={[
            { label: '인기순', value: 'popular' },
            { label: '최신순', value: 'latest' },
          ]}
          color="gray"
        />
      </Group>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <Center py={80}>
          <Stack align="center" gap="md">
            <Storefront size={48} weight="light" color="var(--mantine-color-gray-5)" />
            <Text fw={600}>아직 등록된 보기 방식이 없어요</Text>
            <Text fz="sm" c="dimmed" ta="center">
              {selectedCategory !== 'all'
                ? '다른 카테고리를 확인해보세요.'
                : '곧 다양한 보기 방식이 추가될 예정이에요.'
              }
            </Text>
            {selectedCategory !== 'all' && (
              <Button variant="light" color="gray" onClick={() => setSelectedCategory('all')}>
                전체 보기
              </Button>
            )}
          </Stack>
        </Center>
      )}

      {/* Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {filteredItems.map((item) => (
          <Paper
            key={item.id}
            p="lg"
            style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
            onClick={() => setSelectedItem(item)}
          >
            <Stack gap="sm" flex={1}>
              {/* Preview placeholder */}
              <Box
                h={120}
                style={{
                  background: 'var(--mantine-color-default-hover)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Eye size={28} weight="light" color="var(--mantine-color-gray-6)" />
              </Box>

              <Text fw={600} lineClamp={1}>{item.name}</Text>
              <Text fz="sm" c="dimmed" lineClamp={2} style={{ lineHeight: 1.5 }}>
                {item.description}
              </Text>

              {/* Creator info */}
              <Group gap="xs" wrap="nowrap">
                <Avatar
                  src={item.profiles?.avatar_url ?? undefined}
                  size={20}
                  radius="xl"
                  color="gray"
                >
                  {(item.profiles?.display_name ?? '?')[0]}
                </Avatar>
                <Text fz="xs" c="dimmed" lineClamp={1} flex={1}>
                  {item.profiles?.display_name ?? '익명'}
                </Text>
                <Text fz={10}>{creatorRank(item).emoji}</Text>
              </Group>

              <Group justify="space-between" mt="auto">
                <Group gap={4}>
                  <Users size={12} weight="light" color="var(--mantine-color-gray-6)" />
                  <Text fz="xs" c="dimmed">{item.purchase_count}명 구독 중</Text>
                </Group>
              </Group>

              <Group justify="space-between" align="center">
                <Badge variant="light" color="gray" w="fit-content">
                  {item.price_krw === 0 ? '무료' : `${item.price_krw.toLocaleString()}원`}
                </Badge>
                <Button
                  variant={subscribedIds.has(item.id) ? 'subtle' : 'light'}
                  color="gray"
                  size="xs"
                  loading={subscribingId === item.id}
                  onClick={(e) => handleSubscribe(item, e)}
                >
                  {subscribedIds.has(item.id) ? '구독 취소' : '구독하기'}
                </Button>
              </Group>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Link to skins */}
      <Paper p="lg" style={{ cursor: 'pointer' }} onClick={() => router.push('/market/skins')}>
        <Group justify="space-between">
          <div>
            <Text fw={600} fz="sm">내 우주 꾸미기</Text>
            <Text fz="xs" c="dimmed">테마와 스킨으로 나만의 우주를 만들어보세요</Text>
          </div>
          <Button variant="subtle" color="gray" size="sm">
            둘러보기
          </Button>
        </Group>
      </Paper>

      {/* Detail Modal */}
      <Modal
        opened={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name}
        size="lg"
        centered
      >
        {selectedItem && (
          <Stack gap="lg">
            {/* Preview area */}
            <Box
              p="md"
              style={{
                background: 'var(--mantine-color-default-hover)',
                borderRadius: 8,
                minHeight: 180,
              }}
            >
              <Stack gap="xs" align="center" justify="center" h={160}>
                <Eye size={32} weight="light" color="var(--mantine-color-gray-5)" />
                <Text fz="xs" c="dimmed" ta="center">
                  {selectedItem.view_type
                    ? `${selectedItem.view_type} 형태로 데이터를 보여줍니다`
                    : '이 보기 방식의 미리보기'}
                </Text>
                <Text fz="xs" c="dimmed" ta="center" maw={300}>
                  구독하면 내 데이터에 이 보기 방식을 적용할 수 있어요
                </Text>
              </Stack>
            </Box>

            {/* Description */}
            {selectedItem.description && (
              <div>
                <Text fz="xs" c="dimmed" mb={4}>설명</Text>
                <Text fz="sm" style={{ lineHeight: 1.7 }}>{selectedItem.description}</Text>
              </div>
            )}

            <Divider />

            {/* Creator info */}
            <Group justify="space-between">
              <Group gap="sm">
                <Avatar
                  src={selectedItem.profiles?.avatar_url ?? undefined}
                  size={36}
                  radius="xl"
                  color="gray"
                >
                  {(selectedItem.profiles?.display_name ?? '?')[0]}
                </Avatar>
                <Stack gap={0}>
                  <Group gap={6}>
                    <Text fz="sm" fw={500}>
                      {selectedItem.profiles?.display_name ?? '익명'}
                    </Text>
                    <Text fz={12}>{creatorRank(selectedItem).emoji}</Text>
                    <Text fz={10} c="dimmed">{creatorRank(selectedItem).name}</Text>
                  </Group>
                  {selectedItem.profiles?.handle && (
                    <Text
                      fz="xs"
                      c="dimmed"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedItem(null);
                        router.push(`/profile/${selectedItem.profiles?.handle}`);
                      }}
                    >
                      @{selectedItem.profiles.handle}
                    </Text>
                  )}
                </Stack>
              </Group>

              <Group gap="lg">
                <Stack gap={0} align="center">
                  <Text fz="sm" fw={600}>{selectedItem.purchase_count}</Text>
                  <Text fz={10} c="dimmed">구독자</Text>
                </Stack>
              </Group>
            </Group>

            <Divider />

            {/* Actions */}
            <Group justify="space-between">
              <Badge variant="light" color="gray" size="lg">
                {selectedItem.price_krw === 0 ? '무료' : `${selectedItem.price_krw.toLocaleString()}원`}
              </Badge>
              <Button
                variant={subscribedIds.has(selectedItem.id) ? 'subtle' : 'filled'}
                color="gray"
                size="md"
                loading={subscribingId === selectedItem.id}
                onClick={() => handleSubscribe(selectedItem)}
              >
                {subscribedIds.has(selectedItem.id) ? '구독 취소' : '구독하기'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

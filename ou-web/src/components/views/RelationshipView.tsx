'use client';

import { useState, useMemo } from 'react';
import {
  Box, Group, Text, Stack, Badge, SimpleGrid,
  UnstyledButton, Collapse, TextInput,
} from '@mantine/core';
import { Users, SortAscending, CaretDown, CaretUp } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

type SortMode = 'recent' | 'name' | 'relationship';

interface ContactCard {
  id: string;
  name: string;
  relationship: string;
  lastMentioned: string;
  birthday: string;
  memo: string;
  raw: string;
  isStale: boolean; // > 30 days
}

export function RelationshipView({ nodes }: ViewProps) {
  const [sort, setSort] = useState<SortMode>('recent');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cards: ContactCard[] = useMemo(
    () =>
      nodes.map(n => {
        const dd = n.domain_data ?? {};
        const lastDate = dd.date ?? dd.last_mentioned ?? n.created_at ?? '';
        const daysSince = lastDate ? dayjs().diff(dayjs(lastDate), 'day') : 999;
        return {
          id: n.id,
          name: dd.name ?? ((n.raw ?? '').slice(0, 20) || '이름 없음'),
          relationship: dd.relationship ?? dd.type ?? '',
          lastMentioned: lastDate,
          birthday: dd.birthday ?? '',
          memo: dd.memo ?? dd.content ?? n.raw ?? '',
          raw: n.raw ?? '',
          isStale: daysSince > 30,
        };
      }),
    [nodes],
  );

  const sorted = useMemo(() => {
    const list = [...cards];
    switch (sort) {
      case 'recent':
        return list.sort((a, b) => (a.lastMentioned > b.lastMentioned ? -1 : 1));
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      case 'relationship':
        return list.sort((a, b) => a.relationship.localeCompare(b.relationship, 'ko'));
      default:
        return list;
    }
  }, [cards, sort]);

  // Stats
  const totalContacts = cards.length;

  const thisMonth = useMemo(() => {
    const monthStart = dayjs().startOf('month');
    return cards.filter(c => c.lastMentioned && dayjs(c.lastMentioned).isAfter(monthStart)).length;
  }, [cards]);

  const upcomingBirthdays = useMemo(() => {
    const today = dayjs();
    const twoWeeksLater = today.add(14, 'day');
    return cards.filter(c => {
      if (!c.birthday) return false;
      const bday = dayjs(c.birthday).year(today.year());
      // If birthday already passed this year, check next year
      const checkDate = bday.isBefore(today) ? bday.add(1, 'year') : bday;
      return checkDate.isBefore(twoWeeksLater);
    }).length;
  }, [cards]);

  const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: 'recent', label: '최근 연락순' },
    { value: 'name', label: '이름순' },
    { value: 'relationship', label: '관계별' },
  ];

  if (cards.length === 0) return null;

  return (
    <Stack gap="md" p="md">
      {/* Stats */}
      <SimpleGrid cols={3} spacing="xs">
        <Box
          px="sm" py="xs"
          style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}
        >
          <Text fz={10} c="dimmed">전체</Text>
          <Text fz="lg" fw={700}>{totalContacts}</Text>
        </Box>
        <Box
          px="sm" py="xs"
          style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}
        >
          <Text fz={10} c="dimmed">이번 달</Text>
          <Text fz="lg" fw={700}>{thisMonth}</Text>
        </Box>
        <Box
          px="sm" py="xs"
          style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}
        >
          <Text fz={10} c="dimmed">다가오는 생일</Text>
          <Text fz="lg" fw={700}>{upcomingBirthdays}</Text>
        </Box>
      </SimpleGrid>

      {/* Sort controls */}
      <Group gap="xs">
        <SortAscending size={14} />
        {SORT_OPTIONS.map(opt => (
          <UnstyledButton
            key={opt.value}
            onClick={() => setSort(opt.value)}
            style={{
              padding: '2px 10px',
              borderRadius: 14,
              fontSize: 12,
              border: '0.5px solid var(--mantine-color-default-border)',
              background: sort === opt.value ? 'var(--mantine-color-dark-6)' : 'transparent',
              color: sort === opt.value ? '#fff' : 'var(--mantine-color-text)',
              transition: 'all 150ms',
            }}
          >
            {opt.label}
          </UnstyledButton>
        ))}
      </Group>

      {/* Card grid */}
      <SimpleGrid
        cols={{ base: 1, sm: 2, lg: 3 }}
        spacing="sm"
      >
        {sorted.map(card => {
          const isExpanded = expandedId === card.id;
          return (
            <UnstyledButton
              key={card.id}
              onClick={() => setExpandedId(isExpanded ? null : card.id)}
              style={{
                border: card.isStale
                  ? '1px dashed var(--mantine-color-gray-5)'
                  : '0.5px solid var(--mantine-color-default-border)',
                borderRadius: 8,
                padding: 12,
                transition: 'all 150ms',
                textAlign: 'left',
              }}
            >
              <Group justify="space-between" mb={4}>
                <Text fz="sm" fw={600}>{card.name}</Text>
                {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </Group>

              {card.relationship && (
                <Badge variant="light" color="gray" size="xs" mb={4}>
                  {card.relationship}
                </Badge>
              )}

              {card.lastMentioned && (
                <Text fz={10} c="dimmed">
                  {dayjs(card.lastMentioned).format('YYYY.MM.DD')}
                  {card.isStale && ' · 30일 이상 연락 없음'}
                </Text>
              )}

              {card.memo && !isExpanded && (
                <Text fz="xs" c="dimmed" lineClamp={1} mt={4}>
                  {card.memo}
                </Text>
              )}

              <Collapse in={isExpanded}>
                <Stack gap="xs" mt="sm" style={{ borderTop: '0.5px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
                  {card.birthday && (
                    <Group gap={6}>
                      <Text fz={10} c="dimmed">생일</Text>
                      <Text fz="xs">{dayjs(card.birthday).format('M월 D일')}</Text>
                    </Group>
                  )}
                  {card.memo && (
                    <Box>
                      <Text fz={10} c="dimmed" mb={2}>메모</Text>
                      <Text fz="xs" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {card.memo}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Collapse>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

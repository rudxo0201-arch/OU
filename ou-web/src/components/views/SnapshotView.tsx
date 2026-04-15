'use client';

import { useState, useMemo } from 'react';
import {
  Box, Group, Text, Stack, SimpleGrid, Divider, Badge, TextInput,
} from '@mantine/core';
import { CalendarBlank, CurrencyCircleDollar, Users, Smiley } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import isBetween from 'dayjs/plugin/isBetween';
import type { ViewProps } from './registry';

dayjs.locale('ko');
dayjs.extend(isBetween);

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
  unresolved: '미분류',
};

export function SnapshotView({ nodes }: ViewProps) {
  const [startDate, setStartDate] = useState(
    dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
  );
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const filtered = useMemo(() => {
    if (!startDate || !endDate) return nodes;
    const s = dayjs(startDate).startOf('day');
    const e = dayjs(endDate).endOf('day');
    return nodes.filter(n => {
      const d = n.domain_data?.date ?? n.created_at;
      if (!d) return false;
      return dayjs(d).isBetween(s, e, null, '[]');
    });
  }, [nodes, startDate, endDate]);

  // Domain breakdown
  const domainBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of filtered) {
      const domain = n.domain ?? 'unresolved';
      map[domain] = (map[domain] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Total spending
  const totalSpending = useMemo(() => {
    let sum = 0;
    for (const n of filtered) {
      if (n.domain !== 'finance') continue;
      const dd = n.domain_data ?? {};
      const amount = parseFloat(dd.amount ?? dd.price ?? '0');
      if (!isNaN(amount)) sum += Math.abs(amount);
    }
    return sum;
  }, [filtered]);

  // Most met people
  const topPeople = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of filtered) {
      if (n.domain !== 'relation') continue;
      const name = n.domain_data?.name ?? '';
      if (!name) continue;
      map[name] = (map[name] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filtered]);

  // Emotion summary
  const topEmotions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of filtered) {
      if (n.domain !== 'emotion') continue;
      const emotion = n.domain_data?.emotion ?? n.domain_data?.mood ?? '';
      if (!emotion) continue;
      map[emotion] = (map[emotion] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filtered]);

  // Mini timeline (key events)
  const timeline = useMemo(() => {
    return filtered
      .filter(n => n.domain_data?.title || n.domain_data?.name)
      .sort((a, b) => {
        const da = a.domain_data?.date ?? a.created_at ?? '';
        const db = b.domain_data?.date ?? b.created_at ?? '';
        return da > db ? -1 : 1;
      })
      .slice(0, 10)
      .map(n => ({
        id: n.id,
        date: n.domain_data?.date ?? n.created_at ?? '',
        title: n.domain_data?.title ?? n.domain_data?.name ?? '',
        domain: n.domain ?? 'unresolved',
      }));
  }, [filtered]);

  return (
    <Stack gap="lg" p="md">
      {/* Date range selector */}
      <Group gap="sm" align="flex-end">
        <TextInput
          label="시작일"
          type="date"
          size="xs"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          styles={{ input: { border: '0.5px solid var(--mantine-color-default-border)' } }}
        />
        <Text fz="xs" c="dimmed" pb={6}>~</Text>
        <TextInput
          label="종료일"
          type="date"
          size="xs"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          styles={{ input: { border: '0.5px solid var(--mantine-color-default-border)' } }}
        />
      </Group>

      {/* Stats panel */}
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
        <Box
          px="sm" py="xs"
          style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}
        >
          <Group gap={4} mb={2}>
            <CalendarBlank size={12} />
            <Text fz={10} c="dimmed">전체 기록</Text>
          </Group>
          <Text fz="lg" fw={700}>{filtered.length}건</Text>
        </Box>
        {totalSpending > 0 && (
          <Box
            px="sm" py="xs"
            style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}
          >
            <Group gap={4} mb={2}>
              <CurrencyCircleDollar size={12} />
              <Text fz={10} c="dimmed">총 지출</Text>
            </Group>
            <Text fz="lg" fw={700}>{totalSpending.toLocaleString()}원</Text>
          </Box>
        )}
        {domainBreakdown.map(([domain, count]) => (
          <Box
            key={domain}
            px="sm" py="xs"
            style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8 }}
          >
            <Text fz={10} c="dimmed">{DOMAIN_LABELS[domain] ?? domain}</Text>
            <Text fz="lg" fw={700}>{count}</Text>
          </Box>
        ))}
      </SimpleGrid>

      {/* Top people */}
      {topPeople.length > 0 && (
        <Box>
          <Group gap={4} mb="xs">
            <Users size={14} />
            <Text fz="sm" fw={600}>이 시기에 자주 만난 사람</Text>
          </Group>
          <Group gap="xs">
            {topPeople.map(([name, count]) => (
              <Badge key={name} variant="light" color="gray" size="sm">
                {name} ({count}회)
              </Badge>
            ))}
          </Group>
        </Box>
      )}

      {/* Emotion summary */}
      {topEmotions.length > 0 && (
        <Box>
          <Group gap={4} mb="xs">
            <Smiley size={14} />
            <Text fz="sm" fw={600}>감정 요약</Text>
          </Group>
          <Group gap="xs">
            {topEmotions.map(([emotion, count]) => (
              <Badge key={emotion} variant="outline" color="gray" size="sm">
                {emotion} ({count})
              </Badge>
            ))}
          </Group>
        </Box>
      )}

      {/* Mini timeline */}
      {timeline.length > 0 && (
        <>
          <Divider color="var(--mantine-color-default-border)" />
          <Box>
            <Text fz="sm" fw={600} mb="sm">주요 기록</Text>
            <Stack gap={4}>
              {timeline.map(item => (
                <Group
                  key={item.id}
                  px="sm" py="xs"
                  gap="sm"
                  wrap="nowrap"
                  style={{
                    border: '0.5px solid var(--mantine-color-default-border)',
                    borderRadius: 8,
                  }}
                >
                  <Text fz={10} c="dimmed" style={{ width: 56, flexShrink: 0 }}>
                    {item.date ? dayjs(item.date).format('MM.DD') : ''}
                  </Text>
                  <Badge variant="light" color="gray" size="xs" style={{ flexShrink: 0 }}>
                    {DOMAIN_LABELS[item.domain] ?? item.domain}
                  </Badge>
                  <Text fz="xs" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
                    {item.title}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Stack>
  );
}

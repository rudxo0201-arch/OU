'use client';

import { useState } from 'react';
import { Box, Grid, Text, Stack, Group, Badge, ActionIcon, Paper } from '@mantine/core';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

export function CalendarView({ nodes }: ViewProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');
  const startDay = startOfMonth.day();

  const events = nodes
    .filter(n => n.domain === 'schedule' && n.domain_data?.date)
    .map(n => ({
      id: n.id,
      date: dayjs(n.domain_data.date),
      title: n.domain_data.title ?? (n.raw ?? '').slice(0, 20) ?? '일정',
    }));

  const getEventsForDate = (date: dayjs.Dayjs) =>
    events.filter(e => e.date.format('YYYY-MM-DD') === date.format('YYYY-MM-DD'));

  const days: (dayjs.Dayjs | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: endOfMonth.date() }, (_, i) =>
      startOfMonth.add(i, 'day')
    ),
  ];

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Stack gap="sm" p="md">
      <Group justify="space-between">
        <ActionIcon variant="subtle" color="gray" onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))}>
          <CaretLeft size={16} />
        </ActionIcon>
        <Text fw={600}>{currentMonth.format('YYYY년 M월')}</Text>
        <ActionIcon variant="subtle" color="gray" onClick={() => setCurrentMonth(m => m.add(1, 'month'))}>
          <CaretRight size={16} />
        </ActionIcon>
      </Group>

      <Grid columns={7} gutter={4}>
        {WEEKDAYS.map(day => (
          <Grid.Col key={day} span={1}>
            <Text ta="center" fz={11} c="dimmed">{day}</Text>
          </Grid.Col>
        ))}
      </Grid>

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
                    ? '1px solid var(--mantine-color-default-border)'
                    : '0.5px solid var(--mantine-color-default-border)',
                  borderRadius: 4,
                  boxShadow: isToday ? '0 0 0 1px var(--mantine-color-default-border)' : undefined,
                }}
              >
                <Text fz={11} fw={isToday ? 700 : 400}>
                  {day.date()}
                </Text>
                <Stack gap={2} mt={2}>
                  {dayEvents.slice(0, 2).map(e => (
                    <Badge key={e.id} size="xs" variant="light" color="gray" style={{ fontSize: 9, maxWidth: '100%' }}>
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

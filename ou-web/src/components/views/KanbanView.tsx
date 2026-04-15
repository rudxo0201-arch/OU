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
              <Group gap="xs">
                <Text fz="sm" fw={600}>{col.label}</Text>
                <Badge size="xs" variant="light" color="gray">{colTasks.length}</Badge>
              </Group>

              {colTasks.map(task => (
                <Paper key={task.id} p="sm">
                  <Text fz="sm" lineClamp={2}>
                    {task.domain_data?.title ?? (task.raw ?? '').slice(0, 50) ?? '태스크'}
                  </Text>
                  {task.domain_data?.due && (
                    <Text fz={11} c="dimmed" mt={4}>마감: {task.domain_data.due}</Text>
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

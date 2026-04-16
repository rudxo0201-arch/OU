'use client';

import { useState, useCallback, useMemo } from 'react';
import { Group, Stack, Paper, Text, Badge, ScrollArea, Box } from '@mantine/core';
import { Circle } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

const DEFAULT_COLUMNS = [
  { id: 'todo',        label: '할 일' },
  { id: 'in_progress', label: '진행 중' },
  { id: 'done',        label: '완료' },
];

function getPriorityOpacity(priority?: number | string): number {
  if (!priority) return 0.2;
  const n = typeof priority === 'string' ? parseInt(priority, 10) : priority;
  if (n >= 3) return 0.9;
  if (n === 2) return 0.6;
  return 0.3;
}

export function KanbanView({ nodes }: ViewProps) {
  const tasks = nodes.filter(n => n.domain === 'task');
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  // Build columns from default + any custom statuses found in data
  const columns = useMemo(() => {
    const knownIds = new Set(DEFAULT_COLUMNS.map(c => c.id));
    const extra: { id: string; label: string }[] = [];
    tasks.forEach(n => {
      const s = statusOverrides[n.id] ?? n.domain_data?.status;
      if (s && !knownIds.has(s)) {
        knownIds.add(s);
        extra.push({ id: s, label: s.replace(/_/g, ' ') });
      }
    });
    return [...DEFAULT_COLUMNS, ...extra];
  }, [tasks, statusOverrides]);

  const getStatus = useCallback((node: any) =>
    statusOverrides[node.id] ?? node.domain_data?.status ?? 'todo',
  [statusOverrides]);

  const getTasksByStatus = useCallback((status: string) =>
    tasks.filter(n => getStatus(n) === status),
  [tasks, getStatus]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      setStatusOverrides(prev => ({ ...prev, [id]: colId }));
    }
    setDragOverCol(null);
    setDragId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragOverCol(null);
    setDragId(null);
  }, []);

  return (
    <ScrollArea>
      <Group gap="md" p="md" align="flex-start" wrap="nowrap">
        {columns.map(col => {
          const colTasks = getTasksByStatus(col.id);
          const isOver = dragOverCol === col.id;
          return (
            <Stack
              key={col.id}
              gap="xs"
              style={{ minWidth: 220, flex: 1 }}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => handleDrop(e, col.id)}
            >
              <Group gap="xs" mb={4}>
                <Text fz="sm" fw={600}>{col.label}</Text>
                <Badge size="xs" variant="light" color="gray">{colTasks.length}</Badge>
              </Group>

              <Stack
                gap="xs"
                style={{
                  minHeight: 60,
                  borderRadius: 8,
                  border: colTasks.length === 0 || isOver
                    ? `1.5px dashed var(--mantine-color-default-border)`
                    : '1.5px solid transparent',
                  background: isOver ? 'var(--mantine-color-gray-1)' : undefined,
                  transition: 'background 200ms, border-color 200ms',
                  padding: 4,
                }}
              >
                {colTasks.map(task => {
                  const isDragging = dragId === task.id;
                  return (
                    <Paper
                      key={task.id}
                      p="sm"
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        border: '0.5px solid var(--mantine-color-default-border)',
                        opacity: isDragging ? 0.4 : 1,
                        cursor: 'grab',
                        transition: 'opacity 200ms, box-shadow 200ms',
                        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
                      }}
                    >
                      <Group gap={6} align="center" mb={4} wrap="nowrap">
                        <Circle
                          size={8}
                          weight="fill"
                          style={{ opacity: getPriorityOpacity(task.domain_data?.priority), flexShrink: 0 }}
                        />
                        <Text fz="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
                          {task.domain_data?.title ?? ((task.raw ?? '').slice(0, 50) || '태스크')}
                        </Text>
                      </Group>
                      {task.domain_data?.description && (
                        <Text fz={11} c="dimmed" lineClamp={2} mt={2}>
                          {task.domain_data.description}
                        </Text>
                      )}
                      {task.domain_data?.due && (
                        <Text fz={11} c="dimmed" mt={4}>
                          마감: {task.domain_data.due}
                        </Text>
                      )}
                    </Paper>
                  );
                })}

                {colTasks.length === 0 && (
                  <Box py="lg">
                    <Text fz="xs" c="dimmed" ta="center">
                      {isOver ? '여기에 놓기' : '비어있음'}
                    </Text>
                  </Box>
                )}
              </Stack>
            </Stack>
          );
        })}
      </Group>
    </ScrollArea>
  );
}

'use client';

import { useState, useCallback, useMemo } from 'react';
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

export function KanbanView({ nodes, inline }: ViewProps & { inline?: boolean }) {
  const tasks = nodes.filter(n => n.domain === 'task');

  // 인라인: 체크리스트 카드
  if (inline) {
    return (
      <div style={{
        padding: '10px 14px',
        border: '0.5px solid var(--ou-border-subtle)',
        borderRadius: 'var(--ou-radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {tasks.map(n => {
          const status = n.domain_data?.status ?? 'todo';
          const isDone = status === 'done';
          const title = n.domain_data?.title ?? (n.raw ?? '').slice(0, 30);
          const deadline = n.domain_data?.deadline;
          return (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${isDone ? 'var(--ou-text-body)' : 'var(--ou-border-subtle)'}`,
                background: isDone ? 'var(--ou-text-body)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isDone && <span style={{ color: 'var(--ou-bg)', fontSize: 10, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{
                fontSize: 12, color: 'var(--ou-text-heading)',
                textDecoration: isDone ? 'line-through' : 'none',
                opacity: isDone ? 0.5 : 1,
                flex: 1,
              }}>
                {title}
              </span>
              {deadline && (
                <span style={{ fontSize: 10, color: 'var(--ou-text-muted)', flexShrink: 0 }}>
                  {deadline}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

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

  const getStatus = useCallback((node: ViewProps['nodes'][number]) =>
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
    <div style={{ overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 16, padding: 16, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        {columns.map(col => {
          const colTasks = getTasksByStatus(col.id);
          const isOver = dragOverCol === col.id;
          return (
            <div
              key={col.id}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220, flex: 1 }}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{col.label}</span>
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--ou-bg)',
                  boxShadow: 'var(--ou-neu-pressed-sm)',
                  color: 'var(--ou-text-muted)',
                }}>{colTasks.length}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  minHeight: 60,
                  borderRadius: 8,
                  border: `1.5px ${colTasks.length === 0 || isOver ? 'dashed' : 'solid'} ${isOver ? 'var(--ou-border-subtle)' : colTasks.length === 0 ? 'var(--ou-border-faint)' : 'transparent'}`,
                  background: isOver ? 'var(--ou-bg)' : undefined,
                  boxShadow: isOver ? 'var(--ou-neu-pressed-sm)' : undefined,
                  transition: 'background 200ms, border-color 200ms',
                  padding: 4,
                }}
              >
                {colTasks.map(task => {
                  const isDragging = dragId === task.id;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      style={{
                        padding: 12,
                        border: '0.5px solid var(--ou-border-subtle)',
                        borderRadius: 8,
                        background: 'var(--ou-bg)',
                        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'var(--ou-neu-raised-sm)',
                        opacity: isDragging ? 0.4 : 1,
                        cursor: 'grab',
                        transition: 'opacity 200ms, box-shadow 200ms',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'nowrap' }}>
                        <Circle
                          size={8}
                          weight="fill"
                          style={{ opacity: getPriorityOpacity(task.domain_data?.priority), flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.domain_data?.title ?? ((task.raw ?? '').slice(0, 50) || '태스크')}
                        </span>
                      </div>
                      {task.domain_data?.description && (
                        <p style={{ fontSize: 11, color: 'var(--ou-text-muted)', margin: '2px 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {task.domain_data.description}
                        </p>
                      )}
                      {task.domain_data?.due && (
                        <p style={{ fontSize: 11, color: 'var(--ou-text-muted)', margin: '4px 0 0' }}>
                          마감: {task.domain_data.due}
                        </p>
                      )}
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div style={{ padding: '24px 0' }}>
                    <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', textAlign: 'center', margin: 0 }}>
                      {isOver ? '여기에 놓기' : '비어있음'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

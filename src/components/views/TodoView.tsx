'use client';

import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { stripLLMMeta } from '@/lib/utils/stripLLMMeta';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

/**
 * 투두 리스트 뷰
 * 참고: Apple 리마인더, Todoist, Things 3
 * - 날짜별 그룹핑
 * - 체크박스 토글
 * - 완료 항목 접기
 * - 우선순위 표시 (도트 색상)
 */

type TodoItem = {
  id: string;
  title: string;
  done: boolean;
  date?: string;
  deadline?: string;
  priority?: number;
  raw?: string;
};

function parseTodos(nodes: ViewProps['nodes']): TodoItem[] {
  return nodes
    .filter(n => n.domain === 'task')
    .map(n => ({
      id: n.id,
      title: n.domain_data?.title ?? (stripLLMMeta(n.raw ?? '').slice(0, 60) || '할 일'),
      done: n.domain_data?.status === 'done' || n.domain_data?.completed === true,
      date: n.domain_data?.date || n.domain_data?.deadline || n.created_at,
      deadline: n.domain_data?.deadline,
      priority: n.domain_data?.priority,
      raw: n.raw,
    }));
}

function groupByDate(items: TodoItem[]): { label: string; items: TodoItem[] }[] {
  const groups = new Map<string, TodoItem[]>();
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

  for (const item of items) {
    const dateStr = item.date ? dayjs(item.date).format('YYYY-MM-DD') : 'no-date';
    if (!groups.has(dateStr)) groups.set(dateStr, []);
    groups.get(dateStr)!.push(item);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'no-date') return 1;
      if (b === 'no-date') return -1;
      return a.localeCompare(b);
    })
    .map(([dateStr, items]) => ({
      label: dateStr === today ? '오늘'
        : dateStr === tomorrow ? '내일'
        : dateStr === 'no-date' ? '날짜 없음'
        : dayjs(dateStr).format('M월 D일 (ddd)'),
      items,
    }));
}

export function TodoView({ nodes, inline }: ViewProps) {
  const [doneVisible, setDoneVisible] = useState(false);
  const [toggledIds, setToggledIds] = useState<Set<string>>(new Set());

  const allTodos = useMemo(() => parseTodos(nodes), [nodes]);

  const toggle = (id: string) => {
    setToggledIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getIsDone = (item: TodoItem) =>
    toggledIds.has(item.id) ? !item.done : item.done;

  const activeTodos = allTodos.filter(t => !getIsDone(t));
  const doneTodos = allTodos.filter(t => getIsDone(t));
  const activeGroups = groupByDate(activeTodos);

  // 인라인: 컴팩트 체크리스트
  if (inline) {
    const items = allTodos.slice(0, 5);
    return (
      <div style={{
        padding: '10px 14px',
        border: 'none',
        borderRadius: 'var(--ou-radius-md, 8px)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: 1 }}>TODO</span>
        {items.map(item => (
          <TodoRow key={item.id} item={item} isDone={getIsDone(item)} onToggle={() => toggle(item.id)} compact />
        ))}
        {allTodos.length > 5 && (
          <span style={{ fontSize: 10, color: 'var(--ou-text-muted)' }}>+{allTodos.length - 5}개 더</span>
        )}
      </div>
    );
  }

  // 전체 뷰
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ou-text-heading)', margin: 0 }}>
          할 일
        </h2>
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
          {activeTodos.length}개 남음
        </span>
      </div>

      {/* Active groups */}
      {activeGroups.map(group => (
        <div key={group.label} style={{ marginBottom: 20 }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: group.label === '오늘' ? 'var(--ou-text-strong, #fff)' : 'var(--ou-text-dimmed, #888)',
            display: 'block', marginBottom: 8,
          }}>
            {group.label}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.items.map(item => (
              <TodoRow key={item.id} item={item} isDone={getIsDone(item)} onToggle={() => toggle(item.id)} />
            ))}
          </div>
        </div>
      ))}

      {activeTodos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ou-text-muted)', fontSize: 13 }}>
          모든 할 일을 완료했어요
        </div>
      )}

      {/* Done section */}
      {doneTodos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setDoneVisible(!doneVisible)}
            style={{
              fontSize: 12, color: 'var(--ou-text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 8, border: 'none', background: 'none',
              padding: '6px 12px', borderRadius: 8,
              boxShadow: doneVisible ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
            }}
          >
            <span style={{ fontSize: 10 }}>{doneVisible ? '▼' : '▶'}</span>
            완료됨 ({doneTodos.length})
          </button>
          {doneVisible && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.5 }}>
              {doneTodos.map(item => (
                <TodoRow key={item.id} item={item} isDone onToggle={() => toggle(item.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Todo Row ----
function TodoRow({ item, isDone, onToggle, compact }: {
  item: TodoItem;
  isDone: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const priorityColor = item.priority && item.priority >= 3
    ? 'rgba(255,120,100,0.8)'
    : item.priority === 2
    ? 'rgba(255,200,100,0.8)'
    : 'var(--ou-border-muted)';

  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: compact ? 8 : 10,
        padding: compact ? '3px 4px' : '8px 10px',
        cursor: 'pointer',
        borderRadius: 8,
        transition: '150ms ease',
        boxShadow: isDone ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
        marginBottom: compact ? 0 : 2,
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: compact ? 14 : 18,
        height: compact ? 14 : 18,
        borderRadius: compact ? 3 : 5,
        border: isDone
          ? `1.5px solid var(--ou-text-muted)`
          : `1.5px solid ${priorityColor}`,
        background: isDone ? 'var(--ou-text-muted)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: '150ms ease',
      }}>
        {isDone && (
          <svg width={compact ? 8 : 10} height={compact ? 8 : 10} viewBox="0 0 10 10" fill="none">
            <path d="M2 5.5L4 7.5L8 3" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Title */}
      <span style={{
        fontSize: compact ? 12 : 13,
        color: isDone ? 'var(--ou-text-dimmed, #888)' : 'var(--ou-text-strong, #fff)',
        textDecoration: isDone ? 'line-through' : 'none',
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.title}
      </span>

      {/* Deadline */}
      {item.deadline && !compact && (
        <span style={{ fontSize: 10, color: 'var(--ou-text-muted)', flexShrink: 0 }}>
          {dayjs(item.deadline).format('M/D')}
        </span>
      )}
    </div>
  );
}

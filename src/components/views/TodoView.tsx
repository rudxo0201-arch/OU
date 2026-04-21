'use client';

import { useState, useMemo } from 'react';
import { CaretDown, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { stripLLMMeta } from '@/lib/utils/stripLLMMeta';
import { cleanDisplayText } from '@/lib/utils/cleanDisplayText';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

/**
 * Todo 리스트 뷰 — Todoist / Things 3 참고
 * - 날짜별 그룹핑 (오늘 / 내일 / M월 D일)
 * - 44px 아이템 높이, 18px 체크박스
 * - 마감일 배지, 우선순위 도트
 * - 완료 섹션 접기/펼치기
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
      title: n.domain_data?.title
        ? cleanDisplayText(n.domain_data.title)
        : cleanDisplayText(stripLLMMeta(n.raw ?? '').slice(0, 60)) || '할 일',
      done: n.domain_data?.status === 'done' || n.domain_data?.completed === true,
      date: n.domain_data?.date || n.domain_data?.deadline || n.created_at,
      deadline: n.domain_data?.deadline,
      priority: n.domain_data?.priority,
      raw: n.raw,
    }));
}

function groupByDate(items: TodoItem[]): { label: string; isToday: boolean; items: TodoItem[] }[] {
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
      isToday: dateStr === today,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(item => (
          <TodoRow key={item.id} item={item} isDone={getIsDone(item)} onToggle={() => toggle(item.id)} compact />
        ))}
        {allTodos.length > 5 && (
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', paddingLeft: 28 }}>
            +{allTodos.length - 5}개 더
          </span>
        )}
      </div>
    );
  }

  // 전체 뷰
  return (
    <div style={{ maxWidth: 680, paddingBottom: 40 }}>

      {/* 날짜 그룹 */}
      {activeGroups.map(group => (
        <div key={group.label} style={{ marginBottom: 32 }}>
          {/* 그룹 헤더 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 4,
            paddingBottom: 8,
            borderBottom: '1px solid var(--ou-border-faint)',
          }}>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: group.isToday ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)',
              letterSpacing: '-0.01em',
            }}>
              {group.label}
            </span>
            <span style={{
              fontSize: 11,
              color: 'var(--ou-text-disabled)',
              fontFamily: 'var(--ou-font-mono)',
            }}>
              {group.items.length}
            </span>
          </div>

          {/* 아이템 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {group.items.map(item => (
              <TodoRow
                key={item.id}
                item={item}
                isDone={getIsDone(item)}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {activeTodos.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '64px 0',
          color: 'var(--ou-text-disabled)',
          fontSize: 14,
        }}>
          모든 할 일을 완료했어요 ✓
        </div>
      )}

      {/* 완료 섹션 */}
      {doneTodos.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setDoneVisible(!doneVisible)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px',
              border: 'none', borderRadius: 8,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--ou-text-secondary)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {doneVisible
              ? <CaretDown size={14} weight="bold" />
              : <CaretRight size={14} weight="bold" />
            }
            완료됨
            <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)', fontFamily: 'var(--ou-font-mono)' }}>
              {doneTodos.length}
            </span>
          </button>
          {doneVisible && (
            <div style={{ display: 'flex', flexDirection: 'column', opacity: 0.5, marginTop: 4 }}>
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

// ── Todo Row ───────────────────────────────────────────────────────────

function TodoRow({ item, isDone, onToggle, compact }: {
  item: TodoItem;
  isDone: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const priorityColor = item.priority && item.priority >= 3
    ? 'rgba(255,100,80,0.9)'
    : item.priority === 2
    ? 'rgba(255,180,60,0.9)'
    : 'var(--ou-border-muted)';

  const isOverdue = !isDone && item.deadline
    && dayjs(item.deadline).isBefore(dayjs(), 'day');

  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 8 : 12,
        height: compact ? 32 : 44,
        padding: compact ? '0 4px' : '0 12px',
        cursor: 'pointer',
        borderRadius: 8,
        transition: 'background 100ms ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--ou-surface-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* 체크박스 */}
      <div style={{
        width: compact ? 15 : 18,
        height: compact ? 15 : 18,
        borderRadius: compact ? 4 : 5,
        border: isDone ? '1.5px solid var(--ou-text-disabled)' : `1.5px solid ${priorityColor}`,
        background: isDone ? 'var(--ou-surface-muted)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: '150ms ease',
      }}>
        {isDone && (
          <svg width={compact ? 8 : 10} height={compact ? 8 : 10} viewBox="0 0 10 10" fill="none">
            <path d="M2 5.5L4 7.5L8 3" stroke="var(--ou-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* 제목 */}
      <span style={{
        fontSize: compact ? 13 : 14,
        color: isDone ? 'var(--ou-text-disabled)' : 'var(--ou-text-body)',
        textDecoration: isDone ? 'line-through' : 'none',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
      }}>
        {item.title}
      </span>

      {/* 마감일 */}
      {item.deadline && !compact && (
        <span style={{
          fontSize: 12,
          color: isOverdue ? 'rgba(255,100,80,0.8)' : 'var(--ou-text-disabled)',
          flexShrink: 0,
          fontFamily: 'var(--ou-font-mono)',
        }}>
          {dayjs(item.deadline).format('M/D')}
        </span>
      )}
    </div>
  );
}

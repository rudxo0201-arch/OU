'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { stripLLMMeta } from '@/lib/utils/stripLLMMeta';
import { cleanDisplayText } from '@/lib/utils/cleanDisplayText';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';
import { useDeleteNode } from './_shared/useDeleteNode';
import styles from './TodoView.module.css';

dayjs.locale('ko');

// ── 타입 ──────────────────────────────────────────────────────────────────
type Priority = 1 | 2 | 3 | 4; // 4=긴급, 3=높음, 2=보통, 1=낮음
type SubTab = 'today' | 'upcoming' | 'all' | 'done';

interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  date?: string;
  deadline?: string;
  priority: Priority;
  project?: string;
  nodeId: string;
}

// ── 파서 ──────────────────────────────────────────────────────────────────
function parseTodos(nodes: ViewProps['nodes']): TodoItem[] {
  return nodes
    .filter(n => n.domain === DOMAINS.TASK)
    .map(n => ({
      nodeId: n.id,
      id: n.id,
      title: n.domain_data?.title
        ? cleanDisplayText(n.domain_data.title)
        : cleanDisplayText(stripLLMMeta(n.raw ?? '').slice(0, 60)) || '할 일',
      done: n.domain_data?.status === 'done' || n.domain_data?.completed === true,
      date: n.domain_data?.date || n.created_at,
      deadline: n.domain_data?.deadline,
      priority: (n.domain_data?.priority as Priority) || 1,
      project: n.domain_data?.project,
    }));
}

function isOverdue(item: TodoItem) {
  if (!item.deadline || item.done) return false;
  return dayjs(item.deadline).isBefore(dayjs(), 'day');
}

function isToday(item: TodoItem) {
  if (item.deadline) return dayjs(item.deadline).isSame(dayjs(), 'day');
  if (item.date) return dayjs(item.date).isSame(dayjs(), 'day');
  return false;
}

function isUpcoming(item: TodoItem) {
  const d = item.deadline || item.date;
  if (!d) return false;
  const t = dayjs(d);
  return t.isAfter(dayjs(), 'day') && t.isBefore(dayjs().add(7, 'day'), 'day');
}

const PRIORITY_COLOR: Record<Priority, string> = {
  4: 'rgba(0,0,0,0.85)',
  3: 'rgba(0,0,0,0.55)',
  2: 'rgba(0,0,0,0.30)',
  1: 'rgba(0,0,0,0.18)',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  4: '긴급', 3: '높음', 2: '보통', 1: '낮음',
};

// ── 프로젝트 그루핑 ───────────────────────────────────────────────────────
function groupByProject(items: TodoItem[]): { label: string; items: TodoItem[] }[] {
  const map = new Map<string, TodoItem[]>();
  for (const it of items) {
    const key = it.project || '받은편지함';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  const result: { label: string; items: TodoItem[] }[] = [];
  if (map.has('받은편지함')) result.push({ label: '받은편지함', items: map.get('받은편지함')! });
  Array.from(map.entries()).forEach(([k, v]) => {
    if (k !== '받은편지함') result.push({ label: k, items: v });
  });
  return result;
}

// ── 개별 할 일 행 ─────────────────────────────────────────────────────────
function TodoRow({ item, onToggle, onDelete, compact }: {
  item: TodoItem;
  onToggle: (id: string, done: boolean) => void;
  onDelete?: (id: string, title: string) => void;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const overdue = isOverdue(item);
  const p = item.priority;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: compact ? 8 : 10,
        padding: compact ? '5px 6px' : '9px 12px',
        borderRadius: 8,
        background: hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
        transition: '150ms',
      }}
    >
      {/* 체크박스 */}
      <button
        onClick={() => onToggle(item.id, !item.done)}
        style={{
          width: compact ? 16 : 18, height: compact ? 16 : 18,
          borderRadius: p >= 3 ? 4 : '50%',
          border: `2px solid ${item.done ? 'rgba(0,0,0,0.20)' : PRIORITY_COLOR[p]}`,
          background: item.done ? 'rgba(0,0,0,0.08)' : 'transparent',
          cursor: 'pointer', flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: '150ms',
        }}
      >
        {item.done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5.5L4 7.5L8 3" stroke="rgba(0,0,0,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: compact ? 12 : 13,
          color: item.done ? 'var(--ou-text-disabled)' : 'var(--ou-text-body)',
          textDecoration: item.done ? 'line-through' : 'none',
          lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title}
        </div>
        {item.deadline && !compact && (
          <div style={{
            fontSize: 11, marginTop: 2,
            color: overdue ? 'rgba(0,0,0,0.75)' : 'var(--ou-text-disabled)',
            fontWeight: overdue ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <span>{overdue ? '⚠' : '◷'}</span>
            <span>{dayjs(item.deadline).format('M월 D일 (ddd)')}</span>
            {overdue && <span> · 기한 지남</span>}
          </div>
        )}
      </div>

      {/* 우선순위 뱃지 */}
      {p >= 3 && !compact && (
        <span style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 999, flexShrink: 0,
          background: 'rgba(0,0,0,0.06)',
          color: PRIORITY_COLOR[p],
          border: `1px solid ${PRIORITY_COLOR[p]}`,
          fontWeight: 600, marginTop: 2,
        }}>
          {PRIORITY_LABEL[p]}
        </span>
      )}

      {/* 삭제 버튼 */}
      {!compact && onDelete && hovered && (
        <button
          onClick={() => onDelete(item.nodeId, item.title)}
          style={{
            flexShrink: 0, marginTop: 2,
            width: 20, height: 20,
            borderRadius: 4, border: 'none',
            background: 'none', cursor: 'pointer',
            color: 'rgba(0,0,0,0.30)',
            fontSize: 13, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: '150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.75)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.30)')}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SectionLabel({ label, color }: { label: string; color?: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700,
      color: color || 'var(--ou-text-disabled)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '10px 12px 4px',
    }}>
      {label}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────
export function TodoView({ nodes, inline }: ViewProps) {
  const [subTab, setSubTab] = useState<SubTab>('today');
  const [localDone, setLocalDone] = useState<Record<string, boolean>>({});
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set());
  const deleteNode = useDeleteNode();

  const allTodosRaw = useMemo(() => parseTodos(nodes), [nodes]);
  const allTodos = useMemo(() => allTodosRaw.filter(t => !localDeleted.has(t.id)), [allTodosRaw, localDeleted]);

  const getIsDone = useCallback((item: TodoItem) =>
    localDone[item.id] !== undefined ? localDone[item.id] : item.done,
  [localDone]);

  const handleDelete = useCallback(async (nodeId: string, title: string) => {
    const ok = await deleteNode(nodeId, title);
    if (ok) setLocalDeleted(prev => new Set(prev).add(nodeId));
  }, [deleteNode]);

  const handleToggle = useCallback((id: string, done: boolean) => {
    setLocalDone(prev => ({ ...prev, [id]: done }));
    const item = allTodos.find(t => t.id === id);
    if (!item) return;
    fetch(`/api/nodes/${item.nodeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain_data: { status: done ? 'done' : 'todo', completed: done } }),
    }).catch(() => {});
  }, [allTodos]);

  const active = allTodos.filter(t => !getIsDone(t));
  const done   = allTodos.filter(t =>  getIsDone(t));

  const overdueItems  = active.filter(isOverdue);
  const todayItems    = active.filter(t => isToday(t) && !isOverdue(t));
  const upcomingItems = active.filter(isUpcoming);

  const tabItems = useMemo(() => {
    switch (subTab) {
      case 'today':    return [...overdueItems, ...todayItems];
      case 'upcoming': return upcomingItems;
      case 'all':      return active;
      case 'done':     return done;
      default:         return active;
    }
  }, [subTab, active, done, overdueItems, todayItems, upcomingItems]);

  // ── 인라인 ────────────────────────────────────────────────────────────
  if (inline) {
    const items = active.slice(0, 5);
    return (
      <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', padding: '0 6px 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          할 일{active.length > 0 ? ` · ${active.length}개` : ''}
        </span>
        {items.map(item => (
          <TodoRow key={item.id} item={{ ...item, done: getIsDone(item) }} onToggle={handleToggle} compact />
        ))}
        {active.length > 5 && (
          <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', padding: '2px 6px' }}>
            +{active.length - 5}개 더
          </span>
        )}
      </div>
    );
  }

  const navItems: [SubTab, string, number, boolean][] = [
    ['today',    '오늘',  todayItems.length + overdueItems.length, overdueItems.length > 0],
    ['upcoming', '예정',  upcomingItems.length, false],
    ['all',      '전체',  active.length, false],
    ['done',     '완료',  done.length, false],
  ];

  // ── 전체 (데스크톱 사이드바 레이아웃) ──────────────────────────────────
  return (
    <div className={styles.root}>
      {/* ── 좌측 사이드바 ── */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarTitle}>할 일</div>
        {navItems.map(([key, label, count, isAlert]) => (
          <button key={key}
            className={`${styles.sidebarItem} ${subTab === key ? styles.sidebarItemActive : ''}`}
            onClick={() => setSubTab(key)}>
            <span className={`${styles.sidebarItemLabel} ${subTab === key ? styles.sidebarItemLabelActive : ''}`}>
              {label}
            </span>
            {count > 0 && (
              <span className={`${styles.sidebarItemCount} ${isAlert ? styles.sidebarItemCountAlert : ''}`}>
                {count}
              </span>
            )}
          </button>
        ))}
        <div className={styles.sidebarDivider} />
        <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', padding: '4px 10px' }}>
          총 {allTodos.length}개
        </div>
      </nav>

      {/* ── 메인 콘텐츠 ── */}
      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <h2 className={styles.mainTitle}>
            {navItems.find(([k]) => k === subTab)?.[1] ?? ''}
          </h2>
          <div className={styles.mainMeta}>
            {overdueItems.length > 0 && (
              <span className={styles.overdueAlert}>⚠ {overdueItems.length}개 기한 지남</span>
            )}
            <span>{active.length}개 남음</span>
          </div>
        </div>

        {/* 빈 상태 */}
        {tabItems.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>✓</div>
            <div className={styles.emptyText}>
              {subTab === 'today' && '오늘 할 일이 없습니다'}
              {subTab === 'upcoming' && '예정된 할 일이 없습니다'}
              {subTab === 'all' && '할 일이 없습니다'}
              {subTab === 'done' && '완료된 항목이 없습니다'}
            </div>
            {(subTab === 'today' || subTab === 'all') && (
              <div className={styles.emptyHint}>Orb에서 할 일을 추가해보세요</div>
            )}
          </div>
        )}

        {/* 오늘 탭 */}
        {subTab === 'today' && tabItems.length > 0 && (
          <div className={styles.section}>
            {overdueItems.length > 0 && <SectionLabel label="기한 지남" />}
            <div className={styles.todoList}>
              {overdueItems.map(item => (
                <TodoRow key={item.id} item={{ ...item, done: getIsDone(item) }} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
            {todayItems.length > 0 && overdueItems.length > 0 && <SectionLabel label="오늘" />}
            <div className={styles.todoList}>
              {todayItems.map(item => (
                <TodoRow key={item.id} item={{ ...item, done: getIsDone(item) }} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        {/* 예정 탭 */}
        {subTab === 'upcoming' && tabItems.length > 0 && (
          <div className={`${styles.section} ${styles.todoList}`}>
            {tabItems.map(item => (
              <TodoRow key={item.id} item={{ ...item, done: getIsDone(item) }} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* 전체 탭 — 프로젝트 그루핑 */}
        {subTab === 'all' && tabItems.length > 0 && (
          <div>
            {groupByProject(tabItems).map(group => (
              <div key={group.label} className={styles.section}>
                <SectionLabel label={group.label} />
                <div className={styles.todoList}>
                  {group.items.map(item => (
                    <TodoRow key={item.id} item={{ ...item, done: getIsDone(item) }} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 완료 탭 */}
        {subTab === 'done' && tabItems.length > 0 && (
          <div className={styles.todoList} style={{ opacity: 0.65 }}>
            {tabItems.map(item => (
              <TodoRow key={item.id} item={{ ...item, done: true }} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

/**
 * Task Widget C — Today Focus
 * 오늘 마감 / 나머지 2섹션 분리. 완료율 바.
 */

import { useState, useEffect } from 'react';
import { cleanDisplayText } from '@/lib/utils/cleanDisplayText';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface TaskNode {
  id: string;
  domain_data: { title?: string; status?: string; deadline?: string };
  raw?: string;
  created_at: string;
}

export function TaskWidgetC() {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch('/api/nodes?domain=task&limit=30')
      .then(r => r.json())
      .then(d => {
        const nodes: TaskNode[] = d.nodes || [];
        const pending = nodes
          .filter(n => n.domain_data?.title && (!n.domain_data.status || n.domain_data.status === 'pending' || n.domain_data.status === 'in_progress'))
          .slice(0, 10);
        setTasks(pending);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => setChecked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const todayTasks = tasks.filter(t => t.domain_data.deadline === today || t.created_at.slice(0, 10) === today);
  const otherTasks = tasks.filter(t => !todayTasks.includes(t));
  const done = checked.size;
  const total = tasks.length;

  const TaskRow = ({ t }: { t: TaskNode }) => {
    const isDone = checked.has(t.id);
    return (
      <div
        onClick={() => toggle(t.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', cursor: 'pointer' }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          background: isDone ? 'var(--ou-text-body)' : 'var(--ou-bg)',
          boxShadow: isDone ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 200ms ease',
        }}>
          {isDone && (
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
              <path d="M1 2.5L2.5 4L6 1" stroke="var(--ou-bg)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div style={{
          flex: 1, overflow: 'hidden',
          fontSize: 12, fontWeight: 500,
          color: isDone ? 'var(--ou-text-muted)' : 'var(--ou-text-strong)',
          textDecoration: isDone ? 'line-through' : 'none',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 200ms',
        }}>
          {cleanDisplayText(t.domain_data.title || t.raw?.slice(0, 50) || '할 일')}
        </div>
        {t.domain_data.deadline && t.domain_data.deadline !== today && !isDone && (
          <span style={{ fontSize: 9, color: 'var(--ou-text-dimmed)', flexShrink: 0 }}>
            {t.domain_data.deadline.slice(5).replace('-', '/')}
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>

      {/* ── Header + progress ── */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
            fontFamily: 'var(--ou-font-logo)',
          }}>
            할 일
          </span>
          <span style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 13, fontWeight: 700,
            color: total > 0 && done === total ? 'var(--ou-text-body)' : 'var(--ou-text-bright)',
          }}>
            {done}<span style={{ color: 'var(--ou-text-dimmed)', fontWeight: 400 }}>/{total}</span>
          </span>
        </div>
        {/* thin progress bar */}
        <div style={{
          height: 3, borderRadius: 2,
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-pressed-sm)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: total > 0 ? `${(done / total) * 100}%` : '0%',
            background: 'var(--ou-text-body)', borderRadius: 2,
            transition: 'width 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', padding: '4px 0' }}>...</div>
        ) : tasks.length === 0 ? (
          <WidgetEmptyState skeleton="task" />
        ) : (
          <>
            {/* Today section */}
            {todayTasks.length > 0 && (
              <>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                  color: 'var(--ou-text-muted)', textTransform: 'uppercase',
                  padding: '2px 0 4px',
                }}>
                  오늘
                </div>
                {todayTasks.map(t => <TaskRow key={t.id} t={t} />)}
              </>
            )}

            {/* Other section */}
            {otherTasks.length > 0 && (
              <>
                {todayTasks.length > 0 && (
                  <div style={{ height: 1, background: 'var(--ou-border-subtle)', margin: '6px 0' }} />
                )}
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                  color: 'var(--ou-text-muted)', textTransform: 'uppercase',
                  padding: '2px 0 4px',
                }}>
                  {todayTasks.length > 0 ? '이후' : '전체'}
                </div>
                {otherTasks.map(t => <TaskRow key={t.id} t={t} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

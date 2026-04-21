'use client';

/**
 * Task Widget B — Compact Clean Checklist
 * 심플 체크리스트. 여백 충분, 텍스트 크고 깔끔.
 * Things 3 / Apple Reminders 스타일
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cleanDisplayText } from '@/lib/utils/cleanDisplayText';

interface TaskNode {
  id: string;
  domain_data: { title?: string; status?: string; deadline?: string };
  raw?: string;
}

export function TaskWidgetB() {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/nodes?domain=task&limit=30')
      .then(r => r.json())
      .then(d => {
        const nodes: TaskNode[] = d.nodes || [];
        const pending = nodes
          .filter(n => n.domain_data?.title && (!n.domain_data.status || n.domain_data.status === 'pending' || n.domain_data.status === 'in_progress'))
          .slice(0, 7);
        setTasks(pending);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (id: string) => setChecked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)',
        }}>
          할 일
        </span>
        {tasks.length > 0 && (
          <span style={{
            fontSize: 10, color: 'var(--ou-text-muted)',
            fontFamily: 'var(--ou-font-mono)',
          }}>
            {checked.size}/{tasks.length}
          </span>
        )}
      </div>

      {/* ── Task List ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : tasks.length === 0 ? (
          <button onClick={() => router.push('/orb')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: 0, fontSize: 12,
            color: 'var(--ou-text-muted)', lineHeight: 1.5,
          }}>
            Orb에서 할 일을 말해보세요 →
          </button>
        ) : tasks.map((t, i) => {
          const isDone = checked.has(t.id);
          const isLast = i === tasks.length - 1;
          return (
            <div key={t.id}>
              <div
                onClick={() => toggle(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', cursor: 'pointer',
                }}
              >
                {/* Circle checkbox */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? 'var(--ou-text-body)' : 'var(--ou-bg)',
                  boxShadow: isDone ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 250ms ease',
                }}>
                  {isDone && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1.5 3.5L3.5 5.5L7.5 1.5" stroke="var(--ou-bg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, lineHeight: 1.3,
                    color: isDone ? 'var(--ou-text-muted)' : 'var(--ou-text-strong)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'color 200ms, text-decoration 200ms',
                  }}>
                    {cleanDisplayText(t.domain_data.title || t.raw?.slice(0, 50) || '할 일')}
                  </div>
                  {t.domain_data.deadline && !isDone && (
                    <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 2 }}>
                      {t.domain_data.deadline.slice(5).replace('-', '/')}까지
                    </div>
                  )}
                </div>
              </div>

              {/* Subtle divider */}
              {!isLast && (
                <div style={{ height: 1, background: 'var(--ou-border-faint)', marginLeft: 32 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

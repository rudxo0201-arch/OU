'use client';

/**
 * Task Widget A — Progress Hero + Checklist
 * Orbitron 완료/전체 카운터 + 원형 체크박스 리스트
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cleanDisplayText } from '@/lib/utils/cleanDisplayText';

interface TaskNode {
  id: string;
  domain_data: { title?: string; status?: string; priority?: string; deadline?: string };
  raw?: string;
}

export function TaskWidgetA() {
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
          .slice(0, 8);
        setTasks(pending);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const done = checked.size;
  const total = tasks.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>

      {/* ── Progress Hero ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 36, fontWeight: 700, lineHeight: 1,
            color: 'var(--ou-text-bright)', letterSpacing: '-0.02em',
          }}>
            {done}
          </span>
          <span style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 16, color: 'var(--ou-text-dimmed)', letterSpacing: '-0.01em',
          }}>
            /{total}
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
          color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
        }}>
          완료
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 2,
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
        marginBottom: 16, flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--ou-text-body)',
          borderRadius: 2,
          transition: 'width 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>

      {/* ── Task List ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        ) : tasks.map(t => {
          const isDone = checked.has(t.id);
          return (
            <div
              key={t.id}
              onClick={() => {
                setChecked(prev => {
                  const next = new Set(prev);
                  if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                  return next;
                });
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              {/* Circle checkbox */}
              <div style={{
                width: 18, height: 18,
                borderRadius: '50%',
                background: isDone ? 'var(--ou-text-body)' : 'var(--ou-bg)',
                boxShadow: isDone ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms ease',
              }}>
                {isDone && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="var(--ou-bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Title */}
              <div style={{
                flex: 1, overflow: 'hidden',
                fontSize: 13, fontWeight: 500,
                color: isDone ? 'var(--ou-text-dimmed)' : 'var(--ou-text-strong)',
                textDecoration: isDone ? 'line-through' : 'none',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'color 200ms ease',
              }}>
                {cleanDisplayText(t.domain_data.title || t.raw?.slice(0, 50) || '할 일')}
              </div>

              {/* Deadline badge */}
              {t.domain_data.deadline && !isDone && (
                <span style={{
                  fontSize: 9, color: 'var(--ou-text-dimmed)',
                  flexShrink: 0,
                }}>
                  {t.domain_data.deadline.slice(5).replace('-', '/')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

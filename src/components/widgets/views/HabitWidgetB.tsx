'use client';

/**
 * Habit Widget B — Circle Grid (Streaks App Style)
 * 습관을 원형 아이콘으로 배치. 완료 = 채워진 원.
 * 레퍼런스: Streaks (Apple Design Award)
 */

import { useState, useEffect } from 'react';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface HabitNode {
  id: string;
  domain_data: { title?: string };
  created_at: string;
}

export function HabitWidgetB() {
  const [habits, setHabits] = useState<{ title: string; doneToday: boolean; streak: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch('/api/nodes?domain=habit&limit=200')
      .then(r => r.json())
      .then(d => {
        const nodes: HabitNode[] = d.nodes || [];
        const map: Record<string, string[]> = {};
        for (const n of nodes) {
          if (!n.domain_data?.title) continue;
          const key = n.domain_data.title;
          if (!map[key]) map[key] = [];
          map[key].push(n.created_at.slice(0, 10));
        }
        const result = Object.entries(map)
          .slice(0, 6)
          .map(([title, dates]) => {
            const unique = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
            const doneToday = unique.includes(today);
            // simple streak
            let streak = 0;
            let expected = today;
            for (const d of unique) {
              if (d === expected) {
                streak++;
                const next = new Date(expected);
                next.setDate(next.getDate() - 1);
                expected = next.toISOString().slice(0, 10);
              } else if (d < expected) break;
            }
            return { title, doneToday, streak };
          });
        setHabits(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)',
        }}>
          습관
        </span>
        <span style={{ fontSize: 10, color: 'var(--ou-text-muted)' }}>오늘</span>
      </div>

      {/* ── Circle Grid ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : habits.length === 0 ? (
          <WidgetEmptyState skeleton="habit" />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px 16px',
          }}>
            {habits.map(h => (
              <div key={h.title} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Circle indicator */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: h.doneToday ? 'var(--ou-text-body)' : 'var(--ou-bg)',
                  boxShadow: h.doneToday ? 'var(--ou-neu-pressed-md)' : 'var(--ou-neu-raised-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 300ms ease',
                }}>
                  {h.doneToday ? (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <path d="M1.5 5.5L5 9L12.5 1.5" stroke="var(--ou-bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span style={{ fontSize: 13, lineHeight: 1 }}>○</span>
                  )}
                </div>

                {/* Name + streak */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 500,
                    color: h.doneToday ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {h.title}
                  </div>
                  {h.streak > 0 && (
                    <div style={{
                      fontSize: 9, color: 'var(--ou-text-dimmed)',
                      fontFamily: 'var(--ou-font-mono)',
                      marginTop: 1,
                    }}>
                      {h.streak}일째
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

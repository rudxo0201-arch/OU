'use client';

/**
 * Habit Widget C — 30-Day Heatmap
 * GitHub contribution graph 스타일 히트맵 + 스트릭 카운터
 * 레퍼런스: GitHub contributions, Blocky Notion heatmap
 */

import { useState, useEffect, useMemo } from 'react';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface HabitNode {
  id: string;
  domain_data: { title?: string };
  created_at: string;
}

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

function calcStreak(dateSet: Set<string>): number {
  let streak = 0;
  const d = new Date();
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (!dateSet.has(iso)) break;
    streak++;
    d.setDate(d.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

export function HabitWidgetC() {
  const [habits, setHabits] = useState<{ title: string; dateSet: Set<string> }[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const last30 = useMemo(() => getLast30Days(), []);
  const today = last30[29];

  useEffect(() => {
    fetch('/api/nodes?domain=habit&limit=300')
      .then(r => r.json())
      .then(d => {
        const nodes: HabitNode[] = d.nodes || [];
        const map: Record<string, Set<string>> = {};
        for (const n of nodes) {
          if (!n.domain_data?.title) continue;
          const key = n.domain_data.title;
          if (!map[key]) map[key] = new Set();
          map[key].add(n.created_at.slice(0, 10));
        }
        const result = Object.entries(map)
          .slice(0, 4)
          .map(([title, dateSet]) => ({ title, dateSet }));
        setHabits(result);
        if (result.length > 0) setSelectedHabit(result[0].title);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const active = habits.find(h => h.title === selectedHabit);
  const dateSet = active?.dateSet ?? new Set<string>();
  const streak = calcStreak(dateSet);

  // Build 5-row × 6-col grid (30 cells)
  const rows = 5;
  const cols = 6;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>

      {/* ── Header: habit selector + streak ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        {/* Habit tabs */}
        <div style={{ display: 'flex', gap: 6, overflow: 'hidden', flex: 1 }}>
          {habits.slice(0, 3).map(h => (
            <button
              key={h.title}
              onClick={() => setSelectedHabit(h.title)}
              style={{
                background: h.title === selectedHabit ? 'var(--ou-bg)' : 'transparent',
                boxShadow: h.title === selectedHabit ? 'var(--ou-neu-pressed-sm)' : 'none',
                border: 'none', cursor: 'pointer',
                borderRadius: 6, padding: '3px 8px',
                fontSize: 10, fontWeight: 500,
                color: h.title === selectedHabit ? 'var(--ou-text-strong)' : 'var(--ou-text-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 80,
                transition: 'all 200ms ease',
              }}
            >
              {h.title}
            </button>
          ))}
        </div>

        {/* Streak badge */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0, paddingLeft: 8 }}>
          <span style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 20, fontWeight: 700,
            color: 'var(--ou-text-bright)',
            letterSpacing: '-0.02em',
          }}>
            {loading ? '—' : streak}
          </span>
          <span style={{ fontSize: 9, color: 'var(--ou-text-dimmed)', letterSpacing: '0.06em' }}>일</span>
        </div>
      </div>

      {/* ── 30-Day Heatmap (5×6 grid) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : habits.length === 0 ? (
          <WidgetEmptyState skeleton="habit" />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: 4,
            height: '100%',
          }}>
            {last30.map(iso => {
              const logged = dateSet.has(iso);
              const isToday = iso === today;
              return (
                <div
                  key={iso}
                  title={iso}
                  style={{
                    borderRadius: 4,
                    background: logged ? 'var(--ou-text-body)' : 'var(--ou-bg)',
                    boxShadow: logged
                      ? 'var(--ou-neu-pressed-sm)'
                      : isToday
                        ? 'var(--ou-neu-raised-xs)'
                        : 'var(--ou-neu-inset)',
                    outline: isToday ? '1.5px solid var(--ou-border-medium)' : 'none',
                    transition: 'background 200ms, box-shadow 200ms',
                    minHeight: 12,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      {habits.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 6, marginTop: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 8, color: 'var(--ou-text-muted)' }}>적음</span>
          {[0.15, 0.35, 0.6, 0.85].map((op, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 2,
              background: `rgba(0,0,0,${op})`,
              // Respect dark mode
            }} />
          ))}
          <span style={{ fontSize: 8, color: 'var(--ou-text-muted)' }}>많음</span>
        </div>
      )}
    </div>
  );
}

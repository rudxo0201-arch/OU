'use client';

/**
 * Habit Widget A — Streak Hero + 7-Day Dots
 * 연속일수 Orbitron 대형 숫자 + 습관별 최근 7일 도트 트래커
 * 레퍼런스: Streaks, Productive
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HabitNode {
  id: string;
  domain_data: { title?: string; completed?: boolean | string };
  created_at: string;
}

function getLast7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function calcStreak(dates: string[]): number {
  // dates = sorted ISO strings of logged days (desc)
  if (!dates.length) return 0;
  let streak = 0;
  const check = new Date();
  const today = check.toISOString().slice(0, 10);
  const sortedDesc = [...dates].sort((a, b) => b.localeCompare(a));
  let expected = today;
  for (const d of sortedDesc) {
    if (d === expected) {
      streak++;
      const next = new Date(expected);
      next.setDate(next.getDate() - 1);
      expected = next.toISOString().slice(0, 10);
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}

export function HabitWidgetA() {
  const [habits, setHabits] = useState<{ title: string; logDates: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const last7 = getLast7Dates();
  const todayStr = last7[6];

  useEffect(() => {
    fetch('/api/nodes?domain=habit&limit=200')
      .then(r => r.json())
      .then(d => {
        const nodes: HabitNode[] = d.nodes || [];
        // Group by title
        const map: Record<string, string[]> = {};
        for (const n of nodes) {
          if (!n.domain_data?.title) continue;
          const key = n.domain_data.title;
          if (!map[key]) map[key] = [];
          map[key].push(n.created_at.slice(0, 10));
        }
        const result = Object.entries(map)
          .slice(0, 4)
          .map(([title, logDates]) => ({ title, logDates: Array.from(new Set(logDates)) }));
        setHabits(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Calculate overall streak (union of all habit days)
  const allDates = Array.from(new Set(habits.flatMap(h => h.logDates)));
  const streak = calcStreak(allDates);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>

      {/* ── Streak Hero ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 48, fontWeight: 700, lineHeight: 1,
          color: 'var(--ou-text-bright)',
          letterSpacing: '-0.03em',
        }}>
          {loading ? '—' : streak}
        </span>
        <div style={{ paddingBottom: 6, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--ou-text-dimmed)',
            letterSpacing: '0.04em',
          }}>
            일 연속
          </span>
          <span style={{ fontSize: 9, color: 'var(--ou-text-muted)', letterSpacing: '0.06em' }}>
            STREAK
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--ou-border-subtle)', marginBottom: 14, flexShrink: 0 }} />

      {/* ── Habit Dot Rows ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : habits.length === 0 ? (
          <button onClick={() => router.push('/orb')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: 0, fontSize: 12,
            color: 'var(--ou-text-muted)', lineHeight: 1.5,
          }}>
            Orb에서 루틴을 말해보세요 →
          </button>
        ) : habits.map(h => {
          const dateSet = new Set(h.logDates);
          return (
            <div key={h.title} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Habit name */}
              <div style={{
                fontSize: 11, fontWeight: 500,
                color: 'var(--ou-text-body)',
                minWidth: 56, maxWidth: 72,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {h.title}
              </div>

              {/* 7-day dot row */}
              <div style={{ display: 'flex', gap: 5, flex: 1, justifyContent: 'flex-end' }}>
                {last7.map(iso => {
                  const logged = dateSet.has(iso);
                  const isToday = iso === todayStr;
                  return (
                    <div key={iso} style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: logged ? 'var(--ou-text-body)' : 'var(--ou-bg)',
                      boxShadow: logged
                        ? 'var(--ou-neu-pressed-sm)'
                        : isToday ? 'var(--ou-neu-raised-xs)' : 'var(--ou-neu-inset)',
                      outline: isToday && !logged ? '1.5px solid var(--ou-border-medium)' : 'none',
                      transition: 'all 200ms ease',
                      flexShrink: 0,
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

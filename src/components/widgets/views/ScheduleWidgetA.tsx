'use client';

/**
 * Schedule Widget A — Date Hero + Agenda
 * 큰 날짜 숫자(Orbitron) + 오늘/예정 일정 리스트
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ScheduleNode {
  id: string;
  domain_data: { date?: string; time?: string; title?: string; location?: string };
  raw?: string;
}

export function ScheduleWidgetA() {
  const [events, setEvents] = useState<ScheduleNode[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()];

  useEffect(() => {
    fetch('/api/nodes?domain=schedule&limit=50')
      .then(r => r.json())
      .then(d => {
        const nodes: ScheduleNode[] = d.nodes || [];
        const upcoming = nodes
          .filter(n => n.domain_data?.date && n.domain_data.date >= today)
          .sort((a, b) => {
            const da = (a.domain_data.date || '') + (a.domain_data.time || '');
            const db = (b.domain_data.date || '') + (b.domain_data.time || '');
            return da.localeCompare(db);
          });
        setEvents(upcoming.slice(0, 5));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>

      {/* ── Date Hero ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 56, fontWeight: 700, lineHeight: 1,
          color: 'var(--ou-text-bright)',
          letterSpacing: '-0.03em',
        }}>
          {day}
        </div>
        <div style={{ paddingBottom: 7, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
            fontFamily: 'var(--ou-font-logo)',
          }}>
            {weekday}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: '0.06em' }}>
            {month}월
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--ou-border-subtle)', marginBottom: 14, flexShrink: 0 }} />

      {/* ── Event List ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : events.length === 0 ? (
          <button onClick={() => router.push('/orb')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: 0, fontSize: 12,
            color: 'var(--ou-text-muted)', lineHeight: 1.5,
          }}>
            Orb에서 일정을 말해보세요 →
          </button>
        ) : events.map(e => {
          const isToday = e.domain_data.date === today;
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Time chip */}
              <div style={{
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-pressed-sm)',
                borderRadius: 7,
                padding: '3px 7px',
                fontSize: 10,
                fontFamily: 'var(--ou-font-mono)',
                fontWeight: 600,
                color: isToday ? 'var(--ou-text-body)' : 'var(--ou-text-muted)',
                flexShrink: 0,
                minWidth: 44,
                textAlign: 'center',
                letterSpacing: '0.02em',
              }}>
                {e.domain_data.time || '종일'}
              </div>

              {/* Title + meta */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: 13, fontWeight: isToday ? 600 : 400,
                  color: isToday ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {e.domain_data.title || e.raw?.slice(0, 24) || '일정'}
                </div>
                {(!isToday && e.domain_data.date) && (
                  <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 1 }}>
                    {e.domain_data.date.slice(5).replace('-', '/')}
                    {e.domain_data.location && ` · ${e.domain_data.location}`}
                  </div>
                )}
                {(isToday && e.domain_data.location) && (
                  <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 1 }}>
                    {e.domain_data.location}
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

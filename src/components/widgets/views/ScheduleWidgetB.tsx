'use client';

/**
 * Schedule Widget B — Week Strip + Daily Events
 * 가로 7일 스트립 + 선택일 일정 리스트
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ScheduleNode {
  id: string;
  domain_data: { date?: string; time?: string; title?: string; location?: string };
  raw?: string;
}

function getWeekDays(base: Date) {
  const day = base.getDay(); // 0=sun
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7)); // move to Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function ScheduleWidgetB() {
  const [allEvents, setAllEvents] = useState<ScheduleNode[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekDays = getWeekDays(now);
  const LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  useEffect(() => {
    setSelectedDate(today);
    fetch('/api/nodes?domain=schedule&limit=100')
      .then(r => r.json())
      .then(d => {
        setAllEvents(d.nodes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = selectedDate || today;
  const visibleEvents = allEvents
    .filter(n => n.domain_data?.date === active)
    .sort((a, b) => (a.domain_data.time || '').localeCompare(b.domain_data.time || ''));

  // dot indicator: which days have events
  const eventDates = new Set(allEvents.map(n => n.domain_data?.date).filter(Boolean));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>

      {/* ── Week Strip ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexShrink: 0 }}>
        {weekDays.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === today;
          const isSelected = iso === active;
          const hasEvent = eventDates.has(iso);
          return (
            <button
              key={iso}
              onClick={() => setSelectedDate(iso)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 2px',
                borderRadius: 10,
                background: isSelected ? 'var(--ou-bg)' : 'transparent',
                boxShadow: isSelected ? 'var(--ou-neu-pressed-sm)' : 'none',
                border: 'none', cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
                color: isSelected ? 'var(--ou-text-dimmed)' : 'var(--ou-text-muted)',
                textTransform: 'uppercase',
              }}>
                {LABELS[i]}
              </span>
              <span style={{
                fontFamily: isToday ? 'var(--ou-font-logo)' : 'inherit',
                fontSize: isToday ? 13 : 12,
                fontWeight: isSelected ? 700 : 400,
                color: isSelected ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                lineHeight: 1,
              }}>
                {d.getDate()}
              </span>
              {/* event dot */}
              <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: hasEvent ? 'var(--ou-text-dimmed)' : 'transparent',
              }} />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--ou-border-subtle)', marginBottom: 13, flexShrink: 0 }} />

      {/* ── Events for selected day ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : visibleEvents.length === 0 ? (
          <button onClick={() => router.push('/orb')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: 0, fontSize: 12,
            color: 'var(--ou-text-muted)', lineHeight: 1.5,
          }}>
            {active === today ? 'Orb에서 일정을 말해보세요 →' : '이 날은 일정이 없어요'}
          </button>
        ) : visibleEvents.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              borderRadius: 7, padding: '3px 7px',
              fontSize: 10, fontFamily: 'var(--ou-font-mono)', fontWeight: 600,
              color: 'var(--ou-text-body)', flexShrink: 0,
              minWidth: 44, textAlign: 'center',
            }}>
              {e.domain_data.time || '종일'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 13, fontWeight: 500,
                color: 'var(--ou-text-strong)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {e.domain_data.title || e.raw?.slice(0, 24) || '일정'}
              </div>
              {e.domain_data.location && (
                <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 1 }}>
                  {e.domain_data.location}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

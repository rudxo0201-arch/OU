'use client';

/**
 * Schedule Widget B — Week Strip + Daily Events
 * 가로 7일 스트립 + 선택일 일정 리스트 + 주간 이동
 */

import { useState, useEffect } from 'react';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface ScheduleNode {
  id: string;
  domain_data: { date?: string; time?: string; title?: string; location?: string };
  raw?: string;
}

function getWeekDays(base: Date) {
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function ScheduleWidgetB() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = 이번주, -1 = 지난주, 1 = 다음주
  const [allEvents, setAllEvents] = useState<ScheduleNode[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(baseDate);
  const LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  const weekFrom = weekDays[0].toISOString().slice(0, 10);
  const weekTo = weekDays[6].toISOString().slice(0, 10);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/nodes?domain=schedule&limit=100&date_from=${weekFrom}&date_to=${weekTo}`)
      .then(r => r.json())
      .then(d => {
        setAllEvents(d.nodes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [weekFrom, weekTo]);

  // 주가 바뀌면 해당 주의 첫날로 선택 이동
  useEffect(() => {
    const weekIsos = weekDays.map(d => d.toISOString().slice(0, 10));
    if (!weekIsos.includes(selectedDate)) {
      setSelectedDate(weekOffset === 0 ? today : weekIsos[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const visibleEvents = allEvents
    .filter(n => n.domain_data?.date === selectedDate)
    .sort((a, b) => (a.domain_data.time || '').localeCompare(b.domain_data.time || ''));

  const eventDates = new Set(allEvents.map(n => n.domain_data?.date).filter(Boolean));

  const btnStyle: React.CSSProperties = {
    width: 20, height: 20, borderRadius: '50%', border: 'none',
    background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)',
    color: 'var(--ou-text-secondary)', fontSize: 9,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, padding: 0,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '18px 18px 14px' }}>

      {/* ── 주간 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--ou-text-dimmed)', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)',
        }}>
          일정
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                height: 18, padding: '0 6px', borderRadius: 'var(--ou-radius-pill)',
                border: 'none', background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)',
                color: 'var(--ou-text-muted)', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              이번주
            </button>
          )}
          <button style={btnStyle} onClick={() => setWeekOffset(w => w - 1)}>◁</button>
          <button style={btnStyle} onClick={() => setWeekOffset(w => w + 1)}>▷</button>
        </div>
      </div>

      {/* ── Week Strip ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexShrink: 0 }}>
        {weekDays.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
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

      {/* ── Events ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : visibleEvents.length === 0 ? (
          <WidgetEmptyState skeleton="schedule" cta={selectedDate === today ? 'Q에서 기록하세요' : '이 날은 일정이 없어요'} />
        ) : visibleEvents.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
              borderRadius: 7, padding: '3px 7px',
              fontSize: 10, fontFamily: 'var(--ou-font-mono)', fontWeight: 600,
              color: 'var(--ou-text-body)', flexShrink: 0, minWidth: 44, textAlign: 'center',
            }}>
              {e.domain_data.time || '종일'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 13, fontWeight: 500, color: 'var(--ou-text-strong)',
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

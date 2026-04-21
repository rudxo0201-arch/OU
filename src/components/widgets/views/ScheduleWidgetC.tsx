'use client';

/**
 * Schedule Widget C — Mini Month Grid + Next Event
 * 미니 월간 그리드(이벤트 도트) + 다음 일정 1개 강조 + 월 이동
 */

import { useState, useEffect } from 'react';
import { DateNav } from '../DateNav';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface ScheduleNode {
  id: string;
  domain_data: { date?: string; time?: string; title?: string };
  raw?: string;
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Monday-first
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function ScheduleWidgetC() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 10));
  const [allEvents, setAllEvents] = useState<ScheduleNode[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const d = new Date(selectedMonth + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const cells = buildMonthGrid(year, month);
  const LABELS = ['월', '화', '수', '목', '금', '토', '일'];

  // 해당 월의 첫날~마지막날
  const monthFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/nodes?domain=schedule&limit=200&date_from=${monthFrom}&date_to=${monthTo}`)
      .then(r => r.json())
      .then(d => { setAllEvents(d.nodes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [monthFrom, monthTo]);

  const eventDates = new Set(allEvents.map(n => n.domain_data?.date).filter(Boolean));
  const nextEvent = allEvents
    .filter(n => n.domain_data?.date && n.domain_data.date >= today)
    .sort((a, b) => {
      const da = (a.domain_data.date || '') + (a.domain_data.time || '');
      const db = (b.domain_data.date || '') + (b.domain_data.time || '');
      return da.localeCompare(db);
    })[0];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 16px 14px' }}>

      {/* ── Month Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 18, fontWeight: 700,
            color: 'var(--ou-text-bright)',
            letterSpacing: '-0.01em',
          }}>
            {month + 1}월
          </span>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{year}</span>
        </div>
        <DateNav date={selectedMonth} onChange={setSelectedMonth} unit="month" />
      </div>

      {/* ── Mini Month Grid ── */}
      <div style={{ flexShrink: 0, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
          {LABELS.map(l => (
            <div key={l} style={{
              textAlign: 'center', fontSize: 8, fontWeight: 600,
              color: 'var(--ou-text-muted)', letterSpacing: '0.06em',
            }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const pad = String(day).padStart(2, '0');
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${pad}`;
            const isToday = iso === today;
            const hasEvent = eventDates.has(iso);
            return (
              <div key={iso} style={{
                textAlign: 'center', padding: '2px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: isToday ? 'var(--ou-bg)' : 'transparent',
                  boxShadow: isToday ? 'var(--ou-neu-pressed-sm)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: isToday ? 700 : 400,
                    fontFamily: isToday ? 'var(--ou-font-logo)' : 'inherit',
                    color: isToday ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
                  }}>
                    {day}
                  </span>
                </div>
                <div style={{
                  width: 3, height: 3, borderRadius: '50%',
                  background: hasEvent ? 'var(--ou-text-dimmed)' : 'transparent',
                }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--ou-border-subtle)', marginBottom: 12, flexShrink: 0 }} />

      {/* ── Next Event Highlight ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : !nextEvent ? (
          <WidgetEmptyState skeleton="schedule" />
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
            <div style={{
              background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)',
              borderRadius: 8, padding: '5px 10px', flexShrink: 0,
            }}>
              <div style={{
                fontFamily: 'var(--ou-font-logo)',
                fontSize: 14, fontWeight: 700,
                color: 'var(--ou-text-bright)', lineHeight: 1,
              }}>
                {nextEvent.domain_data.time || '종일'}
              </div>
              {nextEvent.domain_data.date !== today && (
                <div style={{ fontSize: 9, color: 'var(--ou-text-dimmed)', marginTop: 2 }}>
                  {nextEvent.domain_data.date?.slice(5).replace('-', '/')}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--ou-text-strong)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {nextEvent.domain_data.title || nextEvent.raw?.slice(0, 24) || '일정'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 2 }}>
                {nextEvent.domain_data.date === today ? '오늘' : '다음 일정'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

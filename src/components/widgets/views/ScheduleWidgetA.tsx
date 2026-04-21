'use client';

/**
 * Schedule Widget A — Date Hero + Agenda
 * 큰 날짜 숫자(Orbitron) + 선택일 일정 리스트
 */

import { useState, useEffect } from 'react';
import { DateNav } from '../DateNav';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface ScheduleNode {
  id: string;
  domain_data: { date?: string; time?: string; title?: string; location?: string };
  raw?: string;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function ScheduleWidgetA() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [events, setEvents] = useState<ScheduleNode[]>([]);
  const [loading, setLoading] = useState(true);

  const d = new Date(selectedDate + 'T00:00:00');
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const weekday = WEEKDAYS[d.getDay()];
  const today = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === today;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/nodes?domain=schedule&limit=50&date_from=${selectedDate}&date_to=${selectedDate}`)
      .then(r => r.json())
      .then(d => {
        const nodes: ScheduleNode[] = d.nodes || [];
        const sorted = nodes.sort((a, b) =>
          (a.domain_data.time || '').localeCompare(b.domain_data.time || '')
        );
        setEvents(sorted.slice(0, 5));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>

      {/* ── Date Hero ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 56, fontWeight: 700, lineHeight: 1,
            color: isToday ? 'var(--ou-text-bright)' : 'var(--ou-text-body)',
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
        <div style={{ paddingBottom: 6 }}>
          <DateNav date={selectedDate} onChange={setSelectedDate} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--ou-border-subtle)', marginBottom: 14, flexShrink: 0 }} />

      {/* ── Event List ── */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : events.length === 0 ? (
          <WidgetEmptyState skeleton="schedule" />
        ) : events.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              borderRadius: 7,
              padding: '3px 7px',
              fontSize: 10,
              fontFamily: 'var(--ou-font-mono)',
              fontWeight: 600,
              color: 'var(--ou-text-body)',
              flexShrink: 0,
              minWidth: 44,
              textAlign: 'center',
              letterSpacing: '0.02em',
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

'use client';

import { useState, useEffect } from 'react';
import { DateNav } from '../DateNav';
import { WidgetEmptyState } from '../WidgetEmptyState';

interface ScheduleNode {
  id: string;
  domain_data: {
    date?: string;
    time?: string;
    title?: string;
    location?: string;
  };
  raw?: string;
}

export function TodayScheduleWidget() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [events, setEvents] = useState<ScheduleNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/nodes?domain=schedule&limit=50&date_from=${selectedDate}&date_to=${selectedDate}`)
      .then(r => r.json())
      .then(d => {
        const nodes: ScheduleNode[] = d.nodes || [];
        const deduplicated = nodes.filter((e, i, arr) =>
          arr.findIndex(x =>
            x.domain_data.title === e.domain_data.title &&
            x.domain_data.date === e.domain_data.date &&
            x.domain_data.time === e.domain_data.time
          ) === i
        );
        const sorted = deduplicated.sort((a, b) => (a.domain_data.time || '').localeCompare(b.domain_data.time || ''));
        setEvents(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate]);

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '14px 16px',
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--ou-text-dimmed)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)',
        }}>
          일정
        </span>
        <DateNav date={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* 일정 리스트 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>...</div>
        ) : events.length === 0 ? (
          <WidgetEmptyState skeleton="schedule" />
        ) : events.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 시간 박스 */}
            <div style={{
              padding: '4px 8px',
              borderRadius: 8,
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--ou-font-mono)',
              color: 'var(--ou-text-body)',
              flexShrink: 0,
              minWidth: 44,
              textAlign: 'center',
            }}>
              {e.domain_data.time || '종일'}
            </div>

            {/* 제목 + 장소 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 12, fontWeight: 500,
                color: 'var(--ou-text-strong)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {e.domain_data.title || e.raw?.slice(0, 20) || '일정'}
                {e.domain_data.location && (
                  <span style={{ color: 'var(--ou-text-dimmed)', fontWeight: 400 }}>
                    {' · '}{e.domain_data.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

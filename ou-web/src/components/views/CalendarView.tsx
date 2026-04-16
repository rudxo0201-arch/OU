'use client';

import { useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

export function CalendarView({ nodes }: ViewProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');
  const startDay = startOfMonth.day();

  const events = nodes
    .filter(n => n.domain === 'schedule' && n.domain_data?.date)
    .map(n => ({
      id: n.id,
      date: dayjs(n.domain_data.date),
      title: n.domain_data.title ?? (n.raw ?? '').slice(0, 20) ?? '일정',
    }));

  const getEventsForDate = (date: dayjs.Dayjs) =>
    events.filter(e => e.date.format('YYYY-MM-DD') === date.format('YYYY-MM-DD'));

  const days: (dayjs.Dayjs | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: endOfMonth.date() }, (_, i) =>
      startOfMonth.add(i, 'day')
    ),
  ];

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'inherit' }}
        >
          <CaretLeft size={16} />
        </button>
        <span style={{ fontWeight: 600 }}>{currentMonth.format('YYYY년 M월')}</span>
        <button
          onClick={() => setCurrentMonth(m => m.add(1, 'month'))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'inherit' }}
        >
          <CaretRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {WEEKDAYS.map(day => (
          <span key={day} style={{ textAlign: 'center', fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{day}</span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dayEvents = getEventsForDate(day);
          const isToday = day.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');

          return (
            <div
              key={day.format('YYYY-MM-DD')}
              style={{
                padding: 4,
                minHeight: 60,
                border: isToday
                  ? '1px solid var(--ou-border, #333)'
                  : '0.5px solid var(--ou-border, #333)',
                borderRadius: 4,
                boxShadow: isToday ? '0 0 0 1px var(--ou-border, #333)' : undefined,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400 }}>
                {day.date()}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                {dayEvents.slice(0, 2).map(e => (
                  <span
                    key={e.id}
                    style={{
                      fontSize: 9,
                      maxWidth: '100%',
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: '0.5px solid var(--ou-border, #333)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span style={{ fontSize: 9, color: 'var(--ou-text-dimmed, #888)' }}>+{dayEvents.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

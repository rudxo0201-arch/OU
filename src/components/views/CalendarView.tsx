'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

const MapView = dynamic(() => import('./MapView').then(m => m.MapView), { ssr: false });

dayjs.locale('ko');

/** 인라인 빈 필드 보강 UI */
function EnrichField({ label, placeholder, onSubmit, onDismiss }: {
  label: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  onDismiss: () => void;
}) {
  const [value, setValue] = useState('');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', flexShrink: 0 }}>{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing && value.trim()) {
            onSubmit(value.trim());
          }
        }}
        className="input-block"
        style={{ flex: 1, padding: '4px 10px', fontSize: 11 }}
      />
      <button
        onClick={() => { setDismissed(true); onDismiss(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 10, color: 'var(--ou-text-muted)', padding: '2px 4px',
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function CalendarView({ nodes, inline }: ViewProps & { inline?: boolean }) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [enriched, setEnriched] = useState<Record<string, Record<string, string>>>({});

  const events = nodes
    .filter(n => n.domain === 'schedule' && n.domain_data?.date)
    .map(n => ({
      id: n.id,
      date: dayjs(n.domain_data.date),
      time: n.domain_data.time || enriched[n.id]?.time,
      title: n.domain_data.title ?? (n.raw ?? '').slice(0, 20) ?? '일정',
      location: n.domain_data.location || enriched[n.id]?.location,
      // 빈 필드 감지
      missingTime: !n.domain_data.time && !enriched[n.id]?.time,
      missingLocation: !n.domain_data.location && !enriched[n.id]?.location,
    }));

  const handleEnrich = (nodeId: string, field: string, value: string) => {
    setEnriched(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], [field]: value },
    }));
    // TODO: API 호출로 노드 domain_data 업데이트
  };

  // 인라인: 추가된 일정만 컴팩트 카드로 표시 + 보강 UI
  if (inline) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.map(e => (
          <div key={e.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-md)',
              }}
            >
              <div style={{ textAlign: 'center', flexShrink: 0, lineHeight: 1.2 }}>
                <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>
                  {e.date.format('M/D')}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)' }}>
                  {e.date.format('ddd')}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ou-text-heading)' }}>
                  {e.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', marginTop: 2 }}>
                  {e.time && <span>{e.time}</span>}
                  {e.time && e.location && <span> · </span>}
                  {e.location && <span>{e.location}</span>}
                  {!e.time && !e.location && <span>종일</span>}
                </div>
              </div>
            </div>
            {/* 빈 필드 보강 UI */}
            {(e.missingTime || e.missingLocation) && (
              <div style={{ padding: '4px 14px 0' }}>
                {e.missingTime && (
                  <EnrichField
                    label="시간"
                    placeholder="예: 3시, 오후 2시"
                    onSubmit={v => handleEnrich(e.id, 'time', v)}
                    onDismiss={() => {/* dismiss 이벤트 기록 TODO */}}
                  />
                )}
                {e.missingLocation && (
                  <EnrichField
                    label="장소"
                    placeholder="예: 강남역, 학교"
                    onSubmit={v => handleEnrich(e.id, 'location', v)}
                    onDismiss={() => {/* dismiss 이벤트 기록 TODO */}}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 전체 뷰: 월간 캘린더
  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');
  const startDay = startOfMonth.day();

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
          style={{ background: 'var(--ou-bg)', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', color: 'inherit', borderRadius: 8, boxShadow: 'var(--ou-neu-raised-sm)' }}
        >
          <CaretLeft size={16} />
        </button>
        <span style={{ fontWeight: 600 }}>{currentMonth.format('YYYY년 M월')}</span>
        <button
          onClick={() => setCurrentMonth(m => m.add(1, 'month'))}
          style={{ background: 'var(--ou-bg)', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', color: 'inherit', borderRadius: 8, boxShadow: 'var(--ou-neu-raised-sm)' }}
        >
          <CaretRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {WEEKDAYS.map(day => (
          <span key={day} style={{ textAlign: 'center', fontSize: 11, color: 'var(--ou-text-muted)' }}>{day}</span>
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
                border: 'none',
                borderRadius: 6,
                background: isToday ? 'var(--ou-bg)' : undefined,
                boxShadow: isToday ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
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
                      border: 'none',
                      boxShadow: 'var(--ou-neu-raised-sm)',
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
                  <span style={{ fontSize: 9, color: 'var(--ou-text-muted)' }}>+{dayEvents.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 이번 달 location 있는 일정 → 미니 지도 */}
      {(() => {
        const monthEvents = events.filter(e =>
          e.date.format('YYYY-MM') === currentMonth.format('YYYY-MM') && e.location
        );
        if (monthEvents.length === 0) return null;
        const mapNodes = monthEvents.map(e => ({
          id: e.id,
          domain: 'schedule',
          domain_data: { title: e.title, location: e.location, date: e.date.format('YYYY-MM-DD') },
          raw: e.title,
        }));
        return (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 6 }}>
              이번 달 일정 위치
            </div>
            <MapView nodes={mapNodes} inline />
          </div>
        );
      })()}
    </div>
  );
}

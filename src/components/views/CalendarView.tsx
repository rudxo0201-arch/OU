'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

const MapView = dynamic(() => import('./MapView').then(m => m.MapView), { ssr: false });

dayjs.locale('ko');

/**
 * 월간 캘린더 뷰 — Apple Calendar / Fantastical 참고
 * - 96px 셀 높이, 최대 3개 이벤트 + 오버플로우 카운트
 * - 오늘 날짜 강조 (원형 배지)
 * - 이벤트 칩 최소 11px
 */

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
        style={{ flex: 1, padding: '4px 10px', fontSize: 12 }}
      />
      <button
        onClick={() => { setDismissed(true); onDismiss(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'var(--ou-text-muted)', padding: '2px 4px',
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
      missingTime: !n.domain_data.time && !enriched[n.id]?.time,
      missingLocation: !n.domain_data.location && !enriched[n.id]?.location,
    }));

  const handleEnrich = (nodeId: string, field: string, value: string) => {
    setEnriched(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], [field]: value },
    }));
  };

  // 인라인: 이벤트 카드 리스트
  if (inline) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.map(e => (
          <div key={e.id}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              boxShadow: 'var(--ou-neu-raised-sm)',
            }}>
              <div style={{ textAlign: 'center', flexShrink: 0, lineHeight: 1.3, minWidth: 32 }}>
                <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>
                  {e.date.format('M/D')}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-body)' }}>
                  {e.date.format('ddd')}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ou-text-body)' }}>
                  {e.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>
                  {e.time && <span>{e.time}</span>}
                  {e.time && e.location && <span> · </span>}
                  {e.location && <span>{e.location}</span>}
                  {!e.time && !e.location && <span>종일</span>}
                </div>
              </div>
            </div>
            {(e.missingTime || e.missingLocation) && (
              <div style={{ padding: '4px 14px 0' }}>
                {e.missingTime && (
                  <EnrichField
                    label="시간"
                    placeholder="예: 3시, 오후 2시"
                    onSubmit={v => handleEnrich(e.id, 'time', v)}
                    onDismiss={() => {}}
                  />
                )}
                {e.missingLocation && (
                  <EnrichField
                    label="장소"
                    placeholder="예: 강남역, 학교"
                    onSubmit={v => handleEnrich(e.id, 'location', v)}
                    onDismiss={() => {}}
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
  const today = dayjs();
  const isThisMonth = currentMonth.format('YYYY-MM') === today.format('YYYY-MM');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Month navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
        padding: '0 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ou-text-strong)', letterSpacing: '-0.02em' }}>
            {currentMonth.format('M월')}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)', fontWeight: 400 }}>
            {currentMonth.format('YYYY')}
          </span>
          {!isThisMonth && (
            <button
              onClick={() => setCurrentMonth(today)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--ou-text-secondary)', fontFamily: 'inherit',
                padding: '3px 10px', borderRadius: 999,
                boxShadow: 'var(--ou-neu-raised-xs)',
                marginLeft: 4,
              }}
            >
              오늘
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ou-text-secondary)', borderRadius: 8,
              transition: '150ms ease',
            }}
          >
            <CaretLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentMonth(m => m.add(1, 'month'))}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ou-text-secondary)', borderRadius: 8,
              transition: '150ms ease',
            }}
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div style={{
        borderRadius: 12,
        border: '1px solid var(--ou-border-faint)',
        overflow: 'hidden',
      }}>
        {/* 요일 헤더 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--ou-border-faint)',
          background: 'var(--ou-surface-faint)',
        }}>
          {WEEKDAYS.map((day, i) => (
            <div key={day} style={{
              textAlign: 'center',
              padding: '10px 0',
              fontSize: 12,
              fontWeight: 600,
              color: i === 0 || i === 6 ? 'var(--ou-text-disabled)' : 'var(--ou-text-secondary)',
              letterSpacing: '0.04em',
            }}>
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 셀 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, i) => {
            if (!day) {
              return (
                <div
                  key={`empty-${i}`}
                  style={{
                    minHeight: 96,
                    borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--ou-border-faint)' : 'none',
                    borderBottom: '1px solid var(--ou-border-faint)',
                    background: 'var(--ou-surface-faint)',
                  }}
                />
              );
            }

            const dayEvents = getEventsForDate(day);
            const isToday = day.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');
            const isWeekend = day.day() === 0 || day.day() === 6;
            const colIndex = (i) % 7;

            return (
              <div
                key={day.format('YYYY-MM-DD')}
                style={{
                  minHeight: 96,
                  padding: '8px 6px 6px',
                  borderRight: colIndex !== 6 ? '1px solid var(--ou-border-faint)' : 'none',
                  borderBottom: '1px solid var(--ou-border-faint)',
                  background: isToday ? 'var(--ou-surface-subtle)' : 'transparent',
                  transition: 'background 150ms ease',
                }}
              >
                {/* 날짜 숫자 */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  {isToday ? (
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'var(--ou-text-strong)',
                      color: 'var(--ou-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {day.date()}
                    </span>
                  ) : (
                    <span style={{
                      width: 26, height: 26,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 400,
                      color: isWeekend ? 'var(--ou-text-disabled)' : 'var(--ou-text-body)',
                    }}>
                      {day.date()}
                    </span>
                  )}
                </div>

                {/* 이벤트 칩 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayEvents.slice(0, 3).map(e => (
                    <span
                      key={e.id}
                      title={e.title}
                      style={{
                        fontSize: 11,
                        lineHeight: '18px',
                        padding: '0 6px',
                        borderRadius: 4,
                        borderLeft: '2px solid var(--ou-text-secondary)',
                        background: 'var(--ou-surface-subtle)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        color: 'var(--ou-text-body)',
                      }}
                    >
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{
                      fontSize: 11, color: 'var(--ou-text-disabled)',
                      paddingLeft: 6, lineHeight: '16px',
                    }}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ou-text-secondary)', marginBottom: 8 }}>
              이번 달 일정 위치
            </div>
            <MapView nodes={mapNodes} inline />
          </div>
        );
      })()}
    </div>
  );
}

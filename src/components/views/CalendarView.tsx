'use client';

import { useState, useMemo } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';
import styles from './CalendarView.module.css';

dayjs.locale('ko');

type CalView = 'month' | 'week' | 'agenda';

interface CalEvent {
  id: string;
  title: string;
  date: dayjs.Dayjs;
  time?: string;
  endTime?: string;
  location?: string;
  allDay: boolean;
}

function parseEvents(nodes: ViewProps['nodes']): CalEvent[] {
  return nodes
    .filter(n => n.domain === 'schedule' && n.domain_data?.date)
    .map(n => ({
      id: n.id,
      title: n.domain_data.title ?? (n.raw ?? '').slice(0, 30) ?? '일정',
      date: dayjs(n.domain_data.date),
      time: n.domain_data.time,
      endTime: n.domain_data.end_time,
      location: n.domain_data.location,
      allDay: !n.domain_data.time,
    }))
    .sort((a, b) => {
      const d = a.date.valueOf() - b.date.valueOf();
      if (d !== 0) return d;
      if (!a.time) return -1;
      if (!b.time) return 1;
      return a.time.localeCompare(b.time);
    });
}

// ── 월간 뷰 ───────────────────────────────────────────────────────────────
function MonthView({ currentMonth, events, onDayClick, selectedDay }: {
  currentMonth: dayjs.Dayjs;
  events: CalEvent[];
  onDayClick: (d: dayjs.Dayjs) => void;
  selectedDay: dayjs.Dayjs | null;
}) {
  const today = dayjs();
  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth   = currentMonth.endOf('month');
  const startDay     = startOfMonth.day(); // 0=일

  const days: (dayjs.Dayjs | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: endOfMonth.date() }, (_, i) => startOfMonth.add(i, 'day')),
  ];

  const getEvents = (d: dayjs.Dayjs) =>
    events.filter(e => e.date.format('YYYY-MM-DD') === d.format('YYYY-MM-DD'));

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div>
      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            textAlign: 'center', fontSize: 11, fontWeight: 600,
            padding: '6px 0',
            color: i === 0 || i === 6 ? 'rgba(0,0,0,0.28)' : 'var(--ou-text-muted)',
          }}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dayEvents = getEvents(day);
          const isToday   = day.isSame(today, 'day');
          const isSelected = selectedDay && day.isSame(selectedDay, 'day');
          const isSun = day.day() === 0;
          const isSat = day.day() === 6;

          return (
            <div key={day.format('YYYY-MM-DD')}
              onClick={() => onDayClick(day)}
              style={{
                padding: '4px 3px 6px',
                minHeight: 68,
                borderRadius: 8,
                background: isSelected ? 'rgba(0,0,0,0.06)' : 'transparent',
                cursor: 'pointer',
                transition: '150ms',
              }}
              onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
              onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
            >
              {/* 날짜 번호 */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
                <span style={isToday ? {
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--ou-text-heading)',
                  color: 'var(--ou-space)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                } : {
                  width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11,
                  color: isSun || isSat ? 'rgba(0,0,0,0.28)' : 'var(--ou-text-body)',
                }}>
                  {day.date()}
                </span>
              </div>

              {/* 이벤트 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvents.slice(0, 2).map(e => (
                  <div key={e.id} title={e.title} style={{
                    fontSize: 9, padding: '2px 5px',
                    borderRadius: 3,
                    background: 'rgba(0,0,0,0.08)',
                    borderLeft: '2px solid rgba(0,0,0,0.35)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: 'var(--ou-text-body)',
                    lineHeight: 1.4,
                  }}>
                    {e.time && <span style={{ color: 'var(--ou-text-muted)', marginRight: 2 }}>{e.time}</span>}
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span style={{ fontSize: 9, color: 'var(--ou-text-disabled)', paddingLeft: 3 }}>
                    +{dayEvents.length - 2}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 주간 뷰 ───────────────────────────────────────────────────────────────
function WeekView({ currentWeek, events, onDayClick, selectedDay }: {
  currentWeek: dayjs.Dayjs;
  events: CalEvent[];
  onDayClick: (d: dayjs.Dayjs) => void;
  selectedDay: dayjs.Dayjs | null;
}) {
  const today   = dayjs();
  const weekStart = currentWeek.startOf('week');
  const days    = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {days.map((d, i) => {
          const isToday    = d.isSame(today, 'day');
          const isSelected = selectedDay && d.isSame(selectedDay, 'day');
          return (
            <div key={d.format('YYYY-MM-DD')}
              onClick={() => onDayClick(d)}
              style={{
                textAlign: 'center', cursor: 'pointer', padding: '8px 4px',
                borderRadius: 8,
                background: isToday ? 'rgba(0,0,0,0.08)' : isSelected ? 'rgba(0,0,0,0.05)' : 'transparent',
                transition: '150ms',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginBottom: 2 }}>{WEEKDAYS[i]}</div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: isToday ? 700 : 400,
                background: isToday ? 'var(--ou-text-heading)' : 'transparent',
                color: isToday ? 'var(--ou-space)' : 'var(--ou-text-body)',
              }}>
                {d.date()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 이벤트 행 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, minHeight: 120 }}>
        {days.map(d => {
          const dayEvents = events.filter(e => e.date.isSame(d, 'day'));
          return (
            <div key={d.format('YYYY-MM-DD')} onClick={() => onDayClick(d)}
              style={{ cursor: 'pointer', minHeight: 80 }}>
              {dayEvents.map(e => (
                <div key={e.id} style={{
                  fontSize: 10, padding: '4px 6px',
                  borderRadius: 5, marginBottom: 2,
                  background: 'rgba(0,0,0,0.06)',
                  borderLeft: '2px solid rgba(0,0,0,0.30)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--ou-text-body)',
                }}>
                  {e.time && <div style={{ fontSize: 9, color: 'var(--ou-text-muted)' }}>{e.time}</div>}
                  {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 아젠다 뷰 ─────────────────────────────────────────────────────────────
function AgendaView({ events }: { events: CalEvent[] }) {
  const today = dayjs();
  const upcoming = events
    .filter(e => !e.date.isBefore(today, 'day'))
    .slice(0, 30);

  if (upcoming.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ou-text-disabled)', fontSize: 13 }}>
        예정된 일정이 없습니다
      </div>
    );
  }

  // 날짜별 그루핑
  const grouped = new Map<string, CalEvent[]>();
  for (const e of upcoming) {
    const key = e.date.format('YYYY-MM-DD');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from(grouped.entries()).map(([dateStr, dayEvents]) => {
        const d = dayjs(dateStr);
        const isToday   = d.isSame(today, 'day');
        const isTomorrow = d.isSame(today.add(1, 'day'), 'day');
        const label = isToday ? '오늘' : isTomorrow ? '내일' : d.format('M월 D일 (ddd)');

        return (
          <div key={dateStr}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: isToday ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)',
              marginBottom: 6, paddingBottom: 6,
              borderBottom: '1px solid rgba(0,0,0,0.07)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {isToday && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(120,220,140,0.8)', display: 'inline-block' }} />}
              {label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayEvents.map(e => (
                <div key={e.id} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.04)',
                  borderRadius: 10,
                  borderLeft: '2px solid rgba(0,0,0,0.18)',
                }}>
                  {/* 시간 */}
                  <div style={{ width: 40, flexShrink: 0, fontSize: 11, color: 'var(--ou-text-disabled)', paddingTop: 1 }}>
                    {e.time || '종일'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--ou-text-heading)', fontWeight: 500 }}>
                      {e.title}
                    </div>
                    {e.location && (
                      <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 3 }}>
                        📍 {e.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 선택한 날 이벤트 패널 ─────────────────────────────────────────────────
function DayPanel({ day, events }: { day: dayjs.Dayjs; events: CalEvent[] }) {
  const dayEvents = events.filter(e => e.date.isSame(day, 'day'));
  const today = dayjs();
  const isToday = day.isSame(today, 'day');

  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      marginTop: 12,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ou-text-muted)', marginBottom: 10 }}>
        {isToday ? '오늘 · ' : ''}{day.format('M월 D일 (ddd)')}
        {dayEvents.length === 0 && (
          <span style={{ fontWeight: 400, color: 'var(--ou-text-disabled)', marginLeft: 6 }}>일정 없음</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {dayEvents.map(e => (
          <div key={e.id} style={{
            display: 'flex', gap: 10, alignItems: 'center',
            padding: '8px 10px', borderRadius: 8,
            background: 'rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', width: 36, flexShrink: 0 }}>
              {e.time || '종일'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--ou-text-body)' }}>{e.title}</div>
              {e.location && <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 1 }}>📍 {e.location}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────
export function CalendarView({ nodes, inline }: ViewProps & { inline?: boolean }) {
  const [view, setView]               = useState<CalView>('month');
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [currentWeek, setCurrentWeek]   = useState(dayjs());
  const [selectedDay, setSelectedDay]   = useState<dayjs.Dayjs | null>(null);

  const events = useMemo(() => parseEvents(nodes), [nodes]);

  // ── 인라인 ────────────────────────────────────────────────────────────
  if (inline) {
    const today = dayjs();
    const upcoming = events
      .filter(e => !e.date.isBefore(today, 'day'))
      .slice(0, 4);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
        <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          일정{upcoming.length > 0 ? ` · ${upcoming.length}개` : ''}
        </span>
        {upcoming.map(e => (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px', borderRadius: 6,
            background: 'rgba(0,0,0,0.04)',
            borderLeft: '2px solid rgba(0,0,0,0.18)',
          }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: 'var(--ou-text-disabled)' }}>{e.date.format('M/D')}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-body)' }}>{e.date.format('ddd')}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ou-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.title}
              </div>
              {e.time && <div style={{ fontSize: 10, color: 'var(--ou-text-muted)' }}>{e.time}</div>}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', padding: '4px 0' }}>예정된 일정 없음</div>
        )}
      </div>
    );
  }

  // 네비게이션
  const handlePrev = () => {
    if (view === 'month') setCurrentMonth(m => m.subtract(1, 'month'));
    else if (view === 'week') setCurrentWeek(w => w.subtract(1, 'week'));
  };
  const handleNext = () => {
    if (view === 'month') setCurrentMonth(m => m.add(1, 'month'));
    else if (view === 'week') setCurrentWeek(w => w.add(1, 'week'));
  };
  const handleToday = () => {
    setCurrentMonth(dayjs());
    setCurrentWeek(dayjs());
    setSelectedDay(dayjs());
  };

  const headerLabel = view === 'month'
    ? currentMonth.format('YYYY년 M월')
    : view === 'week'
    ? `${currentWeek.startOf('week').format('M/D')} – ${currentWeek.endOf('week').format('M/D')}`
    : '일정 목록';

  // 선택된 날 또는 오늘의 이벤트
  const panelDay = selectedDay ?? dayjs();
  const panelEvents = events.filter(e => e.date.isSame(panelDay, 'day'));
  const upcomingCount = events.filter(e => !e.date.isBefore(dayjs(), 'day')).length;

  return (
    <div className={styles.root}>

      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {view !== 'agenda' && (
              <>
                <button onClick={handlePrev} className={styles.navBtn}>
                  <CaretLeft size={14} />
                </button>
                <button onClick={handleNext} className={styles.navBtn}>
                  <CaretRight size={14} />
                </button>
              </>
            )}
            <button onClick={handleToday} className={styles.todayBtn}>오늘</button>
            <span className={styles.headerLabel}>{headerLabel}</span>
          </div>
        </div>
        <div className={styles.viewTabs}>
          {(['month', 'week', 'agenda'] as CalView[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`${styles.viewTab} ${view === v ? styles.viewTabActive : ''}`}>
              {v === 'month' ? '월간' : v === 'week' ? '주간' : '목록'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className={styles.layout}>
        {/* 좌측: 캘린더 본문 */}
        <div className={styles.calendarCard}>
          {view === 'month' && (
            <MonthView
              currentMonth={currentMonth}
              events={events}
              onDayClick={d => setSelectedDay(prev => prev && prev.isSame(d, 'day') ? null : d)}
              selectedDay={selectedDay}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentWeek={currentWeek}
              events={events}
              onDayClick={d => setSelectedDay(prev => prev && prev.isSame(d, 'day') ? null : d)}
              selectedDay={selectedDay}
            />
          )}
          {view === 'agenda' && <AgendaView events={events} />}

          {events.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ou-text-disabled)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }}>◫</div>
              <div>일정이 없습니다</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>"내일 3시 미팅" 처럼 말해보세요</div>
            </div>
          )}
        </div>

        {/* 우측: 선택일 패널 + 통계 */}
        <div className={styles.sidePanel}>
          <div className={styles.dayPanelCard}>
            <div className={styles.dayPanelTitle}>
              {panelDay.isSame(dayjs(), 'day') ? '오늘 · ' : ''}{panelDay.format('M월 D일 (ddd)')}
            </div>
            {panelEvents.length === 0 ? (
              <div className={styles.dayPanelEmpty}>일정 없음</div>
            ) : (
              panelEvents.map(e => (
                <div key={e.id} className={styles.eventRow}>
                  <div className={styles.eventTime}>{e.time || '종일'}</div>
                  <div>
                    <div className={styles.eventTitle}>{e.title}</div>
                    {e.location && <div className={styles.eventLocation}>📍 {e.location}</div>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 통계 카드 */}
          <div className={styles.statsCard}>
            <div className={styles.statsLabel}>예정된 일정</div>
            <div className={styles.statsValue}>{upcomingCount}</div>
            <div className={styles.statsSub}>개 남음</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  border: 'none', background: 'rgba(0,0,0,0.05)',
  color: 'var(--ou-text-muted)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: '150ms',
};

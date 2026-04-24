'use client';

import { useState, useMemo } from 'react';
import { useDeleteNode } from './_shared/useDeleteNode';
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
  const startDay     = startOfMonth.day();

  const days: (dayjs.Dayjs | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: endOfMonth.date() }, (_, i) => startOfMonth.add(i, 'day')),
  ];

  const getEvents = (d: dayjs.Dayjs) =>
    events.filter(e => e.date.format('YYYY-MM-DD') === d.format('YYYY-MM-DD'));

  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div>
      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            textAlign: 'center',
            fontSize: 9,
            fontFamily: 'var(--ou-font-mono)',
            fontWeight: 600,
            letterSpacing: '0.10em',
            padding: '6px 0 8px',
            color: i === 0 || i === 6 ? 'var(--ou-text-disabled)' : 'var(--ou-text-muted)',
          }}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} style={{ minHeight: 64 }} />;
          const dayEvents = getEvents(day);
          const isToday    = day.isSame(today, 'day');
          const isSelected = selectedDay && day.isSame(selectedDay, 'day');
          const isSun = day.day() === 0;
          const isSat = day.day() === 6;
          const dotCount = Math.min(dayEvents.length, 3);

          return (
            <div
              key={day.format('YYYY-MM-DD')}
              onClick={() => onDayClick(day)}
              style={{
                padding: '6px 4px 8px',
                minHeight: 64,
                cursor: 'pointer',
                borderBottom: isSelected
                  ? '2px solid var(--ou-text-heading)'
                  : '1px solid var(--ou-hairline)',
                transition: '150ms',
              }}
            >
              {/* 날짜 번호 */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>
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
                  color: isSun || isSat ? 'var(--ou-text-disabled)' : 'var(--ou-text-body)',
                }}>
                  {day.date()}
                </span>
              </div>

              {/* 이벤트 도트 */}
              {dotCount > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 3,
                }}>
                  {Array.from({ length: dotCount }).map((_, k) => (
                    <span key={k} style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: isToday
                        ? 'var(--ou-space)'
                        : 'var(--ou-text-muted)',
                      display: 'inline-block',
                    }} />
                  ))}
                </div>
              )}
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
  const today    = dayjs();
  const weekStart = currentWeek.startOf('week');
  const days     = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
        {days.map((d, i) => {
          const isToday    = d.isSame(today, 'day');
          const isSelected = selectedDay && d.isSame(selectedDay, 'day');
          return (
            <div key={d.format('YYYY-MM-DD')}
              onClick={() => onDayClick(d)}
              style={{
                textAlign: 'center', cursor: 'pointer', padding: '6px 4px 10px',
                borderBottom: isSelected
                  ? '2px solid var(--ou-text-heading)'
                  : '1px solid var(--ou-hairline)',
                transition: '150ms',
              }}
            >
              <div style={{
                fontSize: 9,
                fontFamily: 'var(--ou-font-mono)',
                letterSpacing: '0.08em',
                color: 'var(--ou-text-muted)',
                marginBottom: 4,
              }}>
                {WEEKDAYS[i]}
              </div>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: isToday ? 700 : 400,
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
              style={{ cursor: 'pointer', minHeight: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dayEvents.map(e => (
                <div key={e.id} style={{
                  display: 'flex', flexDirection: 'column',
                  paddingBottom: 4,
                  borderBottom: '1px solid var(--ou-hairline)',
                }}>
                  {e.time && (
                    <span style={{
                      fontSize: 9,
                      fontFamily: 'var(--ou-font-mono)',
                      color: 'var(--ou-text-muted)',
                    }}>
                      {e.time.slice(0, 5)}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10,
                    color: 'var(--ou-text-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {e.title}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 아젠다 이벤트 행 ─────────────────────────────────────────────────────
function AgendaEventRow({ e, onDelete }: { e: CalEvent; onDelete: (id: string, title: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '9px 0',
        borderBottom: '1px solid var(--ou-hairline)',
        transition: '150ms',
      }}>
      <div style={{
        width: 44,
        flexShrink: 0,
        fontSize: 11,
        fontFamily: 'var(--ou-font-mono)',
        color: 'var(--ou-text-muted)',
        letterSpacing: '0.02em',
        paddingTop: 1,
      }}>
        {e.time ? e.time.slice(0, 5) : '종일'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: 'var(--ou-text-heading)', fontWeight: 500, letterSpacing: '-0.01em' }}>
          {e.title}
        </div>
        {e.location && (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>
            {e.location}
          </div>
        )}
      </div>
      {hovered && (
        <button onClick={() => onDelete(e.id, e.title)} style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: 4,
          border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--ou-text-muted)', fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color var(--ou-transition-fast)',
        }}
        onMouseEnter={ev => (ev.currentTarget.style.color = 'var(--ou-text-heading)')}
        onMouseLeave={ev => (ev.currentTarget.style.color = 'var(--ou-text-muted)')}
        >✕</button>
      )}
    </div>
  );
}

// ── 아젠다 뷰 ─────────────────────────────────────────────────────────────
function AgendaView({ events, onDelete }: { events: CalEvent[]; onDelete: (id: string, title: string) => void }) {
  const today = dayjs();
  const upcoming = events
    .filter(e => !e.date.isBefore(today, 'day'))
    .slice(0, 30);

  if (upcoming.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ou-text-muted)', fontSize: 13 }}>
        예정된 일정이 없습니다
      </div>
    );
  }

  const grouped = new Map<string, CalEvent[]>();
  for (const e of upcoming) {
    const key = e.date.format('YYYY-MM-DD');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Array.from(grouped.entries()).map(([dateStr, dayEvents]) => {
        const d = dayjs(dateStr);
        const isToday    = d.isSame(today, 'day');
        const isTomorrow = d.isSame(today.add(1, 'day'), 'day');
        const label = isToday ? '오늘' : isTomorrow ? '내일' : d.format('M월 D일 (ddd)');

        return (
          <div key={dateStr}>
            <div style={{
              fontSize: 11,
              fontWeight: isToday ? 700 : 600,
              color: isToday ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
              marginBottom: 2,
              letterSpacing: isToday ? '-0.01em' : '0',
            }}>
              {label}
            </div>
            {dayEvents.map(e => (
              <AgendaEventRow key={e.id} e={e} onDelete={onDelete} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────
export function CalendarView({ nodes, inline }: ViewProps & { inline?: boolean }) {
  const [view, setView]                 = useState<CalView>('month');
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [currentWeek, setCurrentWeek]   = useState(dayjs());
  const [selectedDay, setSelectedDay]   = useState<dayjs.Dayjs | null>(null);
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set());
  const deleteNode = useDeleteNode();

  const allEvents = useMemo(() => parseEvents(nodes), [nodes]);
  const events    = useMemo(() => allEvents.filter(e => !localDeleted.has(e.id)), [allEvents, localDeleted]);

  const handleDelete = async (id: string, title: string) => {
    const ok = await deleteNode(id, title);
    if (ok) setLocalDeleted(prev => new Set(prev).add(id));
  };

  // ── 인라인 ──────────────────────────────────────────────────────────────
  if (inline) {
    const today = dayjs();
    const upcoming = events
      .filter(e => !e.date.isBefore(today, 'day'))
      .slice(0, 4);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
        <span style={{
          fontSize: 9,
          fontFamily: 'var(--ou-font-mono)',
          color: 'var(--ou-text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          일정{upcoming.length > 0 ? ` · ${upcoming.length}개` : ''}
        </span>
        {upcoming.map((e, i) => (
          <div key={e.id}>
            {i > 0 && <div style={{ height: 1, background: 'var(--ou-hairline)' }} />}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 0',
            }}>
              <div style={{ textAlign: 'center', flexShrink: 0, width: 28 }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)' }}>
                  {e.date.format('M/D')}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-body)' }}>
                  {e.date.format('ddd')}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: 'var(--ou-text-body)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}>
                  {e.title}
                </div>
                {e.time && (
                  <div style={{
                    fontSize: 10,
                    fontFamily: 'var(--ou-font-mono)',
                    color: 'var(--ou-text-muted)',
                  }}>
                    {e.time.slice(0, 5)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', padding: '4px 0' }}>예정된 일정 없음</div>
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

  const panelDay = selectedDay ?? dayjs();
  const panelEvents = events.filter(e => e.date.isSame(panelDay, 'day'));
  const upcomingCount = events.filter(e => !e.date.isBefore(dayjs(), 'day')).length;

  return (
    <div className={styles.root}>

      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {/* 연도 마이크로 + 월 디스플레이 */}
          <div>
            <div className={styles.yearMicro}>
              {view === 'month'
                ? currentMonth.format('YYYY')
                : view === 'week'
                ? `${currentWeek.startOf('week').format('YYYY')}`
                : dayjs().format('YYYY')}
            </div>
            <div className={styles.monthDisplay}>
              {view === 'month'
                ? currentMonth.format('MMMM')
                : view === 'week'
                ? `${currentWeek.startOf('week').format('M/D')} – ${currentWeek.endOf('week').format('M/D')}`
                : '목록'}
            </div>
          </div>
        </div>

        <div className={styles.headerControls}>
          {view !== 'agenda' && (
            <div style={{ display: 'flex', gap: 2 }}>
              <button onClick={handlePrev} className={styles.navBtn}>
                <CaretLeft size={13} />
              </button>
              <button onClick={handleNext} className={styles.navBtn}>
                <CaretRight size={13} />
              </button>
            </div>
          )}
          <button onClick={handleToday} className={styles.todayBtn}>오늘</button>
          <div className={styles.viewTabs}>
            {(['month', 'week', 'agenda'] as CalView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`${styles.viewTab} ${view === v ? styles.viewTabActive : ''}`}>
                {v === 'month' ? '월' : v === 'week' ? '주' : '목록'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className={styles.layout}>
        {/* 좌측: 캘린더 본문 */}
        <div className={styles.calendarArea}>
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
          {view === 'agenda' && <AgendaView events={events} onDelete={handleDelete} />}

          {events.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ou-text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.15 }}>◫</div>
              <div style={{ fontSize: 16, color: 'var(--ou-text-secondary)', letterSpacing: '-0.01em' }}>일정이 없습니다</div>
              <div style={{ fontSize: 12, marginTop: 6, color: 'var(--ou-text-muted)' }}>"내일 3시 미팅" 처럼 말해보세요</div>
            </div>
          )}
        </div>

        {/* 우측: 선택일 패널 + 통계 */}
        <div className={styles.sidePanel}>
          {/* 날짜 디스플레이 패널 */}
          <div className={styles.dayPanel}>
            <div className={styles.dayNumber}>
              {panelDay.date()}
            </div>
            <div className={styles.dayMeta}>
              {panelDay.format('dddd')} · {panelDay.format('M월 D일')}
            </div>
            <div style={{ height: 1, background: 'var(--ou-hairline-strong)', margin: '12px 0' }} />
            {panelEvents.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)', textAlign: 'center', padding: '16px 0' }}>
                일정 없음
              </div>
            ) : (
              panelEvents.map(e => (
                <AgendaEventRow key={e.id} e={e} onDelete={handleDelete} />
              ))
            )}
          </div>

          {/* 통계 히어로 카드 */}
          <div className={styles.statsCard}>
            <div className={styles.statsLabel}>UPCOMING</div>
            <div className={styles.statsValue}>{upcomingCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

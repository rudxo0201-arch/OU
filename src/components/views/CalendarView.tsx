'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useDeleteNode } from './_shared/useDeleteNode';
import { CaretLeft, CaretRight, MapPin, X } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';
import styles from './CalendarView.module.css';

dayjs.locale('ko');

type CalView = 'month' | 'week' | 'agenda';

const TIME_START = 7;
const TIME_END = 23;
const HOUR_PX = 56;

interface CalEvent {
  id: string;
  title: string;
  date: dayjs.Dayjs;
  time?: string;
  endTime?: string;
  location?: string;
  category?: string;
  allDay: boolean;
}

function parseEvents(nodes: ViewProps['nodes']): CalEvent[] {
  return nodes
    .filter(n => n.domain === DOMAINS.SCHEDULE && n.domain_data?.date)
    .map(n => ({
      id: n.id,
      title: n.domain_data.title ?? (n.raw ?? '').slice(0, 30) ?? '일정',
      date: dayjs(n.domain_data.date),
      time: n.domain_data.time,
      endTime: n.domain_data.end_time,
      location: n.domain_data.location,
      category: n.domain_data.category,
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

// ── 미니 캘린더 ───────────────────────────────────────────────────────────
function MiniCalendar({ events, selectedDay, onDayClick, onWeekChange }: {
  events: CalEvent[];
  selectedDay: dayjs.Dayjs | null;
  onDayClick: (d: dayjs.Dayjs) => void;
  onWeekChange?: (d: dayjs.Dayjs) => void;
}) {
  const [current, setCurrent] = useState(dayjs());
  const today = dayjs();
  const startOfMonth = current.startOf('month');
  const startDay = startOfMonth.day();
  const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const days: (dayjs.Dayjs | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: current.daysInMonth() }, (_, i) => startOfMonth.add(i, 'day')),
  ];

  const handleDayClick = (d: dayjs.Dayjs) => {
    onDayClick(d);
    onWeekChange?.(d);
  };

  return (
    <div className={styles.miniCal}>
      <div className={styles.miniCalHeader}>
        <span className={styles.miniCalTitle}>{current.format('MMMM YYYY')}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className={styles.miniNavBtn} onClick={() => setCurrent(c => c.subtract(1, 'month'))}>‹</button>
          <button className={styles.miniNavBtn} onClick={() => setCurrent(c => c.add(1, 'month'))}>›</button>
        </div>
      </div>
      <div className={styles.miniCalGrid}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} className={styles.miniCalDayHeader}>{w}</div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isToday    = day.isSame(today, 'day');
          const isSelected = selectedDay && day.isSame(selectedDay, 'day');
          const hasEvents  = events.some(e => e.date.isSame(day, 'day'));
          return (
            <div key={day.valueOf()} className={styles.miniCalDay} onClick={() => handleDayClick(day)}>
              <span className={styles.miniCalDayNum} style={{
                background: isToday ? 'var(--ou-text-heading)' : isSelected ? 'rgba(0,0,0,0.08)' : 'transparent',
                color: isToday ? 'var(--ou-space)' : 'var(--ou-text-body)',
                fontWeight: isToday ? 700 : 400,
              }}>
                {day.date()}
              </span>
              {hasEvents && !isToday && <span className={styles.miniCalDot} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 카테고리 패널 ─────────────────────────────────────────────────────────
function CategoriesPanel({ events }: { events: CalEvent[] }) {
  const cats = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach(e => {
      const cat = e.category || '기타';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    const total = events.length;
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [events]);

  if (cats.length === 0) return null;

  return (
    <div className={styles.categories}>
      <div className={styles.categoriesTitle}>Categories</div>
      {cats.map(({ name, pct }) => (
        <div key={name} className={styles.categoryItem}>
          <div className={styles.categoryCheck}>
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="var(--ou-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className={styles.categoryName}>{name}</span>
          <span className={styles.categoryPct}>{pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ── 이벤트 팝업 ───────────────────────────────────────────────────────────
function EventPopup({ event, anchor, onClose }: {
  event: CalEvent;
  anchor: { x: number; y: number };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const left = typeof window !== 'undefined' ? Math.min(anchor.x, window.innerWidth - 300) : anchor.x;
  const top  = typeof window !== 'undefined' ? Math.min(anchor.y, window.innerHeight - 220) : anchor.y;

  return (
    <div ref={ref} className={styles.eventPopup} style={{ left, top }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div className={styles.eventPopupTitle}>{event.title}</div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ou-text-muted)', padding: 0, flexShrink: 0, marginLeft: 8 }}>
          <X size={13} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className={styles.eventPopupRow}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>📅</span>
          <span>{event.date.format('YYYY년 M월 D일 (ddd)')}</span>
        </div>
        {event.time && (
          <div className={styles.eventPopupRow}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>🕐</span>
            <span>{event.time.slice(0, 5)}{event.endTime ? ` – ${event.endTime.slice(0, 5)}` : ''}</span>
          </div>
        )}
        {event.location && (
          <div className={styles.eventPopupRow}>
            <MapPin size={12} weight="fill" style={{ flexShrink: 0 }} />
            <span>{event.location}</span>
          </div>
        )}
        {event.category && (
          <div style={{ marginTop: 4 }}>
            <span className={styles.eventTag}>{event.category}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 시간 그리드 주간뷰 ─────────────────────────────────────────────────────
function WeekTimeGrid({ currentWeek, events, onDayClick, selectedDay, onEventClick }: {
  currentWeek: dayjs.Dayjs;
  events: CalEvent[];
  onDayClick: (d: dayjs.Dayjs) => void;
  selectedDay: dayjs.Dayjs | null;
  onEventClick: (e: CalEvent, anchor: { x: number; y: number }) => void;
}) {
  const today = dayjs();
  const weekStart = currentWeek.startOf('week');
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const hours = Array.from({ length: TIME_END - TIME_START }, (_, i) => TIME_START + i);
  const totalHeight = (TIME_END - TIME_START) * HOUR_PX;

  const now = dayjs();
  const nowY = ((now.hour() - TIME_START) + now.minute() / 60) * HOUR_PX;
  const showNow = nowY >= 0 && nowY <= totalHeight;

  const timeToY = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return ((h - TIME_START) + m / 60) * HOUR_PX;
  };

  const calcHeight = (startTime: string, endTime?: string): number => {
    if (!endTime) return HOUR_PX;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const dur = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max((dur / 60) * HOUR_PX, 24);
  };

  const allDayEvts = events.filter(e => e.allDay);
  const timedEvts  = events.filter(e => !e.allDay && e.time);

  return (
    <div>
      {/* 요일 헤더 */}
      <div className={styles.weekHeader}>
        <div className={styles.timeGutter} />
        {days.map((d, i) => {
          const isToday    = d.isSame(today, 'day');
          const isSelected = selectedDay && d.isSame(selectedDay, 'day');
          return (
            <div key={d.format('YYYY-MM-DD')} className={styles.weekHeaderDay}
              style={{ borderBottom: `2px solid ${isSelected ? 'var(--ou-text-heading)' : 'var(--ou-hairline)'}` }}
              onClick={() => onDayClick(d)}>
              <div className={styles.weekDayLabel}>{WEEKDAYS[i]}</div>
              <div className={styles.weekDayNum} style={{
                background: isToday ? 'var(--ou-text-heading)' : 'transparent',
                color: isToday ? 'var(--ou-space)' : 'var(--ou-text-body)',
                fontWeight: isToday ? 700 : 400,
              }}>
                {d.date()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 종일 행 */}
      {allDayEvts.length > 0 && (
        <div className={styles.allDayRow}>
          <div className={styles.allDayLabel}>종일</div>
          {days.map(d => {
            const dayEvts = allDayEvts.filter(e => e.date.isSame(d, 'day'));
            return (
              <div key={d.format('YYYY-MM-DD')} style={{ padding: '2px 0' }}>
                {dayEvts.map(e => (
                  <div key={e.id} className={styles.allDayEventBlock}
                    onClick={(ev) => {
                      const r = ev.currentTarget.getBoundingClientRect();
                      onEventClick(e, { x: r.right + 8, y: r.top });
                    }}>
                    {e.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* 시간 그리드 */}
      <div className={styles.timeGridWrapper}>
        <div className={styles.timeGrid} style={{ height: totalHeight }}>
          {/* 시간 레이블 */}
          <div className={styles.timeLabels} style={{ height: totalHeight }}>
            {hours.map(h => (
              <div key={h} className={styles.timeLabelItem} style={{ top: (h - TIME_START) * HOUR_PX - 8 }}>
                {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
              </div>
            ))}
          </div>

          {/* 날짜 컬럼 */}
          {days.map((d) => {
            const dayEvts = timedEvts.filter(e => e.date.isSame(d, 'day'));
            const isToday = d.isSame(today, 'day');
            return (
              <div key={d.format('YYYY-MM-DD')} className={styles.dayColumn} style={{ height: totalHeight }}>
                {hours.map(h => (
                  <div key={h} className={styles.hourLine} style={{ top: (h - TIME_START) * HOUR_PX }} />
                ))}
                {isToday && showNow && (
                  <div className={styles.nowLine} style={{ top: nowY }}>
                    <div className={styles.nowDot} />
                  </div>
                )}
                {dayEvts.map(e => {
                  const top = timeToY(e.time!);
                  const height = calcHeight(e.time!, e.endTime);
                  if (top < 0 || top > totalHeight) return null;
                  return (
                    <div key={e.id} className={styles.eventBlock} style={{ top, height }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        const r = ev.currentTarget.getBoundingClientRect();
                        onEventClick(e, { x: r.right + 8, y: r.top });
                      }}>
                      <div className={styles.eventBlockTime}>
                        {e.time!.slice(0, 5)}{e.endTime ? ` – ${e.endTime.slice(0, 5)}` : ''}
                      </div>
                      <div className={styles.eventBlockTitle}>{e.title}</div>
                      {height >= 48 && e.location && (
                        <div className={styles.eventBlockLoc}>{e.location}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 월간 뷰 ───────────────────────────────────────────────────────────────
function MonthView({ currentMonth, events, onDayClick, selectedDay, onEventClick }: {
  currentMonth: dayjs.Dayjs;
  events: CalEvent[];
  onDayClick: (d: dayjs.Dayjs) => void;
  selectedDay: dayjs.Dayjs | null;
  onEventClick: (e: CalEvent, anchor: { x: number; y: number }) => void;
}) {
  const today = dayjs();
  const startOfMonth = currentMonth.startOf('month');
  const startDay = startOfMonth.day();
  const days: (dayjs.Dayjs | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: currentMonth.daysInMonth() }, (_, i) => startOfMonth.add(i, 'day')),
  ];
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--ou-hairline)' }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            textAlign: 'center', fontSize: 9, fontFamily: 'var(--ou-font-mono)',
            fontWeight: 600, letterSpacing: '0.10em', padding: '8px 0',
            color: i === 0 || i === 6 ? 'var(--ou-text-disabled)' : 'var(--ou-text-muted)',
          }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} style={{ minHeight: 90, borderRight: '1px solid var(--ou-hairline)', borderBottom: '1px solid var(--ou-hairline)' }} />;
          const dayEvents = events.filter(e => e.date.isSame(day, 'day'));
          const isToday    = day.isSame(today, 'day');
          const isSelected = selectedDay && day.isSame(selectedDay, 'day');
          const isSun = day.day() === 0;
          const isSat = day.day() === 6;
          const shown = dayEvents.slice(0, 3);
          const more  = dayEvents.length - shown.length;

          return (
            <div key={day.format('YYYY-MM-DD')}
              onClick={() => onDayClick(day)}
              style={{
                padding: '6px 5px 6px',
                minHeight: 90,
                cursor: 'pointer',
                borderBottom: isSelected ? '2px solid var(--ou-text-heading)' : '1px solid var(--ou-hairline)',
                borderRight: '1px solid var(--ou-hairline)',
                transition: '150ms',
              }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>
                <span style={isToday ? {
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--ou-text-heading)', color: 'var(--ou-space)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                } : {
                  width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: isSun || isSat ? 'var(--ou-text-disabled)' : 'var(--ou-text-body)',
                }}>
                  {day.date()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {shown.map(e => (
                  <div key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      const r = ev.currentTarget.getBoundingClientRect();
                      onEventClick(e, { x: r.right + 8, y: r.top });
                    }}
                    style={{
                      fontSize: 9, padding: '2px 4px',
                      background: 'rgba(0,0,0,0.06)', borderRadius: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: 'var(--ou-text-body)', cursor: 'pointer',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                  >
                    {e.time && <span style={{ color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-mono)', marginRight: 3 }}>{e.time.slice(0, 5)}</span>}
                    {e.title}
                  </div>
                ))}
                {more > 0 && <div style={{ fontSize: 9, color: 'var(--ou-text-muted)', padding: '1px 4px' }}>+{more}개</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 아젠다 이벤트 행 ─────────────────────────────────────────────────────
function AgendaEventRow({ e, onDelete, onEventClick }: {
  e: CalEvent;
  onDelete: (id: string, title: string) => void;
  onEventClick: (e: CalEvent, anchor: { x: number; y: number }) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(ev) => {
        const r = ev.currentTarget.getBoundingClientRect();
        onEventClick(e, { x: r.right + 8, y: r.top });
      }}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: '9px 0', borderBottom: '1px solid var(--ou-hairline)',
        cursor: 'pointer', transition: '150ms',
      }}>
      <div style={{ width: 44, flexShrink: 0, fontSize: 11, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)', letterSpacing: '0.02em', paddingTop: 1 }}>
        {e.time ? e.time.slice(0, 5) : '종일'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: 'var(--ou-text-heading)', fontWeight: 500, letterSpacing: '-0.01em' }}>{e.title}</div>
        {e.location && <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>{e.location}</div>}
        {e.category && <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 2 }}>{e.category}</div>}
      </div>
      {hovered && (
        <button onClick={(ev) => { ev.stopPropagation(); onDelete(e.id, e.title); }}
          style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ou-text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={ev => (ev.currentTarget.style.color = 'var(--ou-text-heading)')}
          onMouseLeave={ev => (ev.currentTarget.style.color = 'var(--ou-text-muted)')}
        >✕</button>
      )}
    </div>
  );
}

// ── 아젠다 뷰 ─────────────────────────────────────────────────────────────
function AgendaView({ events, onDelete, onEventClick }: {
  events: CalEvent[];
  onDelete: (id: string, title: string) => void;
  onEventClick: (e: CalEvent, anchor: { x: number; y: number }) => void;
}) {
  const today = dayjs();
  const upcoming = events.filter(e => !e.date.isBefore(today, 'day')).slice(0, 30);

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
              fontSize: 11, fontWeight: isToday ? 700 : 600,
              color: isToday ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
              marginBottom: 2, letterSpacing: isToday ? '-0.01em' : '0',
            }}>{label}</div>
            {dayEvents.map(e => (
              <AgendaEventRow key={e.id} e={e} onDelete={onDelete} onEventClick={onEventClick} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────
export function CalendarView({ nodes, inline }: ViewProps & { inline?: boolean }) {
  const [view, setView]                 = useState<CalView>('week');
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [currentWeek, setCurrentWeek]   = useState(dayjs());
  const [selectedDay, setSelectedDay]   = useState<dayjs.Dayjs | null>(null);
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set());
  const [popup, setPopup]               = useState<{ event: CalEvent; anchor: { x: number; y: number } } | null>(null);
  const deleteNode = useDeleteNode();

  const allEvents = useMemo(() => parseEvents(nodes), [nodes]);
  const events    = useMemo(() => allEvents.filter(e => !localDeleted.has(e.id)), [allEvents, localDeleted]);

  const handleDelete = async (id: string, title: string) => {
    const ok = await deleteNode(id, title);
    if (ok) setLocalDeleted(prev => new Set(prev).add(id));
  };

  const handleEventClick = useCallback((e: CalEvent, anchor: { x: number; y: number }) => {
    setPopup({ event: e, anchor });
  }, []);

  const handleDayClick = useCallback((d: dayjs.Dayjs) => {
    setSelectedDay(prev => prev && prev.isSame(d, 'day') ? null : d);
  }, []);

  const handleWeekChange = useCallback((d: dayjs.Dayjs) => {
    setCurrentWeek(d);
    setCurrentMonth(d);
  }, []);

  // ── 인라인 ──────────────────────────────────────────────────────────────
  if (inline) {
    const today = dayjs();
    const upcoming = events.filter(e => !e.date.isBefore(today, 'day')).slice(0, 4);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
        <span style={{ fontSize: 9, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          일정{upcoming.length > 0 ? ` · ${upcoming.length}개` : ''}
        </span>
        {upcoming.map((e, i) => (
          <div key={e.id}>
            {i > 0 && <div style={{ height: 1, background: 'var(--ou-hairline)' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <div style={{ textAlign: 'center', flexShrink: 0, width: 28 }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)' }}>{e.date.format('M/D')}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-body)' }}>{e.date.format('ddd')}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--ou-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{e.title}</div>
                {e.time && <div style={{ fontSize: 10, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)' }}>{e.time.slice(0, 5)}</div>}
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', padding: '4px 0' }}>예정된 일정 없음</div>}
      </div>
    );
  }

  const handlePrev = () => {
    if (view === 'month') setCurrentMonth(m => m.subtract(1, 'month'));
    else if (view === 'week') setCurrentWeek(w => w.subtract(1, 'week'));
  };
  const handleNext = () => {
    if (view === 'month') setCurrentMonth(m => m.add(1, 'month'));
    else if (view === 'week') setCurrentWeek(w => w.add(1, 'week'));
  };
  const handleToday = () => {
    const now = dayjs();
    setCurrentMonth(now);
    setCurrentWeek(now);
    setSelectedDay(now);
  };

  const headerTitle = view === 'month'
    ? currentMonth.format('MMMM')
    : view === 'week'
    ? `${currentWeek.startOf('week').format('M/D')} – ${currentWeek.endOf('week').format('M/D')}`
    : '목록';

  const headerYear = view === 'month'
    ? currentMonth.format('YYYY')
    : view === 'week'
    ? currentWeek.startOf('week').format('YYYY')
    : dayjs().format('YYYY');

  return (
    <div className={styles.root}>

      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div>
            <div className={styles.yearMicro}>{headerYear}</div>
            <div className={styles.monthDisplay}>{headerTitle}</div>
          </div>
        </div>
        <div className={styles.headerControls}>
          {view !== 'agenda' && (
            <div style={{ display: 'flex', gap: 2 }}>
              <button onClick={handlePrev} className={styles.navBtn}><CaretLeft size={13} /></button>
              <button onClick={handleNext} className={styles.navBtn}><CaretRight size={13} /></button>
            </div>
          )}
          <button onClick={handleToday} className={styles.todayBtn}>오늘</button>
          <div className={styles.viewTabs}>
            {(['month', 'week', 'agenda'] as CalView[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`${styles.viewTab} ${view === v ? styles.viewTabActive : ''}`}>
                {v === 'month' ? 'Month' : v === 'week' ? 'Week' : 'List'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className={styles.layout}>

        {/* 좌측: 캘린더 본문 */}
        <div className={styles.calendarArea}>
          {events.length === 0 && view !== 'agenda' ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ou-text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.12 }}>◫</div>
              <div style={{ fontSize: 16, color: 'var(--ou-text-secondary)', letterSpacing: '-0.01em' }}>일정이 없습니다</div>
              <div style={{ fontSize: 12, marginTop: 6, color: 'var(--ou-text-muted)' }}>"내일 3시 미팅" 처럼 말해보세요</div>
            </div>
          ) : (
            <>
              {view === 'month' && (
                <MonthView
                  currentMonth={currentMonth}
                  events={events}
                  onDayClick={handleDayClick}
                  selectedDay={selectedDay}
                  onEventClick={handleEventClick}
                />
              )}
              {view === 'week' && (
                <WeekTimeGrid
                  currentWeek={currentWeek}
                  events={events}
                  onDayClick={handleDayClick}
                  selectedDay={selectedDay}
                  onEventClick={handleEventClick}
                />
              )}
              {view === 'agenda' && (
                <AgendaView events={events} onDelete={handleDelete} onEventClick={handleEventClick} />
              )}
            </>
          )}
        </div>

        {/* 우측: 미니 캘린더 + 카테고리 */}
        <div className={styles.sidePanel}>
          <MiniCalendar
            events={events}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
            onWeekChange={handleWeekChange}
          />
          <div style={{ height: 1, background: 'var(--ou-hairline)', margin: '20px 0' }} />
          <CategoriesPanel events={events} />
        </div>
      </div>

      {/* ── 이벤트 팝업 ── */}
      {popup && (
        <EventPopup
          event={popup.event}
          anchor={popup.anchor}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}

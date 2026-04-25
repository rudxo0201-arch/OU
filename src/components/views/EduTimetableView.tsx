'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { useCallback, useMemo, useRef, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';
import { useTimetableDrag } from '@/hooks/useTimetableDrag';

dayjs.locale('ko');

type ViewMode = 'day' | 'week';

const HOUR_START  = 8;
const HOUR_END    = 22;
const TOTAL_MINS  = (HOUR_END - HOUR_START) * 60;
const CELL_H      = 60;
const GRID_H      = CELL_H * (HOUR_END - HOUR_START);
const TIME_W      = 44;
const COL_MIN_W   = 120;  // px — 카테고리 컬럼 최소 너비
const COL_MAX_W   = 200;  // px — 합침 모드 너비
const WEEKDAY_KO  = ['월', '화', '수', '목', '금', '토', '일'];

// 카테고리 표시 순서
const CAT_ORDER = ['학교', '업무', '운동', '개인', '가족'];

interface Ev {
  id:         string;
  title:      string;
  instructor: string | null;
  date:       string;
  weekday:    number;
  startMin:   number;
  endMin:     number;
  duration:   number;
  location:   string | null;
  isExam:     boolean;
  category:   string;      // 없으면 '기타'
  domainData: Record<string, unknown>;
}

function toMin(t?: string | null) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function fmtMin(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function parseEvents(nodes: ViewProps['nodes']): Ev[] {
  return nodes
    .filter(n => n.domain === DOMAINS.SCHEDULE && n.domain_data?.date && n.domain_data?.time)
    .map(n => {
      const d  = n.domain_data as Record<string, unknown>;
      const s  = toMin(d.time as string);
      const e  = d.end_time ? toMin(d.end_time as string) : s + 90;
      const e2 = Math.max(e, s + 30);
      return {
        id:         n.id,
        title:      (d.title as string) ?? '',
        instructor: (d.instructor as string | null) ?? null,
        date:       d.date as string,
        weekday:    (dayjs(d.date as string).day() + 6) % 7,
        startMin:   s,
        endMin:     e2,
        duration:   e2 - s,
        location:   (d.location as string | null) ?? null,
        isExam:     d.type === '시험',
        category:   (d.category as string) || '기타',
        domainData: d,
      };
    });
}

/* 같은 컬럼 내 겹치는 이벤트 나란히 배치 */
function overlap(evs: Ev[]): Map<string, { col: number; total: number }> {
  const sorted = [...evs].sort((a, b) => a.startMin - b.startMin);
  const result = new Map<string, { col: number; total: number }>();
  const groups: Ev[][] = [];
  let cur: Ev[] = [], maxEnd = -1;

  for (const ev of sorted) {
    if (ev.startMin >= maxEnd) {
      if (cur.length) groups.push(cur);
      cur = [ev]; maxEnd = ev.endMin;
    } else {
      cur.push(ev); maxEnd = Math.max(maxEnd, ev.endMin);
    }
  }
  if (cur.length) groups.push(cur);
  for (const g of groups) g.forEach((ev, i) => result.set(ev.id, { col: i, total: g.length }));
  return result;
}

/* 이벤트 블록 */
function Block({ ev, top, height, leftPct, widthPct, faded, onPointerDown }: {
  ev: Ev; top: number; height: number;
  leftPct: string; widthPct: string;
  faded: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute', top, height,
        left: leftPct, width: widthPct,
        background:  ev.isExam ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.07)',
        borderLeft:  ev.isExam ? 'none' : '2.5px solid rgba(0,0,0,0.22)',
        borderRadius: 7, padding: '4px 7px',
        overflow: 'hidden', boxSizing: 'border-box',
        cursor: 'grab', userSelect: 'none',
        opacity: faded ? 0.3 : 1,
        transition: faded ? 'none' : 'opacity 120ms',
        zIndex: faded ? 0 : 1,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: ev.isExam ? '#fff' : 'rgba(0,0,0,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ev.title}{ev.isExam && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.65 }}>시험</span>}
      </div>
      {ev.instructor && height > 38 && (
        <div style={{ fontSize: 10, color: ev.isExam ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.42)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.instructor}
        </div>
      )}
      {ev.location && height > 54 && (
        <div style={{ fontSize: 10, color: ev.isExam ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.32)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.location}
        </div>
      )}
      {height > 68 && (
        <div style={{ fontSize: 9, color: ev.isExam ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.26)', lineHeight: 1.3, marginTop: 2 }}>
          {fmtMin(ev.startMin)}–{fmtMin(ev.endMin)}
        </div>
      )}
    </div>
  );
}

export function EduTimetableView({ nodes }: ViewProps) {
  const [viewMode, setViewMode]   = useState<ViewMode>('week');
  const [offset,   setOffset]     = useState(0);
  const [split,    setSplit]       = useState(true);  // 하루 뷰: 카테고리 분리 여부
  const [overrides, setOverrides] = useState<Record<string, { date?: string; startMin?: number; endMin?: number; category?: string }>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  const today   = dayjs().startOf('day');
  const current = useMemo(() => {
    return viewMode === 'day'
      ? today.add(offset, 'day')
      : today.add(-(today.day() === 0 ? 6 : today.day() - 1), 'day').add(offset, 'week');
  }, [viewMode, offset, today]);

  const days = useMemo(() =>
    viewMode === 'day' ? [current] : Array.from({ length: 7 }, (_, i) => current.add(i, 'day')),
  [viewMode, current]);

  /* 전체 이벤트 파싱 + 오버라이드 적용 */
  const allParsed = useMemo(() => parseEvents(nodes), [nodes]);

  const allEvents = useMemo(() =>
    allParsed.map(ev => {
      const ov = overrides[ev.id];
      if (!ov) return ev;
      const startMin = ov.startMin ?? ev.startMin;
      const endMin   = ov.endMin   ?? ev.endMin;
      const date     = ov.date     ?? ev.date;
      return { ...ev, startMin, endMin, duration: endMin - startMin, date, weekday: (dayjs(date).day() + 6) % 7, category: ov.category ?? ev.category };
    }),
  [allParsed, overrides]);

  /* 현재 뷰의 날짜 범위 */
  const startDate = days[0].format('YYYY-MM-DD');
  const endDate   = days[days.length - 1].format('YYYY-MM-DD');
  const visible   = useMemo(() =>
    allEvents.filter(ev => ev.date >= startDate && ev.date <= endDate),
  [allEvents, startDate, endDate]);

  /* 주간: 실제 컬럼 수 (최소 월~금) */
  const weekColCount = useMemo(() => {
    if (viewMode !== 'week') return 1;
    const hasSat = visible.some(e => e.weekday === 5);
    const hasSun = visible.some(e => e.weekday === 6);
    return 5 + (hasSat ? 1 : 0) + (hasSun ? 1 : 0);
  }, [viewMode, visible]);

  /* 하루 카테고리 목록 */
  const categories = useMemo(() => {
    if (viewMode !== 'day') return [];
    const catMap: Record<string, true> = {};
    visible.forEach(ev => { catMap[ev.category] = true; });
    const cats = Object.keys(catMap);
    if (!cats.length) return ['기타'];
    const sorted = cats.sort((a, b) => {
      const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b, 'ko');
    });
    return sorted;
  }, [viewMode, visible]);

  /* 드래그 컬럼 정의 */
  const dragColumns = useMemo(() => {
    if (viewMode === 'week') {
      return days.slice(0, weekColCount).map(d => ({ id: d.format('YYYY-MM-DD') }));
    }
    if (split && categories.length > 1) {
      return categories.map(c => ({ id: c }));
    }
    return [{ id: current.format('YYYY-MM-DD') }];
  }, [viewMode, days, weekColCount, split, categories, current]);

  /* 드래그 완료 처리 */
  const handleUpdate = useCallback(async (
    nodeId: string, colId: string, startTime: string, endTime: string,
    domainData: Record<string, unknown>,
  ) => {
    const startMin = toMin(startTime);
    const endMin   = toMin(endTime);

    // colId가 날짜인지 카테고리인지 판별
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(colId);
    const newDate = isDate ? colId : (domainData.date as string);
    const newCat  = isDate ? undefined : colId;

    setOverrides(prev => ({
      ...prev,
      [nodeId]: { date: newDate, startMin, endMin, ...(newCat ? { category: newCat } : {}) },
    }));

    const newDomainData: Record<string, unknown> = {
      ...domainData, date: newDate, time: startTime, end_time: endTime,
    };
    if (newCat) newDomainData.category = newCat;

    try {
      const res = await fetch(`/api/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_data: newDomainData }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOverrides(prev => { const n = { ...prev }; delete n[nodeId]; return n; });
    }
  }, []);

  const { dragging, handlePointerDown } = useTimetableDrag({
    gridRef, hourStart: HOUR_START, hourEnd: HOUR_END, cellHeight: CELL_H,
    columns: dragColumns, colOffset: TIME_W, onUpdate: handleUpdate,
  });

  /* 이벤트 픽셀 위치 */
  function evTop(ev: Ev)    { return (ev.startMin - HOUR_START * 60) / TOTAL_MINS * GRID_H; }
  function evHeight(ev: Ev) { return (ev.endMin - ev.startMin) / TOTAL_MINS * GRID_H; }

  const hours   = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const todayStr = today.format('YYYY-MM-DD');

  /* 표시 컬럼 배열 */
  const displayDays = days.slice(0, weekColCount);

  /* 하루 뷰: 합침/분리에 따른 컬럼 설정 */
  const isDaySplit = viewMode === 'day' && split && categories.length > 1;

  /* 헤더 텍스트 */
  const headerText = viewMode === 'day'
    ? current.format('YYYY년 M월 D일 (ddd)')
    : `${displayDays[0].format('YYYY년 M월 D일')} — ${displayDays[displayDays.length - 1].format('M월 D일')}`;

  /* ── 타임라인 그리드 공통 렌더 ── */
  type ColDef = { key: string; label: string; events: Ev[]; colId: string };

  const colDefs: ColDef[] = useMemo(() => {
    if (viewMode === 'week') {
      return displayDays.map(d => {
        const dateStr = d.format('YYYY-MM-DD');
        const wd = (d.day() + 6) % 7;
        return {
          key: dateStr,
          label: `${WEEKDAY_KO[wd]}\n${d.date()}`,
          events: visible.filter(ev => ev.date === dateStr),
          colId: dateStr,
        };
      });
    }
    // 하루 뷰
    const dateStr = current.format('YYYY-MM-DD');
    if (isDaySplit) {
      return categories.map(cat => ({
        key: cat,
        label: cat,
        events: visible.filter(ev => ev.category === cat),
        colId: cat,
      }));
    }
    return [{ key: dateStr, label: '', events: visible, colId: dateStr }];
  }, [viewMode, displayDays, visible, current, isDaySplit, categories]);

  /* 하루 합침 모드: 최대 너비로 컬럼 제한 */
  const gridStyle = useMemo(() => {
    if (viewMode === 'day') {
      const colW = isDaySplit ? COL_MIN_W * colDefs.length : COL_MAX_W;
      return { display: 'flex', width: Math.min(colW + TIME_W, 780) };
    }
    return { display: 'flex', minWidth: 520 };
  }, [viewMode, isDaySplit, colDefs.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', fontFamily: 'var(--ou-font-body)', position: 'relative', overflow: 'hidden' }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px 9px', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* 하루/일주일 토글 */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 2, gap: 1 }}>
          {(['day', 'week'] as const).map(mode => (
            <button key={mode} type="button"
              onClick={() => { setViewMode(mode); setOffset(0); }}
              style={{ padding: '3px 11px', border: 'none', borderRadius: 6, background: viewMode === mode ? 'rgba(0,0,0,0.82)' : 'transparent', color: viewMode === mode ? '#fff' : 'rgba(0,0,0,0.45)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--ou-font-body)' }}>
              {mode === 'day' ? '하루' : '일주일'}
            </button>
          ))}
        </div>

        {/* 합침/펼침 (하루 뷰 + 카테고리 2개 이상일 때만) */}
        {viewMode === 'day' && categories.length > 1 && (
          <button type="button"
            onClick={() => setSplit(s => !s)}
            style={{ padding: '3px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, background: 'transparent', color: 'rgba(0,0,0,0.5)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--ou-font-body)' }}>
            {split ? '합치기' : '펼치기'}
          </button>
        )}

        {/* 날짜 이동 */}
        <button type="button" onClick={() => setOffset(o => o - 1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.38)', padding: 4, display: 'flex' }}>
          <CaretLeft size={14} weight="bold" />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.72)', textAlign: 'center', minWidth: 140 }}>
          {headerText}
        </span>
        <button type="button" onClick={() => setOffset(o => o + 1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.38)', padding: 4, display: 'flex' }}>
          <CaretRight size={14} weight="bold" />
        </button>
        {offset !== 0 && (
          <button type="button" onClick={() => setOffset(0)}
            style={{ padding: '2px 8px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}>
            {viewMode === 'day' ? '오늘' : '이번 주'}
          </button>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.28)' }}>{visible.length}개</span>
      </div>

      {/* ── 그리드 영역 ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', display: 'flex' }}>
        <div ref={gridRef} style={{ ...gridStyle, position: 'relative' }}>

          {/* 시간 축 */}
          <div style={{ width: TIME_W, flexShrink: 0, paddingTop: 32 }}>
            {hours.map(h => (
              <div key={h} style={{ height: CELL_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2, fontSize: 10, color: 'rgba(0,0,0,0.24)', lineHeight: 1 }}>
                {h < HOUR_END ? `${String(h).padStart(2, '0')}:00` : ''}
              </div>
            ))}
          </div>

          {/* 컬럼들 */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${colDefs.length}, ${isDaySplit ? `${COL_MIN_W}px` : '1fr'})` }}>
            {/* 컬럼 헤더 */}
            {colDefs.map((col, i) => {
              const isToday = viewMode === 'week'
                ? col.colId === todayStr
                : col.colId === todayStr || viewMode === 'day';
              const lines = col.label.split('\n');
              return (
                <div key={col.key}
                  style={{ height: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(0,0,0,0.07)', borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.06)' : undefined, gap: 0, cursor: viewMode === 'week' ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (viewMode === 'week') {
                      const dayOffset = dayjs(col.colId).diff(today, 'day');
                      setViewMode('day'); setOffset(dayOffset);
                    }
                  }}
                >
                  {lines.length === 2 ? (
                    <>
                      <span style={{ fontSize: 9, color: isToday ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.32)', fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1.2 }}>{lines[0]}</span>
                      <span style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? '#000' : 'rgba(0,0,0,0.52)', lineHeight: 1.1 }}>{lines[1]}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.62)', letterSpacing: '-0.01em' }}>{lines[0]}</span>
                  )}
                </div>
              );
            })}

            {/* 이벤트 컬럼 */}
            {colDefs.map((col, colIdx) => {
              const lyt = overlap(col.events);
              return (
                <div key={col.key}
                  style={{ position: 'relative', height: GRID_H, borderLeft: colIdx > 0 ? '1px solid rgba(0,0,0,0.05)' : undefined }}>
                  {/* 시간선 */}
                  {hours.slice(0, -1).map(h => (
                    <div key={h} style={{ position: 'absolute', top: (h - HOUR_START) * CELL_H, left: 0, right: 0, borderTop: '1px solid rgba(0,0,0,0.04)', pointerEvents: 'none' }} />
                  ))}
                  {hours.slice(0, -1).map(h => (
                    <div key={`h${h}`} style={{ position: 'absolute', top: (h - HOUR_START) * CELL_H + CELL_H / 2, left: 0, right: 0, borderTop: '1px dashed rgba(0,0,0,0.03)', pointerEvents: 'none' }} />
                  ))}

                  {/* 현재 시간선 */}
                  {(viewMode === 'week' ? col.colId === todayStr : colIdx === 0) && (() => {
                    const nowMin = dayjs().hour() * 60 + dayjs().minute();
                    if (nowMin < HOUR_START * 60 || nowMin > HOUR_END * 60) return null;
                    const top = (nowMin - HOUR_START * 60) / TOTAL_MINS * GRID_H;
                    return (
                      <div style={{ position: 'absolute', top, left: 0, right: 0, height: 2, background: 'rgba(0,0,0,0.45)', zIndex: 5, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,0.6)' }} />
                      </div>
                    );
                  })()}

                  {/* 이벤트 */}
                  {col.events.map(ev => {
                    const top    = evTop(ev);
                    const height = Math.max(evHeight(ev), 22);
                    const lv     = lyt.get(ev.id) ?? { col: 0, total: 1 };
                    const leftPct  = `${lv.col / lv.total * 100}%`;
                    const widthPct = `calc(${1 / lv.total * 100}% - 6px)`;
                    return (
                      <Block
                        key={ev.id}
                        ev={ev}
                        top={top}
                        height={height}
                        leftPct={leftPct}
                        widthPct={widthPct}
                        faded={dragging?.nodeId === ev.id}
                        onPointerDown={e => handlePointerDown(e, ev.id, ev.domainData, top, ev.startMin, ev.duration)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Ghost 블록 */}
          {dragging && (() => {
            const ghost = allParsed.find(e => e.id === dragging.nodeId);
            return (
              <div style={{
                position: 'absolute',
                top:    dragging.ghostTop + 32,
                left:   dragging.ghostLeft,
                width:  dragging.ghostWidth,
                height: dragging.originalDuration / TOTAL_MINS * GRID_H,
                background: 'rgba(0,0,0,0.85)',
                borderRadius: 7,
                opacity: 0.8,
                zIndex: 100,
                pointerEvents: 'none',
                padding: '4px 7px',
                boxSizing: 'border-box',
                color: '#fff',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ghost?.title}
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                  {fmtMin(dragging.previewStartMin)}–{fmtMin(dragging.previewStartMin + (ghost?.duration ?? 60))}
                  {!/^\d{4}-\d{2}-\d{2}$/.test(dragging.previewColId) && (
                    <span style={{ marginLeft: 4 }}>→ {dragging.previewColId}</span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 빈 상태 */}
        {visible.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.2)' }}>
              {viewMode === 'day' ? '이날 일정이 없어요' : '이번 주 일정이 없어요'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

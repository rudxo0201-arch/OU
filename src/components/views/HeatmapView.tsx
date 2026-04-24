'use client';

import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';
import { useDeleteNode } from './_shared/useDeleteNode';
import styles from './HeatmapView.module.css';

dayjs.locale('ko');

// ── 파서 ──────────────────────────────────────────────────────────────────
interface HabitRecord {
  habitName: string;
  date: string;        // YYYY-MM-DD
  nodeId: string;
}

interface HabitSummary {
  name: string;
  records: HabitRecord[];
  streak: number;
  totalDays: number;
  thisWeek: number;
  lastChecked: string | null;
  doneToday: boolean;
  todayNodeIds: string[]; // 오늘 체크인된 노드ID들
}

function parseHabits(nodes: ViewProps['nodes']): HabitSummary[] {
  const byName = new Map<string, HabitRecord[]>();

  for (const n of nodes) {
    if (n.domain !== 'habit') continue;
    const date = n.domain_data?.date ?? (n.created_at ? n.created_at.slice(0, 10) : null);
    if (!date) continue;
    // domain_data.title / domain_data.name 우선, raw는 폴백
    const rawName = (n.raw ?? '').replace(/습관|했다|함|완료|체크|오늘|매일/g, '').trim().slice(0, 20);
    const name: string = (n.domain_data?.title || n.domain_data?.name || rawName || '습관') as string;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name)!.push({ habitName: name, date, nodeId: n.id });
  }

  if (byName.size === 0) return [];

  const today = dayjs().format('YYYY-MM-DD');
  const weekAgo = dayjs().subtract(6, 'day').format('YYYY-MM-DD');

  return Array.from(byName.entries()).map(([name, records]) => {
    const dateSet = new Set(records.map(r => r.date));
    let streak = 0;
    let d = dayjs();
    if (!dateSet.has(today)) d = d.subtract(1, 'day');
    while (dateSet.has(d.format('YYYY-MM-DD'))) {
      streak++;
      d = d.subtract(1, 'day');
    }

    const thisWeek = records.filter(r => r.date >= weekAgo && r.date <= today).length;
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    const todayNodeIds = records.filter(r => r.date === today).map(r => r.nodeId);

    return {
      name,
      records: sorted,
      streak,
      totalDays: new Set(records.map(r => r.date)).size,
      thisWeek,
      lastChecked: sorted[0]?.date ?? null,
      doneToday: dateSet.has(today),
      todayNodeIds,
    };
  }).sort((a, b) => {
    if (a.doneToday !== b.doneToday) return a.doneToday ? 1 : -1;
    return b.streak - a.streak;
  });
}

// ── streak 강도 (monochrome) ───────────────────────────────────────────────
function streakOpacity(streak: number): string {
  if (streak >= 30) return 'rgba(0,0,0,0.90)';
  if (streak >= 14) return 'rgba(0,0,0,0.72)';
  if (streak >= 7)  return 'rgba(0,0,0,0.55)';
  if (streak >= 3)  return 'rgba(0,0,0,0.40)';
  return 'rgba(0,0,0,0.22)';
}

// ── 미니 7일 막대 ─────────────────────────────────────────────────────────
function WeekBar({ records }: { records: HabitRecord[] }) {
  const dateSet = new Set(records.map(r => r.date));
  const days = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day'));

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
      {days.map(d => {
        const key = d.format('YYYY-MM-DD');
        const done = dateSet.has(key);
        const isToday = key === dayjs().format('YYYY-MM-DD');
        return (
          <div key={key} title={`${d.format('M/D')} ${done ? '✓' : '—'}`}
            style={{
              width: 8, height: done ? 16 : 6,
              borderRadius: 2,
              background: done
                ? (isToday ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.28)')
                : 'rgba(0,0,0,0.07)',
              transition: '200ms ease',
            }}
          />
        );
      })}
    </div>
  );
}

// ── 26주 히트맵 ───────────────────────────────────────────────────────────
function MiniHeatmap({ records }: { records: HabitRecord[] }) {
  const WEEKS = 26;
  const today = dayjs();
  const gridStart = today.subtract(WEEKS * 7 - 1, 'day');
  const dateSet = new Set(records.map(r => r.date));

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <svg width={WEEKS * 11 + 4} height={7 * 11} style={{ display: 'block' }}>
        {Array.from({ length: WEEKS }, (_, w) =>
          Array.from({ length: 7 }, (_, d) => {
            const cellDate = gridStart.add(w * 7 + d, 'day');
            if (cellDate.isAfter(today)) return null;
            const key = cellDate.format('YYYY-MM-DD');
            const done = dateSet.has(key);
            const isToday = key === today.format('YYYY-MM-DD');
            return (
              <rect key={key}
                x={w * 11} y={d * 11}
                width={9} height={9} rx={2}
                fill={done ? 'rgba(0,0,0,0.60)' : 'rgba(0,0,0,0.05)'}
                stroke={isToday ? 'rgba(0,0,0,0.35)' : 'none'}
                strokeWidth={isToday ? 1.5 : 0}
              >
                <title>{`${key}: ${done ? '✓' : '—'}`}</title>
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
}

// ── 습관 카드 ─────────────────────────────────────────────────────────────
function HabitCard({ habit, expanded, onExpand, onCheckIn, onDelete, isCheckingIn }: {
  habit: HabitSummary;
  expanded: boolean;
  onExpand: () => void;
  onCheckIn: () => void;
  onDelete: (nodeId: string) => void;
  isCheckingIn: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)',
        borderRadius: 14,
        border: '1px solid rgba(0,0,0,0.07)',
        transition: '150ms',
      }}
    >
      {/* 상단 행: 체크 + 이름 + 스트릭 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px',
          cursor: 'pointer',
        }}
      >
        {/* 오늘 체크 버튼 — 카드 expand와 분리 */}
        <button
          onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
          disabled={isCheckingIn}
          title={habit.doneToday ? '체크 해제' : '오늘 완료'}
          style={{
            width: 22, height: 22,
            borderRadius: '50%',
            border: `2px solid ${habit.doneToday ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0.20)'}`,
            background: habit.doneToday ? 'rgba(0,0,0,0.80)' : 'transparent',
            flexShrink: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: '150ms',
          }}
        >
          {habit.doneToday && (
            <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>
          )}
        </button>

        {/* 이름 + 스트릭 */}
        <div
          onClick={onExpand}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: habit.doneToday ? 'var(--ou-text-secondary)' : 'var(--ou-text-heading)',
            textDecoration: habit.doneToday ? 'line-through' : 'none',
          }}>
            {habit.name}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: streakOpacity(habit.streak),
            }}>
              {habit.streak > 0 ? `${habit.streak}일` : '—'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
              주 {habit.thisWeek}/7
            </span>
            {/* expand chevron */}
            <span style={{
              fontSize: 10, color: 'var(--ou-text-disabled)',
              transition: '150ms', transform: expanded ? 'rotate(180deg)' : 'none',
            }}>▾</span>
          </div>
        </div>
      </div>

      {/* 7일 막대 */}
      <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <WeekBar records={habit.records} />
        <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginLeft: 8 }}>총 {habit.totalDays}일</span>
      </div>

      {/* 펼침: 26주 히트맵 + 삭제 */}
      {expanded && (
        <div style={{ padding: '12px 16px 14px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 6 }}>지난 26주</div>
          <MiniHeatmap records={habit.records} />
          {/* 오늘 기록 삭제 */}
          {habit.todayNodeIds.length > 0 && (
            <button
              onClick={() => onDelete(habit.todayNodeIds[0])}
              style={{
                marginTop: 12, padding: '4px 10px',
                fontSize: 11, color: 'var(--ou-text-muted)',
                background: 'none', border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              오늘 기록 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── 오늘 체크인 링 ────────────────────────────────────────────────────────
function TodayRing({ done, total }: { done: number; total: number }) {
  const size = 80;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(0,0,0,0.80)" strokeWidth={stroke}
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ transition: '500ms ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ou-text-heading)' }}>
          {done}/{total}
        </div>
        <div style={{ fontSize: 8, color: 'var(--ou-text-disabled)' }}>오늘</div>
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────
export function HeatmapView({ nodes }: ViewProps) {
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<Set<string>>(new Set());
  const deleteNode = useDeleteNode();

  const habits = useMemo(() => parseHabits(nodes), [nodes]);

  const handleCheckIn = useCallback(async (habit: HabitSummary) => {
    if (checkingIn.has(habit.name)) return;
    setCheckingIn(prev => new Set(prev).add(habit.name));
    try {
      if (!habit.doneToday) {
        await fetch('/api/quick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `${habit.name} 완료`, domainHint: 'habit' }),
        });
      } else {
        await Promise.all(
          habit.todayNodeIds.map(id => fetch(`/api/quick?nodeId=${id}`, { method: 'DELETE' }))
        );
      }
      window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain: 'habit' } }));
    } catch {
      // silent — Realtime이 없을 경우 manual refresh 필요
    } finally {
      setCheckingIn(prev => { const n = new Set(prev); n.delete(habit.name); return n; });
    }
  }, [checkingIn]);

  const handleDelete = useCallback(async (nodeId: string, habitName: string) => {
    const ok = await deleteNode(nodeId, `${habitName} 오늘 기록`);
    if (ok) window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain: 'habit' } }));
  }, [deleteNode]);

  if (nodes.length === 0 || habits.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', gap: 16, color: 'var(--ou-text-muted)',
      }}>
        <span style={{ fontSize: 48, opacity: 0.15 }}>⟳</span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: 'var(--ou-text-secondary)', marginBottom: 6 }}>습관 기록이 없습니다</div>
          <div style={{ fontSize: 13, color: 'var(--ou-text-disabled)' }}>"오늘 운동했어" 처럼 말해보세요</div>
        </div>
      </div>
    );
  }

  const todayDone  = habits.filter(h => h.doneToday).length;
  const bestStreak = Math.max(...habits.map(h => h.streak), 0);
  const todayPct   = habits.length > 0 ? Math.round((todayDone / habits.length) * 100) : 0;
  const allRecords = useMemo(() => habits.flatMap(h => h.records), [habits]);

  return (
    <div className={styles.root}>

      {/* ── 헤더 ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.headerTitle}>습관</h2>
          <div className={styles.headerDate}>{dayjs().format('M월 D일 (ddd)')}</div>
        </div>
      </div>

      {/* ── 요약 카드 3개 ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCardDark}>
          <div className={styles.statLabelDark}>오늘 완료</div>
          <div className={styles.statValueDark}>{todayDone}/{habits.length}</div>
          <div className={styles.statSubDark}>{todayPct}% 달성</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>최장 스트릭</div>
          <div className={styles.statValue}>{bestStreak}일</div>
          <div className={styles.statSub}>연속 기록</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>총 습관</div>
          <div className={styles.statValue}>{habits.length}</div>
          <div className={styles.statSub}>개 추적 중</div>
        </div>
      </div>

      {/* ── 2컬럼 레이아웃 ── */}
      <div className={styles.layout}>
        {/* 좌측: 습관 카드 목록 */}
        <div className={styles.habitSection}>
          {habits.filter(h => !h.doneToday).length > 0 && (
            <>
              <SectionLabel label={`남은 오늘 · ${habits.filter(h => !h.doneToday).length}개`} />
              <div className={styles.habitList}>
                {habits.filter(h => !h.doneToday).map(h => (
                  <HabitCard
                    key={h.name} habit={h}
                    expanded={expandedHabit === h.name}
                    onExpand={() => setExpandedHabit(expandedHabit === h.name ? null : h.name)}
                    onCheckIn={() => handleCheckIn(h)}
                    onDelete={(nodeId) => handleDelete(nodeId, h.name)}
                    isCheckingIn={checkingIn.has(h.name)}
                  />
                ))}
              </div>
            </>
          )}
          {habits.filter(h => h.doneToday).length > 0 && (
            <>
              <SectionLabel label={`오늘 완료 · ${habits.filter(h => h.doneToday).length}개`} />
              <div className={styles.habitList}>
                {habits.filter(h => h.doneToday).map(h => (
                  <HabitCard
                    key={h.name} habit={h}
                    expanded={expandedHabit === h.name}
                    onExpand={() => setExpandedHabit(expandedHabit === h.name ? null : h.name)}
                    onCheckIn={() => handleCheckIn(h)}
                    onDelete={(nodeId) => handleDelete(nodeId, h.name)}
                    isCheckingIn={checkingIn.has(h.name)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* 우측: 오늘 링 + 전체 히트맵 */}
        <div className={styles.rightPanel}>
          <div className={styles.todayCard}>
            <TodayRing done={todayDone} total={habits.length} />
            <div className={styles.todayCardContent}>
              <div className={styles.todayCardTitle}>오늘의 달성도</div>
              <div className={styles.todayCardSub}>{todayPct}% 완료</div>
            </div>
          </div>

          <div className={styles.heatmapCard}>
            <div className={styles.heatmapCardTitle}>지난 26주 전체 활동</div>
            <MiniHeatmap records={allRecords} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700,
      color: 'var(--ou-text-disabled)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '4px 4px 2px',
    }}>
      {label}
    </div>
  );
}

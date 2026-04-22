'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';
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
}

function parseHabits(nodes: ViewProps['nodes']): HabitSummary[] {
  const byName = new Map<string, HabitRecord[]>();

  for (const n of nodes) {
    if (n.domain !== 'habit') continue;
    const date = n.domain_data?.date ?? (n.created_at ? n.created_at.slice(0, 10) : null);
    if (!date) continue;
    // 습관명: domain_data.title / domain_data.name / raw 앞 20자
    const name: string =
      n.domain_data?.title || n.domain_data?.name ||
      (n.raw ?? '').replace(/습관|했다|함|완료|체크/g, '').trim().slice(0, 20) || '습관';
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name)!.push({ habitName: name, date, nodeId: n.id });
  }

  // 습관명이 없으면 전체를 '전체 활동'으로 묶기
  if (byName.size === 0) return [];

  const today = dayjs().format('YYYY-MM-DD');
  const weekAgo = dayjs().subtract(6, 'day').format('YYYY-MM-DD');

  return Array.from(byName.entries()).map(([name, records]) => {
    // 연속 스트릭 계산
    const dateSet = new Set(records.map(r => r.date));
    let streak = 0;
    let d = dayjs();
    // 오늘 기록이 없으면 어제부터 시작
    if (!dateSet.has(today)) d = d.subtract(1, 'day');
    while (dateSet.has(d.format('YYYY-MM-DD'))) {
      streak++;
      d = d.subtract(1, 'day');
    }

    const thisWeek = records.filter(r => r.date >= weekAgo && r.date <= today).length;
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

    return {
      name,
      records: sorted,
      streak,
      totalDays: new Set(records.map(r => r.date)).size,
      thisWeek,
      lastChecked: sorted[0]?.date ?? null,
      doneToday: dateSet.has(today),
    };
  }).sort((a, b) => {
    // 오늘 안한 것 먼저, 스트릭 높은 것 먼저
    if (a.doneToday !== b.doneToday) return a.doneToday ? 1 : -1;
    return b.streak - a.streak;
  });
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
                ? (isToday ? 'rgba(120,220,140,0.9)' : 'rgba(0,0,0,0.25)')
                : 'rgba(0,0,0,0.07)',
              transition: '200ms ease',
            }}
          />
        );
      })}
    </div>
  );
}

// ── 52주 히트맵 ───────────────────────────────────────────────────────────
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
                fill={done ? 'rgba(120,220,140,0.7)' : 'rgba(0,0,0,0.05)'}
                stroke={isToday ? 'rgba(0,0,0,0.25)' : 'none'}
                strokeWidth={isToday ? 1 : 0}
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
function HabitCard({ habit, expanded, onToggle }: {
  habit: HabitSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const streakColor = habit.streak >= 30 ? '#FFD700'
    : habit.streak >= 14 ? '#FF9F40'
    : habit.streak >= 7  ? '#7AFFB8'
    : habit.streak >= 3  ? 'rgba(0,0,0,0.55)'
    : 'rgba(0,0,0,0.22)';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)',
        borderRadius: 14,
        padding: '14px 16px',
        border: '1px solid rgba(0,0,0,0.07)',
        transition: '150ms',
        cursor: 'pointer',
      }}
      onClick={onToggle}
    >
      {/* 상단: 이름 + 오늘 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 오늘 체크 인디케이터 */}
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: habit.doneToday ? 'rgba(120,220,140,0.9)' : 'rgba(0,0,0,0.12)',
            boxShadow: habit.doneToday ? '0 0 6px rgba(120,220,140,0.5)' : 'none',
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-heading)' }}>
            {habit.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 스트릭 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 13 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: streakColor }}>
              {habit.streak}일
            </span>
          </div>
          {/* 이번 주 */}
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
            이번 주 {habit.thisWeek}/7
          </span>
        </div>
      </div>

      {/* 7일 막대 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <WeekBar records={habit.records} />
        <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginLeft: 8 }}>
          총 {habit.totalDays}일
        </span>
      </div>

      {/* 펼침: 26주 히트맵 */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 6 }}>
            지난 26주
          </div>
          <MiniHeatmap records={habit.records} />
        </div>
      )}
    </div>
  );
}

// ── 상단 통계 ─────────────────────────────────────────────────────────────
function GlobalStats({ habits }: { habits: HabitSummary[] }) {
  const todayDone  = habits.filter(h => h.doneToday).length;
  const totalHabits = habits.length;
  const bestStreak = Math.max(...habits.map(h => h.streak), 0);
  const pct = totalHabits > 0 ? Math.round((todayDone / totalHabits) * 100) : 0;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 10, marginBottom: 20,
    }}>
      {[
        { label: '오늘 완료', value: `${todayDone}/${totalHabits}`, sub: `${pct}%` },
        { label: '최장 스트릭', value: `${bestStreak}일`, sub: '연속' },
        { label: '총 습관', value: String(totalHabits), sub: '개' },
      ].map(s => (
        <div key={s.label} style={{
          background: 'rgba(0,0,0,0.04)',
          borderRadius: 12, padding: '12px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ou-text-heading)' }}>{s.value}</div>
          <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
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
          stroke="rgba(120,220,140,0.8)" strokeWidth={stroke}
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

  const habits = useMemo(() => parseHabits(nodes), [nodes]);

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

  // 전체 히트맵용: 모든 습관 레코드를 합산
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
                    onToggle={() => setExpandedHabit(expandedHabit === h.name ? null : h.name)}
                  />
                ))}
              </div>
            </>
          )}
          {habits.filter(h => h.doneToday).length > 0 && (
            <>
              <SectionLabel label={`오늘 완료 · ${habits.filter(h => h.doneToday).length}개`} color="rgba(22,163,74,0.6)" />
              <div className={styles.habitList}>
                {habits.filter(h => h.doneToday).map(h => (
                  <HabitCard
                    key={h.name} habit={h}
                    expanded={expandedHabit === h.name}
                    onToggle={() => setExpandedHabit(expandedHabit === h.name ? null : h.name)}
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

function SectionLabel({ label, color }: { label: string; color?: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700,
      color: color || 'var(--ou-text-disabled)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '4px 4px 2px',
    }}>
      {label}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

/**
 * 습관 히트맵 뷰
 * 참고: GitHub 잔디, Habitica, Loop Habit Tracker
 * - 52주 히트맵 (GitHub 스타일)
 * - 연속 기록일 (streak)
 * - 도메인 필터
 * - 다크 테마 최적화 색상
 */

const CELL_SIZE = 13;
const CELL_GAP = 2;
const WEEKS = 52;
const DAYS = 7;
const DAY_LABELS = ['', '월', '', '수', '', '금', ''];

const INTENSITIES = [
  'rgba(255,255,255,0.03)',  // 0
  'rgba(255,255,255,0.12)',  // low
  'rgba(255,255,255,0.22)',  // medium-low
  'rgba(255,255,255,0.35)',  // medium
  'rgba(255,255,255,0.55)',  // high
];

export function HeatmapView({ nodes }: ViewProps) {
  const [domainFilter, setDomainFilter] = useState<string>('all');

  const filtered = useMemo(() =>
    domainFilter === 'all' ? nodes : nodes.filter(n => n.domain === domainFilter),
  [nodes, domainFilter]);

  const domains = useMemo(() => {
    const set = new Set<string>();
    for (const n of nodes) if (n.domain) set.add(n.domain);
    return Array.from(set);
  }, [nodes]);

  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of filtered) {
      const date = n.domain_data?.date ?? n.created_at;
      if (!date) continue;
      const key = dayjs(date).format('YYYY-MM-DD');
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [filtered]);

  const maxCount = useMemo(
    () => Math.max(...Object.values(dateCounts), 1),
    [dateCounts],
  );

  const totalDays = Object.keys(dateCounts).length;
  const totalEntries = Object.values(dateCounts).reduce((a, b) => a + b, 0);

  const streak = useMemo(() => {
    let count = 0;
    let d = dayjs();
    while (dateCounts[d.format('YYYY-MM-DD')]) {
      count++;
      d = d.subtract(1, 'day');
    }
    return count;
  }, [dateCounts]);

  // 이번 주 vs 지난 주
  const thisWeek = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const key = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      count += dateCounts[key] || 0;
    }
    return count;
  }, [dateCounts]);

  const today = dayjs();
  const gridStart = today.subtract(WEEKS * 7 - 1, 'day').subtract(today.subtract(WEEKS * 7 - 1, 'day').day(), 'day');

  const getIntensity = (count: number): string => {
    if (count === 0) return INTENSITIES[0];
    const ratio = count / maxCount;
    if (ratio <= 0.25) return INTENSITIES[1];
    if (ratio <= 0.5) return INTENSITIES[2];
    if (ratio <= 0.75) return INTENSITIES[3];
    return INTENSITIES[4];
  };

  const monthLabels = useMemo(() => {
    const labels: { label: string; week: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const d = gridStart.add(w * 7, 'day');
      const m = d.month();
      if (m !== lastMonth) {
        labels.push({ label: d.format('M월'), week: w });
        lastMonth = m;
      }
    }
    return labels;
  }, [gridStart]);

  const svgWidth = WEEKS * (CELL_SIZE + CELL_GAP) + 28;
  const svgHeight = DAYS * (CELL_SIZE + CELL_GAP) + 20;

  if (nodes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-dimmed)', fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🟩</div>
        활동 기록이 없습니다. Orb에 말해보세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: '0 auto' }}>
      {/* Stats */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 20,
        padding: '14px 18px', borderRadius: 12,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <StatBox value={streak} label="연속일" highlight={streak > 0} />
        <StatBox value={totalDays} label="기록일" />
        <StatBox value={totalEntries} label="총 기록" />
        <StatBox value={thisWeek} label="이번 주" />
      </div>

      {/* Domain filter */}
      {domains.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <Chip label="전체" active={domainFilter === 'all'} onClick={() => setDomainFilter('all')} />
          {domains.map(d => (
            <Chip key={d} label={d} active={domainFilter === d} onClick={() => setDomainFilter(d)} />
          ))}
        </div>
      )}

      {/* Heatmap */}
      <div style={{ overflowX: 'auto', marginBottom: 12 }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {monthLabels.map(({ label, week }) => (
            <text key={`m-${week}`} x={28 + week * (CELL_SIZE + CELL_GAP)} y={10}
              fontSize={9} fill="rgba(255,255,255,0.3)">
              {label}
            </text>
          ))}

          {DAY_LABELS.map((label, i) => (
            label && <text key={`d-${i}`} x={0} y={20 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
              fontSize={9} fill="rgba(255,255,255,0.3)">
              {label}
            </text>
          ))}

          {Array.from({ length: WEEKS }, (_, w) =>
            Array.from({ length: DAYS }, (_, d) => {
              const cellDate = gridStart.add(w * 7 + d, 'day');
              if (cellDate.isAfter(today)) return null;
              const key = cellDate.format('YYYY-MM-DD');
              const count = dateCounts[key] ?? 0;
              const isToday = key === today.format('YYYY-MM-DD');
              return (
                <rect key={key}
                  x={28 + w * (CELL_SIZE + CELL_GAP)}
                  y={16 + d * (CELL_SIZE + CELL_GAP)}
                  width={CELL_SIZE} height={CELL_SIZE}
                  rx={2} fill={getIntensity(count)}
                  stroke={isToday ? 'rgba(255,255,255,0.3)' : 'none'}
                  strokeWidth={isToday ? 1 : 0}
                >
                  <title>{`${key}: ${count}회`}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>적음</span>
        {INTENSITIES.map((color, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
        ))}
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>많음</span>
      </div>
    </div>
  );
}

function StatBox({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{
        fontSize: 18, fontWeight: 700,
        color: highlight ? 'rgba(255,255,255,0.9)' : 'var(--ou-text-strong)',
      }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 999, fontSize: 11,
      border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
      color: active ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
      cursor: 'pointer',
    }}>
      {label}
    </button>
  );
}

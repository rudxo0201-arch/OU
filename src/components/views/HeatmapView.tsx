'use client';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

const CELL_SIZE = 12;
const CELL_GAP = 2;
const WEEKS = 52;
const DAYS = 7;
const DAY_LABELS = ['', '월', '', '수', '', '금', ''];

export function HeatmapView({ nodes }: ViewProps) {
  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of nodes) {
      const date = n.domain_data?.date ?? n.created_at;
      if (!date) continue;
      const key = dayjs(date).format('YYYY-MM-DD');
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [nodes]);

  const maxCount = useMemo(
    () => Math.max(...Object.values(dateCounts), 1),
    [dateCounts],
  );

  const totalDays = useMemo(
    () => Object.keys(dateCounts).length,
    [dateCounts],
  );

  const streak = useMemo(() => {
    let count = 0;
    let d = dayjs();
    while (dateCounts[d.format('YYYY-MM-DD')]) {
      count++;
      d = d.subtract(1, 'day');
    }
    return count;
  }, [dateCounts]);

  const today = dayjs();
  const startDate = today.subtract(WEEKS * 7 - 1, 'day');
  const gridStart = startDate.subtract(startDate.day(), 'day');

  const getIntensity = (count: number): string => {
    if (count === 0) return 'var(--ou-gray-1, #f0f0f0)';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'var(--ou-gray-3, #ccc)';
    if (ratio <= 0.5) return 'var(--ou-gray-5, #888)';
    if (ratio <= 0.75) return 'var(--ou-gray-7, #555)';
    return 'var(--ou-gray-9, #222)';
  };

  const monthLabels: { label: string; week: number }[] = useMemo(() => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>활동 기록</span>
        <div style={{ display: 'flex', gap: 12 }}>
          {streak > 0 && <span style={{ fontSize: 11, fontWeight: 600 }}>{streak}일 연속</span>}
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{totalDays}일 기록됨</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {monthLabels.map(({ label, week }) => (
            <text
              key={`month-${week}`}
              x={28 + week * (CELL_SIZE + CELL_GAP)}
              y={10}
              fontSize={9}
              fill="currentColor"
              opacity={0.5}
            >
              {label}
            </text>
          ))}

          {DAY_LABELS.map((label, i) => (
            label && (
              <text
                key={`day-${i}`}
                x={0}
                y={20 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
                fontSize={9}
                fill="currentColor"
                opacity={0.5}
              >
                {label}
              </text>
            )
          ))}

          {Array.from({ length: WEEKS }, (_, w) =>
            Array.from({ length: DAYS }, (_, d) => {
              const cellDate = gridStart.add(w * 7 + d, 'day');
              if (cellDate.isAfter(today)) return null;
              const key = cellDate.format('YYYY-MM-DD');
              const count = dateCounts[key] ?? 0;
              return (
                <rect
                  key={key}
                  x={28 + w * (CELL_SIZE + CELL_GAP)}
                  y={16 + d * (CELL_SIZE + CELL_GAP)}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill={getIntensity(count)}
                >
                  <title>{`${key}: ${count}회`}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--ou-text-dimmed, #888)' }}>적음</span>
        {['var(--ou-gray-1, #f0f0f0)', 'var(--ou-gray-3, #ccc)', 'var(--ou-gray-5, #888)', 'var(--ou-gray-7, #555)', 'var(--ou-gray-9, #222)'].map(
          (color, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: color,
              }}
            />
          ),
        )}
        <span style={{ fontSize: 9, color: 'var(--ou-text-dimmed, #888)' }}>많음</span>
      </div>
    </div>
  );
}

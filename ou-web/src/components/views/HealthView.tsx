'use client';

import { useMemo } from 'react';
import { Printer } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

const CELL_SIZE = 12;
const CELL_GAP = 2;
const WEEKS = 24;
const DAYS = 7;

interface HealthEntry {
  id: string;
  date: string;
  symptom: string;
  severity: string;
  bodyPart: string;
  memo: string;
}

export function HealthView({ nodes }: ViewProps) {
  const entries: HealthEntry[] = useMemo(
    () =>
      nodes
        .map(n => {
          const dd = n.domain_data ?? {};
          return {
            id: n.id,
            date: dd.date ?? n.created_at ?? '',
            symptom: dd.symptom ?? dd.title ?? '',
            severity: dd.severity ?? '',
            bodyPart: dd.body_part ?? dd.bodyPart ?? '',
            memo: dd.memo ?? dd.content ?? n.raw ?? '',
          };
        })
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  const dateCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (!e.date) continue;
      const key = dayjs(e.date).format('YYYY-MM-DD');
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [entries]);

  const maxCount = useMemo(
    () => Math.max(...Object.values(dateCounts), 1),
    [dateCounts],
  );

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

  const symptomFrequency = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (!e.symptom) continue;
      map[e.symptom] = (map[e.symptom] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [entries]);

  const maxSymptomCount = useMemo(
    () => Math.max(...symptomFrequency.map(([, c]) => c), 1),
    [symptomFrequency],
  );

  const svgWidth = WEEKS * (CELL_SIZE + CELL_GAP) + 28;
  const svgHeight = DAYS * (CELL_SIZE + CELL_GAP) + 20;

  const handlePrint = () => {
    window.print();
  };

  if (entries.length === 0) return null;

  return (
    <div className="health-view-print" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
      {/* Monthly Heatmap */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>기록 현황</span>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{entries.length}건</span>
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
                    <title>{`${key}: ${count}건`}</title>
                  </rect>
                );
              }),
            )}
          </svg>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid var(--ou-border, #333)' }} />

      {/* Symptom Frequency */}
      {symptomFrequency.length > 0 && (
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 12 }}>자주 기록된 증상</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {symptomFrequency.map(([symptom, count]) => (
              <div key={symptom} style={{ display: 'flex', gap: 12, flexWrap: 'nowrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, width: 80, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {symptom}
                </span>
                <div style={{ flex: 1, position: 'relative', height: 16 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${(count / maxSymptomCount) * 100}%`,
                      backgroundColor: 'var(--ou-gray-5, #888)',
                      borderRadius: 4,
                      transition: 'width 300ms ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', width: 24, textAlign: 'right', flexShrink: 0 }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: '0.5px solid var(--ou-border, #333)' }} />

      {/* Timeline */}
      <div>
        <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 12 }}>기록 목록</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.slice(0, 30).map(entry => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                padding: '8px 12px',
                gap: 12,
                flexWrap: 'nowrap',
                alignItems: 'center',
                border: '0.5px solid var(--ou-border, #333)',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', width: 64, flexShrink: 0 }}>
                {entry.date ? dayjs(entry.date).format('MM.DD') : ''}
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                {entry.symptom || '기록'}
              </span>
              {entry.severity && (
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>
                  {entry.severity}
                </span>
              )}
              {entry.bodyPart && (
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>
                  {entry.bodyPart}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.memo}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Print button */}
      <button
        onClick={handlePrint}
        style={{
          padding: '8px 20px',
          border: '0.5px solid var(--ou-border, #333)',
          borderRadius: 6,
          background: 'none',
          cursor: 'pointer',
          fontSize: 13,
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
        }}
      >
        <Printer size={16} />
        병원 방문용 요약
      </button>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .health-view-print, .health-view-print * { visibility: visible; }
          .health-view-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
          }
          .health-view-print button { display: none !important; }
        }
      `}</style>
    </div>
  );
}

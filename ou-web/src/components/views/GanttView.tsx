'use client';

import { useMemo } from 'react';
import type { ViewProps } from './registry';

interface GanttTask {
  id: string;
  title: string;
  start: number;
  end: number;
  progress: number;
}

export function GanttView({ nodes }: ViewProps) {
  const { tasks, minDate, maxDate, totalDays, todayOffset } = useMemo(() => {
    const now = Date.now();
    const parsed: GanttTask[] = nodes
      .map(n => {
        const sd = n.domain_data?.start_date;
        const ed = n.domain_data?.end_date;
        const start = sd ? new Date(sd).getTime() : now;
        const end = ed ? new Date(ed).getTime() : start + 86400000 * 7;
        return {
          id: n.id,
          title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 30) || 'Task'),
          start,
          end: Math.max(end, start + 86400000),
          progress: Math.min(100, Math.max(0, Number(n.domain_data?.progress) || 0)),
        };
      })
      .sort((a, b) => a.start - b.start);

    if (parsed.length === 0) return { tasks: [], minDate: 0, maxDate: 0, totalDays: 1, todayOffset: 0 };

    const min = Math.min(...parsed.map(t => t.start));
    const max = Math.max(...parsed.map(t => t.end));
    const days = Math.max(1, Math.ceil((max - min) / 86400000));
    const tOff = Math.max(0, Math.min(1, (now - min) / (max - min)));

    return { tasks: parsed, minDate: min, maxDate: max, totalDays: days, todayOffset: tOff };
  }, [nodes]);

  if (nodes.length === 0) return null;

  const BAR_H = 24;
  const ROW_H = 36;
  const LABEL_W = 140;
  const CHART_W = 500;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 16 }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', marginBottom: 16 }}>Gantt</span>

      {/* Header dates */}
      <div style={{ display: 'flex', flexWrap: 'nowrap', marginBottom: 4 }}>
        <div style={{ width: LABEL_W, flexShrink: 0 }} />
        <div style={{ width: CHART_W, position: 'relative' }}>
          <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', position: 'absolute', left: 0 }}>
            {new Date(minDate).toLocaleDateString()}
          </span>
          <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', position: 'absolute', right: 0 }}>
            {new Date(maxDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ position: 'relative', minWidth: LABEL_W + CHART_W }}>
          {/* Today marker */}
          {todayOffset >= 0 && todayOffset <= 1 && (
            <div
              style={{
                position: 'absolute',
                left: LABEL_W + todayOffset * CHART_W,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: 'var(--ou-gray-6, #666)',
                zIndex: 2,
              }}
            />
          )}

          {tasks.map((task, i) => {
            const range = maxDate - minDate || 1;
            const leftPct = (task.start - minDate) / range;
            const widthPct = (task.end - task.start) / range;

            return (
              <div key={task.id} style={{ display: 'flex', flexWrap: 'nowrap', height: ROW_H, alignItems: 'center' }}>
                {/* Label */}
                <div style={{ width: LABEL_W, flexShrink: 0, paddingRight: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 400, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </span>
                </div>

                {/* Bar area */}
                <div
                  style={{
                    width: CHART_W,
                    position: 'relative',
                    height: BAR_H,
                    backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--ou-bg-subtle, rgba(255,255,255,0.02))',
                    borderRadius: 4,
                  }}
                >
                  {/* Background bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPct * 100}%`,
                      width: `${widthPct * 100}%`,
                      top: 4,
                      height: BAR_H - 8,
                      backgroundColor: 'var(--ou-gray-3, #ccc)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Progress fill */}
                    {task.progress > 0 && (
                      <div
                        style={{
                          width: `${task.progress}%`,
                          height: '100%',
                          backgroundColor: 'var(--ou-gray-6, #666)',
                          borderRadius: 3,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

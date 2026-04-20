'use client';

import { useState, useEffect } from 'react';

export function ChatHeatmapWidget() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [maxCount, setMaxCount] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/nodes?limit=500')
      .then(r => r.json())
      .then(d => {
        const nodes: { created_at: string }[] = d.nodes || [];
        const map: Record<string, number> = {};
        nodes.forEach(n => {
          const key = new Date(n.created_at).toISOString().slice(0, 10);
          map[key] = (map[key] || 0) + 1;
        });
        setCounts(map);
        setMaxCount(Math.max(1, ...Object.values(map)));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // 최근 14일 날짜 배열 (오늘 포함)
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
      {/* 헤더 */}
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: '0.10em', textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
        marginBottom: 10, flexShrink: 0,
      }}>
        대화 히트맵 · 지난 2주
      </span>

      {/* 7×2 히트맵 그리드 */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: 4,
      }}>
        {days.map(day => {
          const count = counts[day] || 0;
          const intensity = loaded ? Math.min(count / maxCount, 1) : 0;
          const isToday = day === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={day}
              title={`${day}: ${count}개`}
              style={{
                borderRadius: 5,
                background: count > 0
                  ? `rgba(var(--ou-accent-rgb, 220, 150, 90), ${0.2 + intensity * 0.8})`
                  : 'var(--ou-bg)',
                boxShadow: count > 0 ? 'none' : 'var(--ou-neu-pressed-sm)',
                outline: isToday ? '2px solid var(--ou-accent)' : 'none',
                outlineOffset: -2,
                transition: 'background 300ms ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

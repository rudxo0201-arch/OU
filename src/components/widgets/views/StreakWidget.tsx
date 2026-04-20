'use client';

import { useState, useEffect } from 'react';

function calcStreak(nodes: { created_at: string }[]): number {
  if (nodes.length === 0) return 0;

  const dates = new Set(
    nodes.map(n => new Date(n.created_at).toLocaleDateString('ko-KR'))
  );

  let streak = 0;
  const d = new Date();

  // 오늘부터 거슬러 올라가며 연속 여부 확인
  while (true) {
    const key = d.toLocaleDateString('ko-KR');
    if (dates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function StreakWidget() {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/nodes?limit=500')
      .then(r => r.json())
      .then(d => {
        const nodes = d.nodes || [];
        setStreak(calcStreak(nodes));
      })
      .catch(() => setStreak(0));
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '14px 16px',
    }}>
      {/* 상단: 불꽃 + STREAK */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>🔥</span>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: 'var(--ou-text-dimmed)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          fontFamily: 'var(--ou-font-logo)',
        }}>
          STREAK
        </span>
      </div>

      {/* 큰 숫자 */}
      <div style={{ lineHeight: 1 }}>
        <span style={{
          fontFamily: 'var(--ou-font-display)',
          fontSize: 52, fontWeight: 700,
          color: 'var(--ou-text-bright)',
          letterSpacing: '-0.04em',
        }}>
          {streak !== null ? streak : '—'}
        </span>
      </div>

      {/* 하단 라벨 */}
      <span style={{
        fontSize: 9, fontWeight: 600,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: '0.12em', textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
      }}>
        DAYS TALKING
      </span>
    </div>
  );
}

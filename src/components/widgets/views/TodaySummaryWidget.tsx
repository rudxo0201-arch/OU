'use client';

import { useState, useEffect } from 'react';

export function TodaySummaryWidget() {
  const [total, setTotal] = useState<number | null>(null);
  const [weeklyDelta, setWeeklyDelta] = useState<number | null>(null);

  useEffect(() => {
    // 전체 노드 수 조회
    fetch('/api/nodes?limit=1')
      .then(r => r.json())
      .then(d => {
        if (typeof d.count === 'number') {
          setTotal(d.count);
        } else if (Array.isArray(d.nodes)) {
          // count 없으면 더 많이 가져와서 추정
          fetch('/api/nodes?limit=2000')
            .then(r2 => r2.json())
            .then(d2 => {
              const nodes = d2.nodes || [];
              setTotal(nodes.length);

              // 이번 주 (7일) 추가된 노드 수
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              const weeklyCount = nodes.filter((n: { created_at?: string }) =>
                n.created_at && new Date(n.created_at) > weekAgo
              ).length;
              setWeeklyDelta(weeklyCount);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const displayTotal = total !== null ? total.toLocaleString('ko-KR') : '—';

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px 20px',
    }}>
      {/* 상단 라벨 */}
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: '0.10em', textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
      }}>
        기억 노드
      </span>

      {/* 큰 숫자 */}
      <div style={{ lineHeight: 1 }}>
        <span style={{
          fontFamily: 'var(--ou-font-display)',
          fontSize: 48, fontWeight: 700,
          color: 'var(--ou-text-bright)',
          letterSpacing: '-0.03em',
        }}>
          {displayTotal}
        </span>
        {total !== null && (
          <span style={{
            fontSize: 13, color: 'var(--ou-text-muted)',
            marginLeft: 6, fontWeight: 400,
          }}>
            nodes
          </span>
        )}
      </div>

      {/* 하단: 주간 변화 */}
      {weeklyDelta !== null && weeklyDelta > 0 ? (
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
          ↑ 이번 주 +{weeklyDelta}
        </span>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
          데이터를 쌓아보세요
        </span>
      )}
    </div>
  );
}

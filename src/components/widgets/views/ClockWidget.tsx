'use client';

import { useState, useEffect } from 'react';

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const day = dayNames[now.getDay()];

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
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
      }}>
        TODAY · {day}
      </span>

      {/* 큰 날짜 */}
      <div style={{ lineHeight: 1 }}>
        <span style={{
          fontFamily: 'var(--ou-font-display)',
          fontSize: 52, fontWeight: 700,
          color: 'var(--ou-text-bright)',
          letterSpacing: '-0.03em',
        }}>
          {month}.{date < 10 ? `0${date}` : date}
        </span>
      </div>

      {/* 하단 서브텍스트 */}
      <span style={{
        fontSize: 12,
        color: 'var(--ou-text-muted)',
        lineHeight: 1.4,
      }}>
        오늘도 좋은 하루
      </span>
    </div>
  );
}

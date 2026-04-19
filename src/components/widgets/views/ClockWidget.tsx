'use client';

import { useState, useEffect } from 'react';

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')} ${dayNames[now.getDay()]}`;

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8,
    }}>
      <span style={{
        fontFamily: "var(--ou-font-display)",
        fontSize: 36,
        fontWeight: 300,
        color: 'var(--ou-text-bright)',
        letterSpacing: 4,
        lineHeight: 1,
      }}>
        {h}:{m}<span style={{ fontSize: 18, color: 'var(--ou-text-dimmed)' }}>:{s}</span>
      </span>
      <span style={{
        fontSize: 12,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: 1,
      }}>
        {dateStr}
      </span>
    </div>
  );
}

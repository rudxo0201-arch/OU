'use client';

interface Props {
  events: { day: number; label: string }[];
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function DemoCalendar({ events }: Props) {
  // April 2026 starts on Wednesday (index 3)
  const startDay = 3;
  const totalDays = 30;
  const eventDays = new Set(events.map(e => e.day));

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div style={{
      border: '0.5px solid var(--ou-border-subtle)',
      borderRadius: 'var(--ou-radius-md)',
      padding: 16, boxShadow: 'var(--ou-glow-xs)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-strong)', marginBottom: 12, textAlign: 'center' }}>
        2026년 4월
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--ou-text-dimmed)', padding: 4 }}>{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} style={{
            textAlign: 'center', fontSize: 11, padding: '6px 2px',
            borderRadius: 'var(--ou-radius-sm)',
            color: day && eventDays.has(day) ? 'var(--ou-text-bright)' : day === 17 ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
            border: day && eventDays.has(day)
              ? '0.5px solid var(--ou-border-strong)'
              : day === 17
                ? '0.5px solid var(--ou-border-muted)'
                : '0.5px solid transparent',
            boxShadow: day && eventDays.has(day) ? 'var(--ou-glow-md)' : 'none',
            transition: 'all 0.4s ease',
            visibility: day ? 'visible' : 'hidden',
          }}>
            {day ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

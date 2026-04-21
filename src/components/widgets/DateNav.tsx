'use client';

/**
 * DateNav — 위젯 헤더용 미니 날짜 네비게이터
 * ◁  4/21 (월)  ▷  [오늘]
 */

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function addDays(iso: string, delta: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatLabel(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAYS[d.getDay()];
  return `${m}/${day} (${dow})`;
}

interface DateNavProps {
  date: string;
  onChange: (date: string) => void;
  /** 월 단위 이동 여부 (기본: 일 단위) */
  unit?: 'day' | 'month';
}

export function DateNav({ date, onChange, unit = 'day' }: DateNavProps) {
  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;

  const prev = () => {
    if (unit === 'month') {
      const d = new Date(date);
      d.setMonth(d.getMonth() - 1);
      onChange(d.toISOString().slice(0, 10));
    } else {
      onChange(addDays(date, -1));
    }
  };

  const next = () => {
    if (unit === 'month') {
      const d = new Date(date);
      d.setMonth(d.getMonth() + 1);
      onChange(d.toISOString().slice(0, 10));
    } else {
      onChange(addDays(date, 1));
    }
  };

  const label = unit === 'month'
    ? `${new Date(date).getFullYear()}.${String(new Date(date).getMonth() + 1).padStart(2, '0')}`
    : formatLabel(date);

  const btnStyle: React.CSSProperties = {
    width: 20, height: 20,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-raised-xs)',
    color: 'var(--ou-text-secondary)',
    fontSize: 9,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    transition: 'box-shadow 80ms ease',
    padding: 0,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <button style={btnStyle} onClick={prev} aria-label="이전">◁</button>

      <span style={{
        fontFamily: 'var(--ou-font-logo)',
        fontSize: 10, fontWeight: 600,
        color: isToday ? 'var(--ou-text-bright)' : 'var(--ou-text-body)',
        letterSpacing: '0.03em',
        minWidth: 64, textAlign: 'center',
        userSelect: 'none',
      }}>
        {label}
      </span>

      <button style={btnStyle} onClick={next} aria-label="다음">▷</button>

      {!isToday && unit === 'day' && (
        <button
          onClick={() => onChange(today)}
          style={{
            height: 18,
            padding: '0 6px',
            borderRadius: 'var(--ou-radius-pill)',
            border: 'none',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-xs)',
            color: 'var(--ou-text-muted)',
            fontSize: 9,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          오늘
        </button>
      )}
    </div>
  );
}

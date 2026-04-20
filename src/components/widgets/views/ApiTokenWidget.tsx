'use client';

// TODO: 실제 API 사용량 연동 시 fetch로 교체
const MOCK = { used: 12400, limit: 20000 };

export function ApiTokenWidget() {
  const pct = Math.round((MOCK.used / MOCK.limit) * 100);

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '14px 16px',
    }}>
      {/* 헤더 */}
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: '0.10em', textTransform: 'uppercase',
        fontFamily: 'var(--ou-font-logo)',
      }}>
        API 토큰
      </span>

      {/* 퍼센트 + 라벨 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: 'var(--ou-font-display)',
          fontSize: 36, fontWeight: 700,
          color: 'var(--ou-text-bright)',
          letterSpacing: '-0.03em',
        }}>
          {pct}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)', fontWeight: 500 }}>
          % used
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div style={{
        height: 6, borderRadius: 999,
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 999,
          background: 'var(--ou-accent)',
          transition: 'width 600ms ease',
        }} />
      </div>

      {/* 하단: 숫자 */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-mono)' }}>
          {fmt(MOCK.used)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', fontFamily: 'var(--ou-font-mono)' }}>
          {fmt(MOCK.limit)} / 월
        </span>
      </div>
    </div>
  );
}

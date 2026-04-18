'use client';

export function TodaySummaryWidget() {
  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 10,
      padding: 16,
    }}>
      <span style={{
        fontSize: 32, lineHeight: 1,
        color: 'var(--ou-text-bright)',
        fontWeight: 300,
      }}>
        0
      </span>
      <span style={{
        fontSize: 12,
        color: 'var(--ou-text-dimmed)',
        letterSpacing: 0.5,
      }}>
        오늘의 데이터
      </span>
      <span style={{
        fontSize: 11,
        color: 'var(--ou-text-muted)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        OU뷰에서 대화하면<br />여기에 요약됩니다
      </span>
    </div>
  );
}

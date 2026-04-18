'use client';

export function RecentNodesWidget() {
  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8,
      padding: 16,
    }}>
      <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', letterSpacing: 0.5 }}>
        최근 노드
      </span>
      <span style={{
        fontSize: 11,
        color: 'var(--ou-text-muted)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        아직 생성된 노드가 없습니다
      </span>
    </div>
  );
}

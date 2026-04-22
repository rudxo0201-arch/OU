'use client';

export default function Error() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--ou-text-secondary)', fontSize: 14 }}>오류가 발생했어요</span>
    </div>
  );
}

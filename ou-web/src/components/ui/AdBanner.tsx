'use client';

interface AdBannerProps {
  position: 'feed' | 'view_bottom';
  plan: 'free' | 'pro' | 'team';
}

export function AdBanner({ position, plan }: AdBannerProps) {
  if (plan !== 'free') return null;

  return (
    <div
      style={{
        padding: 12,
        border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
        borderRadius: 8,
        opacity: 0.7,
      }}
    >
      <span style={{ fontSize: 10, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))', display: 'block', marginBottom: 4 }}>광고</span>
      <span style={{ fontSize: 14, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>광고 영역</span>
    </div>
  );
}

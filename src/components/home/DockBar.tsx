'use client';

import { CSSProperties, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_DOCK = ['note', 'calendar', 'task', 'finance', 'habit'];

const ORB_ICONS: Record<string, string> = {
  note:     '✎',
  calendar: '◫',
  task:     '✓',
  finance:  '◈',
  habit:    '⟳',
  idea:     '✦',
};

function DockItem({ slug }: { slug: string }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const style: CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: 'var(--ou-radius-md)',
    background: pressed ? 'var(--ou-glass-active)' : hovered ? 'var(--ou-glass-hover)' : 'var(--ou-glass)',
    backdropFilter: 'var(--ou-blur-light)',
    WebkitBackdropFilter: 'var(--ou-blur-light)',
    border: `1px solid ${hovered ? 'var(--ou-glass-border-hover)' : 'var(--ou-glass-border)'}`,
    boxShadow: hovered ? 'var(--ou-shadow-md)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: hovered ? 'var(--ou-accent)' : 'var(--ou-text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--ou-transition-fast)',
    transform: pressed ? 'scale(0.90)' : hovered ? 'translateY(-3px)' : 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  return (
    <div
      style={style}
      title={slug}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {ORB_ICONS[slug] ?? '◎'}
    </div>
  );
}

export function DockBar() {
  const router = useRouter();
  const [dtHovered, setDtHovered] = useState(false);
  const [dtPressed, setDtPressed] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'center',
      padding: '8px 24px 12px',
      background: 'rgba(11,11,17,0.75)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--ou-glass-border)',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {DEFAULT_DOCK.map((slug) => (
          <DockItem key={slug} slug={slug} />
        ))}

        {/* Deep Talk 특별 버튼 */}
        <div
          onClick={() => router.push('/orb/deep-talk')}
          onMouseEnter={() => setDtHovered(true)}
          onMouseLeave={() => { setDtHovered(false); setDtPressed(false); }}
          onMouseDown={() => setDtPressed(true)}
          onMouseUp={() => setDtPressed(false)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: dtPressed ? 'rgba(var(--ou-accent-rgb), 0.25)' : dtHovered ? 'rgba(var(--ou-accent-rgb), 0.15)' : 'rgba(var(--ou-accent-rgb), 0.08)',
            border: `1px solid rgba(var(--ou-accent-rgb), ${dtHovered ? 0.4 : 0.2})`,
            boxShadow: dtHovered ? 'var(--ou-accent-glow)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: 'var(--ou-accent)',
            cursor: 'pointer',
            transition: 'all var(--ou-transition-fast)',
            transform: dtPressed ? 'scale(0.90)' : dtHovered ? 'translateY(-3px)' : 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          title="Deep Talk"
        >
          ◉
        </div>
      </div>
    </div>
  );
}

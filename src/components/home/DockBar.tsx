'use client';

import { CSSProperties, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_DOCK = ['note', 'calendar', 'task', 'finance', 'habit', 'youtube'];

const ORB_ICONS: Record<string, string> = {
  note:     '✎',
  calendar: '◫',
  task:     '✓',
  finance:  '◈',
  habit:    '⟳',
  idea:     '✦',
  youtube:  '▶',
};

const ORB_LABELS: Record<string, string> = {
  note:     '노트',
  calendar: '캘린더',
  task:     '할 일',
  finance:  '가계부',
  habit:    '습관',
  idea:     '아이디어',
  youtube:  'YouTube',
};

function DockItem({ slug }: { slug: string }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const style: CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 'var(--ou-radius-md)',
    background: pressed
      ? 'rgba(0,0,0,0.08)'
      : hovered
        ? 'rgba(0,0,0,0.05)'
        : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
    color: hovered ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    transform: pressed ? 'scale(0.88)' : hovered ? 'translateY(-4px) scale(1.10)' : 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    position: 'relative',
    flexShrink: 0,
  };

  return (
    <div
      style={style}
      title={ORB_LABELS[slug] ?? slug}
      onClick={() => router.push(`/orb/${slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {ORB_ICONS[slug] ?? '◎'}

      {/* 호버 툴팁 */}
      {hovered && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--ou-text-heading)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 500,
          padding: '3px 8px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          letterSpacing: '0.02em',
          zIndex: 1,
        }}>
          {ORB_LABELS[slug] ?? slug}
        </span>
      )}
    </div>
  );
}

function DockDivider() {
  return (
    <div style={{
      width: 1,
      height: 22,
      background: 'rgba(0,0,0,0.12)',
      margin: '0 4px',
      flexShrink: 0,
      alignSelf: 'center',
    }} />
  );
}

export function DockBar() {
  const router = useRouter();
  const [dtHovered, setDtHovered] = useState(false);
  const [dtPressed, setDtPressed] = useState(false);

  return (
    /* 플로팅 pill */
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      /* 모바일에서 너비 초과 방지 */
      maxWidth: 'calc(100vw - 32px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '6px 12px',
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(0,0,0,0.09)',
        borderRadius: 9999,
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}>
        {DEFAULT_DOCK.map((slug) => (
          <DockItem key={slug} slug={slug} />
        ))}

        <DockDivider />

        {/* Deep Talk 버튼 */}
        <div
          onClick={() => router.push('/orb/deep-talk')}
          onMouseEnter={() => setDtHovered(true)}
          onMouseLeave={() => { setDtHovered(false); setDtPressed(false); }}
          onMouseDown={() => setDtPressed(true)}
          onMouseUp={() => setDtPressed(false)}
          title="Deep Talk"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: dtPressed
              ? 'rgba(0,0,0,0.10)'
              : dtHovered
                ? 'rgba(0,0,0,0.06)'
                : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: dtHovered ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
            cursor: 'pointer',
            transition: 'all 120ms ease',
            transform: dtPressed
              ? 'scale(0.88)'
              : dtHovered
                ? 'translateY(-4px) scale(1.10)'
                : 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: 0,
          }}
        >
          ◉
        </div>
      </div>
    </div>
  );
}

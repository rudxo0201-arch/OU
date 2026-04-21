'use client';

import { CSSProperties, useState } from 'react';
import { useRouter } from 'next/navigation';

interface OrbItem {
  slug: string;
  label: string;
  icon: string;
  href?: string;
}

const DEFAULT_ORBS: OrbItem[] = [
  { slug: 'note',     label: '노트',   icon: '✎' },
  { slug: 'calendar', label: '캘린더', icon: '◫' },
  { slug: 'task',     label: '할 일',  icon: '✓' },
  { slug: 'finance',  label: '가계부', icon: '◈' },
  { slug: 'habit',    label: '습관',   icon: '⟳' },
  { slug: 'idea',     label: '아이디어', icon: '✦' },
];

interface OrbIconProps {
  orb: OrbItem;
  onClick?: () => void;
}

function OrbIcon({ orb, onClick }: OrbIconProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  const iconBoxStyle: CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: 'var(--ou-radius-card)',
    background: pressed
      ? 'var(--ou-glass-active)'
      : hovered
        ? 'var(--ou-glass-hover)'
        : 'var(--ou-glass)',
    backdropFilter: 'var(--ou-blur-light)',
    WebkitBackdropFilter: 'var(--ou-blur-light)',
    border: `1px solid ${hovered ? 'var(--ou-glass-border-hover)' : 'var(--ou-glass-border)'}`,
    boxShadow: hovered ? `var(--ou-shadow-md), var(--ou-accent-glow)` : 'var(--ou-shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    color: hovered ? 'var(--ou-accent)' : 'var(--ou-text-body)',
    transition: 'all var(--ou-transition-fast)',
    transform: pressed ? 'scale(0.93)' : hovered ? 'translateY(-2px)' : 'none',
  };

  const labelStyle: CSSProperties = {
    fontSize: 'var(--ou-text-xs)',
    color: 'var(--ou-text-secondary)',
    fontWeight: 500,
    letterSpacing: '0.01em',
  };

  return (
    <div
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      <div style={iconBoxStyle}>{orb.icon}</div>
      <span style={labelStyle}>{orb.label}</span>
    </div>
  );
}

interface OrbGridProps {
  orbs?: OrbItem[];
}

export function OrbGrid({ orbs = DEFAULT_ORBS }: OrbGridProps) {
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'flex-start',
      }}
      className="ou-stagger"
    >
      {orbs.map((orb) => (
        <OrbIcon
          key={orb.slug}
          orb={orb}
          onClick={() => router.push(`/orb/${orb.slug}`)}
        />
      ))}
    </div>
  );
}

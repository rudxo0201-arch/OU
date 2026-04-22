'use client';

import { CSSProperties, useState } from 'react';
import { useRouter } from 'next/navigation';

interface OrbItem {
  slug: string;
  label: string;
  icon: string;
}

const DEFAULT_ORBS: OrbItem[] = [
  { slug: 'note',     label: '노트',    icon: '✎' },
  { slug: 'calendar', label: '캘린더',  icon: '◫' },
  { slug: 'task',     label: '할 일',   icon: '✓' },
  { slug: 'finance',  label: '가계부',  icon: '◈' },
  { slug: 'habit',    label: '습관',    icon: '⟳' },
  { slug: 'idea',     label: '아이디어', icon: '✦' },
];

function OrbIcon({ orb, onClick }: { orb: OrbItem; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  const boxStyle: CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: pressed
      ? 'rgba(255,255,255,1)'
      : hovered
        ? 'rgba(255,255,255,1)'
        : 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: hovered
      ? '0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.12)'
      : '0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.07)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: hovered ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.52)',
    transition: 'all 140ms ease',
    transform: pressed ? 'scale(0.92)' : hovered ? 'translateY(-3px) scale(1.04)' : 'none',
  };

  const labelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: hovered ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.36)',
    letterSpacing: '0.01em',
    transition: 'color 140ms ease',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={wrapStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      <div style={boxStyle}>{orb.icon}</div>
      <span style={labelStyle}>{orb.label}</span>
    </div>
  );
}

export function OrbGrid({ orbs = DEFAULT_ORBS }: { orbs?: OrbItem[] }) {
  const router = useRouter();

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'nowrap',
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CSSProperties, useState } from 'react';

interface SideItem {
  href: string;
  icon: string;
  label: string;
  match?: (p: string) => boolean;
}

const ITEMS: SideItem[] = [
  {
    href: '/home',
    icon: '⌂',
    label: 'Home',
    match: (p) => p === '/home',
  },
  {
    href: '/universe',
    icon: '◉',
    label: 'Universe',
    match: (p) => p.startsWith('/universe'),
  },
  {
    href: '/orbit',
    icon: '○',
    label: 'Orbit',
    match: (p) => p.startsWith('/orbit'),
  },
];

const BOTTOM_ITEMS: SideItem[] = [
  {
    href: '/orb/settings',
    icon: '⚙',
    label: 'Settings',
    match: (p) => p.startsWith('/settings'),
  },
];

function SideBtn({ item, active }: { item: SideItem; active: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const btnStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 17,
    cursor: 'pointer',
    transition: 'all 140ms ease',
    position: 'relative',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    background: active
      ? 'rgba(0,0,0,0.88)'
      : hovered
        ? 'rgba(255,255,255,0.75)'
        : 'transparent',
    color: active
      ? '#fff'
      : hovered
        ? 'rgba(0,0,0,0.78)'
        : 'rgba(0,0,0,0.36)',
    boxShadow: active
      ? '0 2px 8px rgba(0,0,0,0.18)'
      : hovered
        ? '0 1px 4px rgba(0,0,0,0.08)'
        : 'none',
    transform: pressed ? 'scale(0.90)' : 'none',
  };

  return (
    <Link href={item.href} title={item.label}>
      <div
        style={btnStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
      >
        {item.icon}

        {/* 호버 툴팁 */}
        {hovered && !active && (
          <span style={{
            position: 'absolute',
            left: 'calc(100% + 10px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.88)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 999,
            letterSpacing: '0.02em',
          }}>
            {item.label}
          </span>
        )}
      </div>
    </Link>
  );
}

export function SideBar() {
  const pathname = usePathname();

  const barStyle: CSSProperties = {
    position: 'fixed',
    top: 56,          /* TopNavBar height */
    left: 0,
    bottom: 0,
    width: 60,
    zIndex: 150,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    background: 'rgba(228,228,234,0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(0,0,0,0.06)',
  };

  return (
    <aside style={barStyle}>
      {/* 상단 아이템 */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {ITEMS.map((item) => (
          <SideBtn
            key={item.href}
            item={item}
            active={item.match ? item.match(pathname) : pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* 하단 아이템 */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {BOTTOM_ITEMS.map((item) => (
          <SideBtn
            key={item.href}
            item={item}
            active={item.match ? item.match(pathname) : pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </aside>
  );
}

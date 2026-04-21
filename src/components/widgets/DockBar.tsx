'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Note, CalendarBlank, CheckSquare, CurrencyKrw, Fire, Lightbulb,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

const BASE_SIZE = 40;
const ORB_SIZE  = 52;
const MAX_SCALE = 1.45;
const SPREAD    = 2.2;

function getMagnification(index: number, mouseIndex: number): number {
  if (mouseIndex < 0) return 1;
  const dist = Math.abs(index - mouseIndex);
  if (dist > SPREAD) return 1;
  const t = 1 - dist / SPREAD;
  return 1 + (MAX_SCALE - 1) * Math.cos((1 - t) * Math.PI / 2) ** 2;
}

// ORB 중앙 아이콘
function OrbIcon() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      background: 'var(--ou-accent)',
      boxShadow: '0 0 8px 2px color-mix(in srgb, var(--ou-accent) 50%, transparent)',
    }} />
  );
}

// 앱 아이콘 매핑 (Phosphor icon name → component)
const ICON_MAP: Record<string, PhosphorIcon> = {
  Note:          Note,
  CalendarBlank: CalendarBlank,
  CheckSquare:   CheckSquare,
  CurrencyKrw:   CurrencyKrw,
  Fire:          Fire,
  Lightbulb:     Lightbulb,
};

// 독에 표시할 앱 목록 (Tier 1~3)
const DOCK_APPS = [
  { slug: 'note',     label: 'Note',     icon: 'Note',          route: '/note/new' },
  { slug: 'calendar', label: 'Calendar', icon: 'CalendarBlank', route: '/app/calendar' },
  { slug: 'todo',     label: 'Todo',     icon: 'CheckSquare',   route: '/app/todo' },
  // ORB (중앙 — 코드상 여기 삽입)
  { slug: 'finance',  label: 'Finance',  icon: 'CurrencyKrw',   route: '/app/finance' },
  { slug: 'habit',    label: 'Habit',    icon: 'Fire',          route: '/app/habit' },
  { slug: 'idea',     label: 'Idea',     icon: 'Lightbulb',     route: '/app/idea' },
];

// ORB를 앱 목록 중앙에 끼워서 최종 아이템 배열 생성
type DockItem =
  | { kind: 'app'; slug: string; label: string; icon: string; route: string }
  | { kind: 'orb' };

function buildItems(): DockItem[] {
  const left  = DOCK_APPS.slice(0, 3);
  const right = DOCK_APPS.slice(3);
  return [
    ...left.map(a  => ({ kind: 'app' as const, ...a })),
    { kind: 'orb' as const },
    ...right.map(a => ({ kind: 'app' as const, ...a })),
  ];
}

const ITEMS = buildItems();

export function DockBar() {
  const [mouseIndex, setMouseIndex] = useState(-1);
  const dockRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number | null>(null);
  const router  = useRouter();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dockRef.current || rafRef.current !== null) return;
    const clientX = e.clientX;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!dockRef.current) return;
      const rect = dockRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      setMouseIndex(x / (rect.width / ITEMS.length));
    });
  }, []);

  const handleClick = useCallback((item: DockItem) => {
    if (item.kind === 'orb') {
      router.push('/orb');
    } else {
      router.push(item.route);
    }
  }, [router]);

  return (
    <div
      ref={dockRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMouseIndex(-1)}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: 6,
        padding: '10px 20px 12px',
        borderRadius: 'var(--ou-radius-lg)',
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-lg)',
      }}
    >
      {ITEMS.map((item, i) => {
        const scale    = getMagnification(i, mouseIndex);
        const isOrb    = item.kind === 'orb';
        const baseSize = isOrb ? ORB_SIZE : BASE_SIZE;
        const size     = baseSize * scale;
        const isHovered = Math.abs(i - mouseIndex) < 0.5;

        const Icon = item.kind === 'app' ? ICON_MAP[item.icon] : null;
        const label = item.kind === 'app' ? item.label : 'ORB';

        return (
          <div
            key={item.kind === 'orb' ? 'orb' : item.slug}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              position: 'relative',
              transform: `translateY(${isHovered && mouseIndex >= 0 ? -4 * (scale - 1) / (MAX_SCALE - 1) : 0}px)`,
              transition: 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* 툴팁 */}
            {isHovered && mouseIndex >= 0 && (
              <div style={{
                position: 'absolute', bottom: '100%', left: '50%',
                transform: 'translateX(-50%)', marginBottom: 8,
                padding: '3px 9px', borderRadius: 6,
                background: 'var(--ou-bg)', border: '1px solid var(--ou-border-subtle)',
                fontSize: 11, color: 'var(--ou-text-body)', whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>
                {label}
              </div>
            )}

            <button
              onClick={() => handleClick(item)}
              style={{
                width: size, height: size,
                borderRadius: '50%',
                background: 'var(--ou-bg)',
                border: 'none',
                boxShadow: isHovered && mouseIndex >= 0
                  ? 'var(--ou-neu-raised-lg)'
                  : 'var(--ou-neu-raised-md)',
                transition: 'width 120ms cubic-bezier(0.34,1.56,0.64,1), height 120ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 120ms ease',
                cursor: 'pointer',
                flexShrink: 0,
                color: 'var(--ou-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isOrb
                ? <OrbIcon />
                : Icon && <Icon size={Math.round(size * 0.42)} weight="regular" />
              }
            </button>

            <span style={{
              fontSize: 9,
              color: isOrb ? 'var(--ou-text-muted)' : 'var(--ou-text-disabled)',
              marginTop: 3, letterSpacing: '0.3px',
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

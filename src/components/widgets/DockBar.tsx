'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { YoutubeLogo } from '@phosphor-icons/react';

interface Props {
  onUniverse: () => void;
  universeActive?: boolean;
}

const BASE_ITEMS = [
  { id: 'universe', label: '유니버스', size: 52, icon: null },
  { id: 'youtube', label: 'YouTube', size: 44, icon: <YoutubeLogo size={20} weight="fill" /> },
];

const BASE_SIZE = 44;
const MAX_SCALE = 1.6;
const SPREAD = 2;

function getMagnification(index: number, mouseIndex: number): number {
  if (mouseIndex < 0) return 1;
  const dist = Math.abs(index - mouseIndex);
  if (dist > SPREAD) return 1;
  const t = 1 - dist / SPREAD;
  return 1 + (MAX_SCALE - 1) * Math.cos((1 - t) * Math.PI / 2) ** 2;
}

export function DockBar({ onUniverse, universeActive }: Props) {
  const [mouseIndex, setMouseIndex] = useState(-1);
  const dockRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const router = useRouter();

  const ITEMS = useMemo(() => [...BASE_ITEMS], []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dockRef.current || rafRef.current !== null) return;
    const clientX = e.clientX;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!dockRef.current) return;
      const rect = dockRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const itemWidth = rect.width / ITEMS.length;
      setMouseIndex(x / itemWidth);
    });
  }, [ITEMS.length]);

  const handleClick = useCallback((id: string) => {
    if (id === 'universe') onUniverse();
    if (id === 'youtube') router.push('/youtube');
  }, [onUniverse, router]);

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
        transition: 'opacity 300ms ease, transform 300ms ease',
      }}
    >
      {ITEMS.map((item, i) => {
        const scale = getMagnification(i, mouseIndex);
        const isUniverse = item.id === 'universe';
        const isHovered = Math.abs(i - mouseIndex) < 0.5;
        const size = (isUniverse ? 52 : BASE_SIZE) * scale;
        const isActive = isUniverse && universeActive;

        return (
          <div key={item.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Tooltip */}
            {isHovered && mouseIndex >= 0 && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 8,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-sm)',
                fontSize: 11,
                color: 'var(--ou-text-body)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                animation: 'ou-fade-in 0.1s ease',
              }}>
                {item.label}
              </div>
            )}

            {/* Orb */}
            <button
              onClick={() => handleClick(item.id)}
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'var(--ou-bg)',
                border: 'none',
                boxShadow: isActive
                  ? `var(--ou-neu-pressed-md), 0 0 16px 4px color-mix(in srgb, var(--ou-accent) 30%, transparent)`
                  : isHovered && mouseIndex >= 0
                    ? 'var(--ou-neu-raised-lg)'
                    : 'var(--ou-neu-raised-md)',
                transition: 'width 200ms cubic-bezier(0.34, 1.56, 0.64, 1), height 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease',
                cursor: 'pointer',
                flexShrink: 0,
                color: isActive ? 'var(--ou-accent)' : 'var(--ou-text-muted)',
                fontSize: isUniverse ? 20 : 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--ou-font-mono)',
              }}
            >
              {item.icon}
            </button>

            {/* Active dot */}
            {isActive && (
              <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--ou-accent)',
                marginTop: 4,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

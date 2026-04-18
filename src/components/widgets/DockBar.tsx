'use client';

import { useState, useCallback, useRef } from 'react';

interface Props {
  onUniverse: () => void;
  universeActive?: boolean;
}

const ITEMS = [
  { id: 'settings', label: '설정', size: 40 },
  { id: 'universe', label: '유니버스', size: 52 },
  { id: 'add', label: '추가', size: 40 },
];

const BASE_SIZE = 44;
const MAX_SCALE = 1.6;
const SPREAD = 2; // how many neighbors are affected

function getMagnification(index: number, mouseIndex: number): number {
  if (mouseIndex < 0) return 1;
  const dist = Math.abs(index - mouseIndex);
  if (dist > SPREAD) return 1;
  // Cosine falloff
  const t = 1 - dist / SPREAD;
  return 1 + (MAX_SCALE - 1) * Math.cos((1 - t) * Math.PI / 2) ** 2;
}

export function DockBar({ onUniverse, universeActive }: Props) {
  const [mouseIndex, setMouseIndex] = useState(-1);
  const [dockVisible, setDockVisible] = useState(true);
  const dockRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const itemWidth = rect.width / ITEMS.length;
    const idx = x / itemWidth;
    setMouseIndex(idx);
  }, []);

  const handleClick = useCallback((id: string) => {
    if (id === 'universe') onUniverse();
    if (id === 'settings') window.location.href = '/settings';
  }, [onUniverse]);

  return (
    <div
      ref={dockRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMouseIndex(-1)}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: 4,
        padding: '8px 16px 10px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
        transition: 'opacity 300ms ease, transform 300ms ease',
      }}
    >
      {ITEMS.map((item, i) => {
        const scale = getMagnification(i, mouseIndex);
        const isUniverse = item.id === 'universe';
        const isHovered = Math.abs(i - mouseIndex) < 0.5;
        const size = (isUniverse ? 52 : BASE_SIZE) * scale;

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
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.7)',
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
                border: 'none',
                background: isUniverse
                  ? universeActive
                    ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25), rgba(255,255,255,0.05) 70%)'
                    : 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), rgba(255,255,255,0.03) 70%)'
                  : item.id === 'add'
                    ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 70%)'
                    : 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.12), rgba(255,255,255,0.03) 70%)',
                boxShadow: isUniverse && universeActive
                  ? '0 0 24px 6px rgba(255,255,255,0.12), inset 0 0 12px rgba(255,255,255,0.08)'
                  : isHovered && mouseIndex >= 0
                    ? '0 0 16px 3px rgba(255,255,255,0.08)'
                    : '0 0 6px 1px rgba(255,255,255,0.03)',
                transition: 'width 200ms cubic-bezier(0.34, 1.56, 0.64, 1), height 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease',
                cursor: 'pointer',
                animation: isUniverse && universeActive ? 'universe-pulse 3s ease-in-out infinite' : undefined,
                flexShrink: 0,
              }}
            />

            {/* Active dot indicator */}
            {isUniverse && universeActive && (
              <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: 'rgba(255,255,255,0.5)',
                marginTop: 4,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

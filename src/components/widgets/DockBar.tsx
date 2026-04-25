'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  onAddWidget?: () => void;
  onUniverse?: () => void;
  universeActive?: boolean;
}

const BASE_SIZE = 44;
const ORB_SIZE = 52;
const MAX_SCALE = 1.5;
const SPREAD = 2;

function getMagnification(index: number, mouseIndex: number): number {
  if (mouseIndex < 0) return 1;
  const dist = Math.abs(index - mouseIndex);
  if (dist > SPREAD) return 1;
  const t = 1 - dist / SPREAD;
  return 1 + (MAX_SCALE - 1) * Math.cos((1 - t) * Math.PI / 2) ** 2;
}

// 아이콘 SVG (인라인)
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/>
      <line x1="8.5" y1="10.5" x2="15.5" y2="7.5"/><line x1="8.5" y1="13.5" x2="15.5" y2="16.5"/>
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

// ORB 중앙 아이콘 (accent dot)
function OrbIcon() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      background: 'var(--ou-accent)',
      boxShadow: '0 0 8px 2px color-mix(in srgb, var(--ou-accent) 50%, transparent)',
    }} />
  );
}

export function DockBar({ onAddWidget, onUniverse, universeActive }: Props) {
  const [mouseIndex, setMouseIndex] = useState(-1);
  const dockRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const router = useRouter();

  const ITEMS = useMemo(() => [
    { id: 'settings', label: '설정', isOrb: false, disabled: false },
    { id: 'universe', label: '우주', isOrb: false, disabled: false },
    { id: 'orb', label: 'ORB', isOrb: true, disabled: false },
    { id: 'add', label: '추가', isOrb: false, disabled: false },
  ], []);

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
    switch (id) {
      case 'settings': router.push('/settings'); break;
      case 'universe': onUniverse?.(); break;
      case 'orb': router.push('/home'); break;
      case 'add': onAddWidget?.() ?? window.dispatchEvent(new CustomEvent('dock-add-widget')); break;
    }
  }, [onAddWidget, onUniverse, router]);

  function renderIcon(id: string) {
    switch (id) {
      case 'settings': return <GearIcon />;
      case 'universe': return <GraphIcon />;
      case 'orb': return <OrbIcon />;
      case 'dictionary': return <BookIcon />;
      case 'memory': return <ClockIcon />;
      case 'add': return <PlusIcon />;
      default: return null;
    }
  }

  return (
    <div
      ref={dockRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMouseIndex(-1)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 20px 10px',
        borderRadius: 'var(--ou-radius-lg)',
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-lg)',
      }}
    >
      {ITEMS.map((item, i) => {
        const scale = getMagnification(i, mouseIndex);
        const baseSize = item.isOrb ? ORB_SIZE : BASE_SIZE;
        const size = baseSize * scale;
        const isHovered = Math.abs(i - mouseIndex) < 0.5;

        return (
          <div
            key={item.id}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
              transform: item.disabled && isHovered && mouseIndex >= 0 ? 'translateY(-5px)' : 'translateY(0)',
              transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
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
                border: '1px solid var(--ou-border-subtle)',
                fontSize: 11,
                color: 'var(--ou-text-body)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>
                {item.disabled ? '준비중입니다' : item.label}
              </div>
            )}

            <button
              onClick={item.disabled ? undefined : () => handleClick(item.id)}
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'var(--ou-bg)',
                border: 'none',
                boxShadow: (item.id === 'universe' && universeActive)
                  ? 'var(--ou-neu-pressed-md)'
                  : isHovered && mouseIndex >= 0
                    ? 'var(--ou-neu-raised-lg)'
                    : 'var(--ou-neu-raised-md)',
                transition: 'width 150ms cubic-bezier(0.34, 1.56, 0.64, 1), height 150ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 150ms ease',
                cursor: item.disabled ? 'default' : 'pointer',
                flexShrink: 0,
                color: 'var(--ou-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: item.disabled ? 0.5 : 1,
              }}
            >
              {renderIcon(item.id)}
            </button>

            {/* 라벨 */}
            <span style={{
              fontSize: 10,
              color: item.id === 'orb' ? 'var(--ou-text-muted)' : 'var(--ou-text-disabled)',
              marginTop: 3,
              letterSpacing: '0.5px',
            }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

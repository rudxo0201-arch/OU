'use client';

import { useState, useRef, useEffect } from 'react';
import { PushPin, PushPinSlash, ArrowsOutSimple } from '@phosphor-icons/react';

export interface OrbItem {
  id: string;
  label: string;
  emoji?: string;
  pinned?: boolean;
  active?: boolean;
  onClick?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
}

interface OrbDockProps {
  side: 'left' | 'right';
  items: OrbItem[];
  orbSize?: number;
}

export function OrbDock({ side, items, orbSize = 48 }: OrbDockProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        transform: 'translateY(-50%)',
        [side]: 24,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {items.map(item => (
        <div key={item.id} style={{ position: 'relative' }} ref={menuOpenId === item.id ? menuRef : undefined}>
          <button
            title={item.label}
            onClick={item.onClick}
            onContextMenu={e => {
              e.preventDefault();
              setMenuOpenId(menuOpenId === item.id ? null : item.id);
            }}
            style={{
              width: orbSize,
              height: orbSize,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--ou-orb-bg)',
              backdropFilter: 'blur(var(--ou-glass-blur))',
              WebkitBackdropFilter: 'blur(var(--ou-glass-blur))',
              border: '0.5px solid var(--ou-orb-border)',
              transition: 'all 150ms ease',
              boxShadow: item.pinned ? '0 0 16px 2px var(--ou-orb-glow)' : 'none',
              opacity: item.pinned ? 1 : 0.6,
              cursor: 'pointer',
              padding: 0,
              fontSize: 18,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.boxShadow = '0 0 20px 4px var(--ou-orb-glow)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = item.pinned ? '0 0 16px 2px var(--ou-orb-glow)' : 'none';
            }}
          >
            {item.emoji || '\uD83D\uDCC4'}
          </button>

          {menuOpenId === item.id && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                [side === 'right' ? 'right' : 'left']: orbSize + 8,
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid #e5e7eb',
                minWidth: 140,
                padding: '4px 0',
                zIndex: 20,
              }}
            >
              <button
                onClick={() => { item.onClick?.(); setMenuOpenId(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', border: 'none', background: 'none',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left',
                }}
              >
                <ArrowsOutSimple size={14} /> 열기
              </button>
              {item.pinned ? (
                <button
                  onClick={() => { item.onUnpin?.(); setMenuOpenId(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  }}
                >
                  <PushPinSlash size={14} /> 바로가기 해제
                </button>
              ) : (
                <button
                  onClick={() => { item.onPin?.(); setMenuOpenId(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 12px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  }}
                >
                  <PushPin size={14} /> 바로가기 고정
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

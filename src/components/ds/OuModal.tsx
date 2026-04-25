'use client';

import { CSSProperties, ReactNode, useEffect, useRef } from 'react';
import { OuButton } from './OuButton';

export interface OuModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** panel width — number (px) or CSS string */
  width?: number | string;
  /** alias for width (backward compat with OuModal) */
  maxWidth?: number | string;
  showClose?: boolean;
  style?: CSSProperties;
}

export function OuModal({ open, onClose, children, title, width, maxWidth, showClose = true, style }: OuModalProps) {
  const resolvedWidth = width ?? maxWidth ?? 480;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const panelWidth = typeof resolvedWidth === 'number' ? `${resolvedWidth}px` : resolvedWidth;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'ou-fade-in 200ms ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--ou-surface)',
          border: '1px solid var(--ou-glass-border-hover)',
          borderRadius: 'var(--ou-radius-lg)',
          boxShadow: 'var(--ou-shadow-lg)',
          width: panelWidth,
          maxWidth: '100%',
          maxHeight: '90dvh',
          overflowY: 'auto',
          animation: 'ou-scale-in 200ms cubic-bezier(0.16,1,0.3,1)',
          ...style,
        }}
      >
        {(title || showClose) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 0',
            }}
          >
            {title && (
              <h3 style={{ margin: 0, fontSize: 'var(--ou-text-base)', fontWeight: 700, color: 'var(--ou-text-heading)' }}>
                {title}
              </h3>
            )}
            {showClose && (
              <OuButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                style={{ padding: '0 8px', height: 28, minWidth: 0, marginLeft: 'auto' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </OuButton>
            )}
          </div>
        )}
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

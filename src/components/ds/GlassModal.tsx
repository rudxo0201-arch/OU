'use client';

import { CSSProperties, ReactNode, useEffect } from 'react';

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  width?: number | string;
}

export function GlassModal({ open, onClose, children, title, width = 480 }: GlassModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const backdropStyle: CSSProperties = {
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
  };

  const panelStyle: CSSProperties = {
    background: 'var(--ou-glass-elevated)',
    backdropFilter: 'var(--ou-blur)',
    WebkitBackdropFilter: 'var(--ou-blur)',
    border: '1px solid var(--ou-glass-border-hover)',
    borderRadius: 'var(--ou-radius-lg)',
    boxShadow: 'var(--ou-shadow-lg)',
    width: typeof width === 'number' ? `${width}px` : width,
    maxWidth: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    animation: 'ou-scale-in 200ms cubic-bezier(0.16,1,0.3,1)',
  };

  return (
    <div style={backdropStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={panelStyle}>
        {title && (
          <div style={{
            padding: '20px 24px 0',
            fontSize: 'var(--ou-text-lg)',
            fontWeight: 600,
            color: 'var(--ou-text-heading)',
          }}>
            {title}
          </div>
        )}
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

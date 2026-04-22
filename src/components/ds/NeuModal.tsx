'use client';
import { CSSProperties, ReactNode, useEffect, useRef } from 'react';
import { NeuButton } from './NeuButton';
import { NeuCard } from './NeuCard';

interface NeuModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: number;
  showClose?: boolean;
  style?: CSSProperties;
}

export function NeuModal({ open, onClose, title, children, maxWidth = 480, showClose = true, style }: NeuModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

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
        padding: '16px',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'ou-fade-in 0.15s ease',
      }}
    >
      <NeuCard
        variant="raised"
        size="lg"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '90dvh',
          overflow: 'auto',
          animation: 'ou-scale-in 0.15s ease',
          ...style,
        }}
      >
        {(title || showClose) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            {title && (
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ou-text-heading)' }}>
                {title}
              </h3>
            )}
            {showClose && (
              <NeuButton variant="ghost" size="sm" onClick={onClose} style={{ padding: '4px 8px', minWidth: 0, marginLeft: 'auto' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </NeuButton>
            )}
          </div>
        )}
        {children}
      </NeuCard>
    </div>
  );
}

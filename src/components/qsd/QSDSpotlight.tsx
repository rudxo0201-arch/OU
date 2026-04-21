'use client';

import { useEffect, useRef } from 'react';
import { QSDTabs } from './QSDTabs';

interface QSDSpotlightProps {
  open: boolean;
  onClose: () => void;
}

export function QSDSpotlight({ open, onClose }: QSDSpotlightProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
        animation: 'ou-fade-in 120ms ease',
      }}
    >
      <div style={{
        width: '90vw',
        maxWidth: 560,
        animation: 'ou-slide-up 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <QSDTabs />
      </div>
    </div>
  );
}

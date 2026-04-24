'use client';

import { NeuButton } from '@/components/ds';
import type { ProtocolEvent } from '@/lib/protocol/engine';

interface Props {
  event: ProtocolEvent;
  onAccept: () => void;
  onDismiss: () => void;
}

export function AnnouncementModal({ event, onAccept, onDismiss }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.18)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'ou-fade-in 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--ou-bg)',
          borderRadius: 'var(--ou-radius-lg)',
          boxShadow: 'var(--ou-neu-raised-lg)',
          padding: '32px 28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          animation: 'ou-scale-in 0.18s ease',
        }}
      >
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--ou-text-heading)',
          letterSpacing: '-0.02em',
        }}>
          {event.title}
        </h3>
        <p style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--ou-text-secondary)',
        }}>
          {event.body}
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 8,
        }}>
          <NeuButton variant="ghost" size="sm" onClick={onDismiss}>
            나중에
          </NeuButton>
          <NeuButton variant="accent" size="sm" onClick={onAccept}>
            {event.cta}
          </NeuButton>
        </div>
      </div>
    </div>
  );
}

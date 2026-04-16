'use client';

import { useState } from 'react';
import { ShareNetwork } from '@phosphor-icons/react';
import { ShareModal } from './ShareModal';

interface ShareButtonProps {
  nodeId: string;
  viewType?: string;
  title?: string;
}

export function ShareButton({ nodeId, viewType, title }: ShareButtonProps) {
  const [modalOpened, setModalOpened] = useState(false);

  const getShareUrl = () => {
    return `${window.location.origin}/view/${nodeId}`;
  };

  const handleClick = async () => {
    const url = getShareUrl();

    // Mobile: use native share if available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title ?? 'OU',
          url,
        });
        return;
      } catch {
        // User cancelled or share failed -- fall through to modal
      }
    }

    // Desktop: open share modal
    setModalOpened(true);
  };

  return (
    <>
      <button
        title="공유"
        onClick={handleClick}
        style={{
          background: 'none',
          border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
          borderRadius: 999,
          cursor: 'pointer',
          color: 'var(--ou-text-muted, rgba(255,255,255,0.5))',
          padding: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
        }}
      >
        <ShareNetwork size={18} weight="light" />
      </button>

      <ShareModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        nodeId={nodeId}
        title={title}
      />
    </>
  );
}

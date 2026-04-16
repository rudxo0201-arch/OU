'use client';

import { useState } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { ShareNetwork } from '@phosphor-icons/react';
import { notifications } from '@mantine/notifications';
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
        // User cancelled or share failed — fall through to modal
      }
    }

    // Desktop: open share modal
    setModalOpened(true);
  };

  return (
    <>
      <Tooltip label="공유" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={handleClick}
          style={{
            border: '0.5px solid var(--mantine-color-default-border)',
            borderRadius: 999,
          }}
        >
          <ShareNetwork size={18} weight="light" />
        </ActionIcon>
      </Tooltip>

      <ShareModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        nodeId={nodeId}
        title={title}
      />
    </>
  );
}

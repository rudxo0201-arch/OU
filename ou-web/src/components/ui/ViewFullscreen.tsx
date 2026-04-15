'use client';

import { useEffect } from 'react';
import { Box, ActionIcon, Text, Group } from '@mantine/core';
import { X } from '@phosphor-icons/react';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { useNavigationStore } from '@/stores/navigationStore';

interface ViewFullscreenProps {
  view: any;
  nodes: any[];
  onClose: () => void;
}

export function ViewFullscreen({ view, nodes, onClose }: ViewFullscreenProps) {
  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredNodes = nodes.filter(n => {
    if (view.filter_config?.domain) {
      return n.domain === view.filter_config.domain;
    }
    return true;
  });

  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        background: 'var(--ou-glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: 'ou-scale-in 200ms ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Group
        justify="space-between"
        style={{
          padding: '12px 24px',
          borderBottom: '0.5px solid var(--ou-glass-border)',
          flexShrink: 0,
        }}
      >
        <Text size="sm" fw={600}>{view.name || view.view_type}</Text>
        <ActionIcon variant="subtle" color="gray" size="md" onClick={onClose}>
          <X size={20} />
        </ActionIcon>
      </Group>

      {/* Content */}
      <Box style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <ViewRenderer
          viewType={view.view_type}
          nodes={filteredNodes}
          filters={view.filter_config}
          layoutConfig={view.layout_config}
        />
      </Box>
    </Box>
  );
}

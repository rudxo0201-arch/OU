'use client';

import { Box } from '@mantine/core';
import { VIEW_REGISTRY } from './registry';
import type { LayoutConfig } from '@/types/layout-config';

interface ViewRendererProps {
  viewType: string;
  nodes: any[];
  filters?: Record<string, any>;
  onSave?: () => void;
  inline?: boolean;
  layoutConfig?: LayoutConfig;
}

export function ViewRenderer({ viewType, nodes, filters, onSave, inline, layoutConfig }: ViewRendererProps) {
  const View = VIEW_REGISTRY[viewType];

  // 필터 원칙: 빈 뷰 표시 금지
  if (!nodes || nodes.length === 0) return null;

  if (!View) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[ViewRenderer] 등록되지 않은 뷰 타입: ${viewType}`);
    }
    return null;
  }

  return (
    <Box
      style={inline ? {
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        overflow: 'hidden',
        maxHeight: 400,
      } : undefined}
    >
      <View nodes={nodes} filters={filters} onSave={onSave} layoutConfig={layoutConfig} />
    </Box>
  );
}

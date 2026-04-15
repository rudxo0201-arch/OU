'use client';

import { Component, type ReactNode } from 'react';
import { Box, Stack, Text, Button } from '@mantine/core';
import { WarningCircle } from '@phosphor-icons/react';
import * as Sentry from '@sentry/nextjs';
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

/** 뷰 크래시 방지 에러 바운더리 */
class ViewErrorBoundary extends Component<
  { children: ReactNode; viewType: string },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: ReactNode; viewType: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error, { tags: { viewType: this.props.viewType } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Stack align="center" justify="center" h="100%" mih={200} gap="sm" p="xl">
          <WarningCircle size={32} color="var(--mantine-color-red-5)" />
          <Text fz="sm" c="dimmed" ta="center">뷰를 표시할 수 없습니다</Text>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Text fz={10} c="red" ta="center" maw={400} style={{ fontFamily: 'monospace' }}>
              {this.state.error}
            </Text>
          )}
          <Button
            size="xs"
            variant="subtle"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            다시 시도
          </Button>
        </Stack>
      );
    }
    return this.props.children;
  }
}

export function ViewRenderer({ viewType, nodes, filters, onSave, inline, layoutConfig }: ViewRendererProps) {
  // 하위 호환: pdf → document
  const resolvedType = viewType === 'pdf' || viewType === 'export' ? 'document' : viewType;
  const View = VIEW_REGISTRY[resolvedType];

  // 필터 원칙: 빈 뷰 표시 금지
  if (!nodes || nodes.length === 0) return null;

  if (!View) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[ViewRenderer] 등록되지 않은 뷰 타입: ${viewType}`);
    }
    return null;
  }

  return (
    <ViewErrorBoundary viewType={resolvedType}>
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
    </ViewErrorBoundary>
  );
}

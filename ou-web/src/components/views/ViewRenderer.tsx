'use client';

import { Component, type ReactNode } from 'react';
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, gap: 8, padding: 24 }}>
          <WarningCircle size={32} color="var(--mantine-color-red-5)" />
          <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)', textAlign: 'center' }}>뷰를 표시할 수 없습니다</span>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <span style={{ fontSize: 10, color: 'var(--mantine-color-red-5)', textAlign: 'center', maxWidth: 400, fontFamily: 'monospace' }}>
              {this.state.error}
            </span>
          )}
          <button
            style={{ padding: '4px 12px', fontSize: 'var(--mantine-font-size-xs)', background: 'transparent', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', cursor: 'pointer', color: 'inherit' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            다시 시도
          </button>
        </div>
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
      <div
        style={inline ? {
          border: '0.5px solid var(--mantine-color-default-border)',
          borderRadius: 8,
          overflow: 'hidden',
          maxHeight: 400,
        } : undefined}
      >
        <View nodes={nodes} filters={filters} onSave={onSave} layoutConfig={layoutConfig} />
      </div>
    </ViewErrorBoundary>
  );
}

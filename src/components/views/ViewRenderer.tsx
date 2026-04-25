'use client';
import { DOMAINS } from '@/lib/ou-registry';

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
  /** true면 nodes가 비어도 뷰 렌더링 — 뷰 자체가 스켈레톤/빈 상태를 표시 */
  allowEmpty?: boolean;
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
          <WarningCircle size={32} color="var(--ou-text-error, #e03131)" />
          <span style={{ fontSize: '13px', color: 'var(--ou-text-dimmed)', textAlign: 'center' }}>뷰를 표시할 수 없습니다</span>
          {process.env.NODE_ENV === DOMAINS.DEVELOPMENT && this.state.error && (
            <span style={{ fontSize: 10, color: 'var(--ou-text-error, #e03131)', textAlign: 'center', maxWidth: 400, fontFamily: 'monospace' }}>
              {this.state.error}
            </span>
          )}
          <button
            style={{ padding: '4px 12px', fontSize: '12px', background: 'transparent', border: '0.5px solid var(--ou-border-subtle)', borderRadius: '8px', cursor: 'pointer', color: 'inherit' }}
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

export function ViewRenderer({ viewType, nodes, filters, onSave, inline, layoutConfig, allowEmpty }: ViewRendererProps) {
  // 하위 호환: pdf → document
  const resolvedType = viewType === 'pdf' || viewType === 'export' ? 'document' : viewType;
  const View = VIEW_REGISTRY[resolvedType];

  // 배열 보장. allowEmpty=true면 빈 상태도 뷰에 전달 (뷰가 스켈레톤/빈 상태를 직접 렌더링)
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  if (safeNodes.length === 0 && !allowEmpty) return null;

  if (!View) {
    if (process.env.NODE_ENV === DOMAINS.DEVELOPMENT) {
      console.warn(`[ViewRenderer] 등록되지 않은 뷰 타입: ${viewType}`);
    }
    return null;
  }

  return (
    <ViewErrorBoundary viewType={resolvedType}>
      <div
        style={inline ? {
          background: 'var(--ou-glass)',
          backdropFilter: 'var(--ou-blur-light)',
          WebkitBackdropFilter: 'var(--ou-blur-light)',
          border: '1px solid var(--ou-glass-border)',
          borderRadius: 'var(--ou-radius-card)',
          overflow: 'hidden',
          maxHeight: 400,
        } : undefined}
      >
        <View nodes={safeNodes} filters={filters} onSave={onSave} layoutConfig={layoutConfig} />
      </div>
    </ViewErrorBoundary>
  );
}

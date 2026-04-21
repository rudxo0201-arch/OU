'use client';

import { useEffect, useState, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ArrowSquareOut, X } from '@phosphor-icons/react';
import { ViewSwitcher } from './ViewSwitcher';
import { VIEW_REGISTRY } from '../registry';
import dynamic from 'next/dynamic';

const ViewRenderer = dynamic(
  () => import('@/components/views/ViewRenderer').then((m) => m.ViewRenderer),
  { ssr: false }
);

/**
 * OuViewBlock — Tiptap NodeView
 * attrs: { domain, viewType, activeViewType, filterConfig, layoutConfig }
 */
export function OuViewBlock({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { domain, viewType, activeViewType, filterConfig } = node.attrs as {
    domain: string;
    viewType: string;
    activeViewType: string;
    filterConfig: Record<string, unknown>;
  };

  const currentView = activeViewType || viewType;
  const [nodes, setNodes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const params = new URLSearchParams({ domain, limit: '100' });
    if (filterConfig?.dateFrom) params.set('date_from', String(filterConfig.dateFrom));
    if (filterConfig?.dateTo)   params.set('date_to', String(filterConfig.dateTo));

    fetch(`/api/nodes?${params}`)
      .then((r) => r.json())
      .then((data) => setNodes(data.nodes ?? []))
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, [domain, filterConfig]);

  const handleViewSwitch = (vt: string) => {
    updateAttributes({ activeViewType: vt });
  };

  const ViewComponent = VIEW_REGISTRY[currentView];

  return (
    <NodeViewWrapper>
      <div
        style={{
          margin: '8px 0',
          borderRadius: 'var(--ou-radius-md)',
          background: 'var(--ou-bg-alt)',
          boxShadow: selected
            ? `var(--ou-neu-pressed-sm), 0 0 0 2px var(--ou-accent)`
            : 'var(--ou-neu-pressed-sm)',
          overflow: 'hidden',
          transition: 'box-shadow var(--ou-transition)',
        }}
      >
        {/* 헤더 — 뷰 전환 + 제어 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--ou-border-faint)',
          }}
        >
          <ViewSwitcher
            domain={domain}
            activeViewType={currentView}
            onSwitch={handleViewSwitch}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px' }}>
            <a
              href={`/home`}
              title="전체 화면으로 보기"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                border: 'none',
                borderRadius: 'var(--ou-radius-sm)',
                background: 'transparent',
                color: 'var(--ou-text-muted)',
                cursor: 'pointer',
              }}
            >
              <ArrowSquareOut size={13} />
            </a>
            <button
              onClick={deleteNode}
              title="블록 삭제"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                border: 'none',
                borderRadius: 'var(--ou-radius-sm)',
                background: 'transparent',
                color: 'var(--ou-text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* 뷰 본체 */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: 32,
                color: 'var(--ou-text-muted)',
                fontSize: 12,
              }}
            >
              불러오는 중…
            </div>
          ) : nodes.length === 0 ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: 32,
                color: 'var(--ou-text-muted)',
                fontSize: 12,
              }}
            >
              데이터 없음
            </div>
          ) : ViewComponent ? (
            <ViewComponent nodes={nodes as never[]} inline />
          ) : (
            <ViewRenderer viewType={currentView} nodes={nodes as never[]} inline />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

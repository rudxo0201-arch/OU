'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight } from '@phosphor-icons/react';
import { GlassCard } from '@/components/ui/GlassCard';
import { getDomainLabel, getDomainStyle } from '@/lib/utils/domain';

interface NodePreviewCardProps {
  node: {
    id: string;
    domain: string;
    raw?: string;
    importance?: number;
    graph_type?: string;
    confidence?: string;
    domain_data?: Record<string, any>;
  };
  onOpen: () => void;
  onClose: () => void;
}

export function NodePreviewCard({ node, onOpen, onClose }: NodePreviewCardProps) {
  const [tripleCount, setTripleCount] = useState<number | null>(null);
  const [relatedCount, setRelatedCount] = useState<number | null>(null);

  useEffect(() => {
    setTripleCount(null);
    setRelatedCount(null);

    const ac = new AbortController();

    Promise.all([
      fetch(`/api/nodes/${node.id}/triples`, { signal: ac.signal })
        .then(r => r.ok ? r.json() : { triples: [] })
        .then(d => setTripleCount((d.triples ?? []).length))
        .catch(() => setTripleCount(0)),
      fetch(`/api/nodes/${node.id}/relations`, { signal: ac.signal })
        .then(r => r.ok ? r.json() : { relations: [] })
        .then(d => setRelatedCount((d.relations ?? []).length))
        .catch(() => setRelatedCount(0)),
    ]);

    return () => ac.abort();
  }, [node.id]);

  const ds = getDomainStyle(node.domain);
  const loading = tripleCount === null || relatedCount === null;

  return (
    <GlassCard
      p="md"
      style={{
        position: 'absolute',
        right: 24,
        bottom: 80,
        width: 280,
        zIndex: 20,
        animation: 'ou-scale-in 150ms ease',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: ds.borderRadius, background: 'rgba(255,255,255,0.08)', color: 'var(--mantine-color-dimmed)',
            borderStyle: ds.borderStyle, borderWidth: ds.borderWidth, borderColor: 'var(--mantine-color-default-border)', fontWeight: ds.fontWeight,
          }}>
            {node.graph_type === 'star' ? '\u2605' : '\u25CF'} {getDomainLabel(node.domain)}
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-gray-6)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <span style={{ fontSize: 'var(--mantine-font-size-sm)', lineHeight: 1.6, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {node.raw ?? '(내용 없음)'}
        </span>

        {/* Meta counts */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
            {tripleCount! > 0 && <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>관계 {tripleCount}개</span>}
            {relatedCount! > 0 && <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>연결 {relatedCount}개</span>}
            {tripleCount === 0 && relatedCount === 0 && <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>연결 정보 없음</span>}
          </div>
        )}

        {/* Action */}
        <button onClick={onOpen} style={{ width: '100%', padding: '6px 12px', fontSize: 'var(--mantine-font-size-xs)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--mantine-color-dimmed)' }}>
          자세히 보기 <ArrowRight size={14} />
        </button>
      </div>
    </GlassCard>
  );
}

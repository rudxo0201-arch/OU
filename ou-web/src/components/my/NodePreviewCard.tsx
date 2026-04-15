'use client';

import { useState, useEffect } from 'react';
import {
  Stack, Text, Badge, ActionIcon, Group, Button, Loader,
} from '@mantine/core';
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
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between">
          <Badge
            variant="light"
            color="gray"
            size="sm"
            style={{
              borderStyle: ds.borderStyle,
              borderWidth: ds.borderWidth,
              borderColor: 'var(--mantine-color-default-border)',
              borderRadius: ds.borderRadius,
              fontWeight: ds.fontWeight,
            }}
          >
            {node.graph_type === 'star' ? '\u2605' : '\u25CF'} {getDomainLabel(node.domain)}
          </Badge>
          <ActionIcon size="sm" variant="subtle" color="gray" onClick={onClose}>
            <X size={14} />
          </ActionIcon>
        </Group>

        {/* Body */}
        <Text fz="sm" lineClamp={3} style={{ lineHeight: 1.6, wordBreak: 'break-word' }}>
          {node.raw ?? '(내용 없음)'}
        </Text>

        {/* Meta counts */}
        {loading ? (
          <Group justify="center" py={4}>
            <Loader size="xs" color="gray" />
          </Group>
        ) : (
          <Group gap="xs">
            {tripleCount! > 0 && (
              <Text fz="xs" c="dimmed">관계 {tripleCount}개</Text>
            )}
            {relatedCount! > 0 && (
              <Text fz="xs" c="dimmed">연결 {relatedCount}개</Text>
            )}
            {tripleCount === 0 && relatedCount === 0 && (
              <Text fz="xs" c="dimmed">연결 정보 없음</Text>
            )}
          </Group>
        )}

        {/* Action */}
        <Button
          variant="subtle"
          size="xs"
          fullWidth
          justify="space-between"
          rightSection={<ArrowRight size={14} />}
          color="gray"
          onClick={onOpen}
        >
          자세히 보기
        </Button>
      </Stack>
    </GlassCard>
  );
}

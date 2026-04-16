'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Stack, Text, Box, Paper, Badge, ActionIcon } from '@mantine/core';
import { ArrowsClockwise } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

interface DailyCard {
  id: string;
  front: string;
  back: string;
  domain?: string;
  source?: string;
}

const ROTATE_INTERVAL = 30_000; // 30초

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function DailyCardView({ nodes }: ViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cards: DailyCard[] = useMemo(() => {
    const mapped = nodes.map(n => {
      const triples = n.triples ?? n.domain_data?.triples ?? [];

      let front: string;
      let back: string;

      if (triples.length > 0) {
        const t = triples[0];
        front = t.subject ?? n.domain_data?.term ?? n.domain_data?.title ?? (n.raw ?? '').slice(0, 60);
        back = t.object ?? n.domain_data?.definition ?? n.domain_data?.content ?? n.raw ?? '';
      } else {
        front = n.domain_data?.term ?? n.domain_data?.question ?? n.domain_data?.title ?? (n.raw ?? '').slice(0, 60) ?? '';
        back = n.domain_data?.definition ?? n.domain_data?.answer ?? n.domain_data?.content ?? n.raw ?? '';
      }

      return {
        id: n.id,
        front,
        back,
        domain: n.domain_data?.category ?? n.domain ?? undefined,
        source: n.is_admin_node ? '구독' : undefined,
      };
    });
    return shuffle(mapped);
  }, [nodes]);

  const advance = useCallback(() => {
    setFlipped(false);
    setCurrentIndex(i => (i + 1) % Math.max(cards.length, 1));
  }, [cards.length]);

  // 자동 교체
  useEffect(() => {
    if (cards.length <= 1) return;
    const id = setInterval(advance, ROTATE_INTERVAL);
    return () => clearInterval(id);
  }, [cards.length, advance]);

  if (cards.length === 0) return null;

  const card = cards[currentIndex % cards.length];

  return (
    <Stack gap="sm" p="md" align="center">
      {/* 카드 */}
      <Box
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%',
          maxWidth: 360,
          minHeight: 180,
          cursor: 'pointer',
          perspective: '1000px',
        }}
      >
        <Paper
          p="xl"
          style={{
            minHeight: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '0.5px solid var(--ou-border-subtle, var(--mantine-color-default-border))',
            borderRadius: 16,
            boxShadow: 'var(--ou-glow-sm, none)',
            transition: 'transform 0.4s ease',
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
            background: 'transparent',
          }}
        >
          {/* 앞면 */}
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backfaceVisibility: 'hidden',
              gap: 8,
            }}
          >
            <Text
              fz={10}
              style={{ color: 'var(--ou-text-dimmed, var(--mantine-color-gray-4))' }}
            >
              탭해서 뒤집기
            </Text>
            <Text
              fz="xl"
              fw={600}
              ta="center"
              style={{
                lineHeight: 1.4,
                wordBreak: 'keep-all',
                color: 'var(--ou-text-strong, var(--mantine-color-gray-8))',
              }}
            >
              {card.front}
            </Text>
          </Box>

          {/* 뒷면 */}
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              gap: 8,
            }}
          >
            <Text
              fz="sm"
              ta="center"
              style={{
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'keep-all',
                color: 'var(--ou-text-body, var(--mantine-color-gray-6))',
              }}
            >
              {card.back}
            </Text>
          </Box>
        </Paper>
      </Box>

      {/* 하단: 도메인 태그 + 새로고침 */}
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          maxWidth: 360,
        }}
      >
        <Box style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
          {card.domain && (
            <Badge variant="outline" color="gray" size="xs" radius="sm">
              {card.domain}
            </Badge>
          )}
          {card.source && (
            <Badge variant="outline" color="gray" size="xs" radius="sm">
              {card.source}
            </Badge>
          )}
        </Box>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={(e) => { e.stopPropagation(); advance(); }}
          title="다음 카드"
        >
          <ArrowsClockwise size={14} />
        </ActionIcon>
      </Box>
    </Stack>
  );
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Stack, Text, Box, Group, ActionIcon, Paper } from '@mantine/core';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export function FlashcardView({ nodes }: ViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cards: Flashcard[] = useMemo(
    () =>
      nodes.map(n => {
        // Try triples first (subject → object)
        const triples = n.triples ?? n.domain_data?.triples ?? [];
        if (triples.length > 0) {
          const t = triples[0];
          return {
            id: n.id,
            front: t.subject ?? n.domain_data?.question ?? n.domain_data?.term ?? (n.raw ?? '').slice(0, 60),
            back: t.object ?? n.domain_data?.answer ?? n.domain_data?.definition ?? n.raw ?? '',
          };
        }

        return {
          id: n.id,
          front: n.domain_data?.question ?? n.domain_data?.term ?? n.domain_data?.title ?? (n.raw ?? '').slice(0, 60) ?? '질문',
          back: n.domain_data?.answer ?? n.domain_data?.definition ?? n.domain_data?.content ?? n.raw ?? '답변',
        };
      }),
    [nodes],
  );

  const goPrev = useCallback(() => {
    setFlipped(false);
    setCurrentIndex(i => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setFlipped(false);
    setCurrentIndex(i => Math.min(cards.length - 1, i + 1));
  }, [cards.length]);

  if (cards.length === 0) return null;

  const card = cards[currentIndex];

  return (
    <Stack gap="md" p="md" align="center">
      {/* Progress */}
      <Text fz="xs" c="dimmed">
        {currentIndex + 1} / {cards.length}
      </Text>

      {/* Card */}
      <Box
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%',
          maxWidth: 400,
          minHeight: 200,
          cursor: 'pointer',
          perspective: '1000px',
        }}
      >
        <Paper
          p="xl"
          style={{
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 12,
            transition: 'transform 0.4s ease',
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
          }}
        >
          {/* Front */}
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backfaceVisibility: 'hidden',
            }}
          >
            <Stack gap="xs" align="center">
              <Text fz={10} c="dimmed" tt="uppercase">눌러서 뒤집기</Text>
              <Text
                fz="lg"
                fw={600}
                ta="center"
                style={{ lineHeight: 1.5, wordBreak: 'keep-all' }}
              >
                {card.front}
              </Text>
            </Stack>
          </Box>

          {/* Back */}
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <Text
              fz="sm"
              ta="center"
              style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}
            >
              {card.back}
            </Text>
          </Box>
        </Paper>
      </Box>

      {/* Navigation */}
      <Group gap="lg">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <CaretLeft size={20} />
        </ActionIcon>

        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={goNext}
          disabled={currentIndex === cards.length - 1}
        >
          <CaretRight size={20} />
        </ActionIcon>
      </Group>

      {/* Progress bar */}
      <Box
        style={{
          width: '100%',
          maxWidth: 400,
          height: 3,
          borderRadius: 2,
          backgroundColor: 'var(--mantine-color-gray-2)',
          overflow: 'hidden',
        }}
      >
        <Box
          style={{
            height: '100%',
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
            backgroundColor: 'var(--mantine-color-dark-4)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
    </Stack>
  );
}

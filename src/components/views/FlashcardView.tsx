'use client';

import { useState, useMemo, useCallback } from 'react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, alignItems: 'center' }}>
      {/* Progress */}
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>
        {currentIndex + 1} / {cards.length}
      </span>

      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%',
          maxWidth: 400,
          minHeight: 200,
          cursor: 'pointer',
          perspective: '1000px',
        }}
      >
        <div
          style={{
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--ou-border, #333)',
            borderRadius: 12,
            transition: 'transform 0.4s ease',
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
          }}
        >
          {/* Front */}
          <div
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', textTransform: 'uppercase' }}>눌러서 뒤집기</span>
              <span
                style={{ fontSize: 18, fontWeight: 600, textAlign: 'center', lineHeight: 1.5, wordBreak: 'keep-all' }}
              >
                {card.front}
              </span>
            </div>
          </div>

          {/* Back */}
          <div
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
            <span
              style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}
            >
              {card.back}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 24 }}>
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          style={{ background: 'none', border: 'none', cursor: currentIndex === 0 ? 'default' : 'pointer', padding: 8, display: 'flex', alignItems: 'center', color: 'inherit', opacity: currentIndex === 0 ? 0.3 : 1 }}
        >
          <CaretLeft size={20} />
        </button>

        <button
          onClick={goNext}
          disabled={currentIndex === cards.length - 1}
          style={{ background: 'none', border: 'none', cursor: currentIndex === cards.length - 1 ? 'default' : 'pointer', padding: 8, display: 'flex', alignItems: 'center', color: 'inherit', opacity: currentIndex === cards.length - 1 ? 0.3 : 1 }}
        >
          <CaretRight size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          height: 3,
          borderRadius: 2,
          backgroundColor: 'var(--ou-bg-subtle, #e0e0e0)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
            backgroundColor: 'var(--ou-text-secondary, #666)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

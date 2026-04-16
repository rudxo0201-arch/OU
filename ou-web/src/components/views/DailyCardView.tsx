'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

interface DailyCard {
  id: string;
  front: string;
  back: string;
  domain?: string;
  source?: string;
}

const ROTATE_INTERVAL = 30_000;

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

  useEffect(() => {
    if (cards.length <= 1) return;
    const id = setInterval(advance, ROTATE_INTERVAL);
    return () => clearInterval(id);
  }, [cards.length, advance]);

  if (cards.length === 0) return null;

  const card = cards[currentIndex % cards.length];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, alignItems: 'center' }}>
      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: '100%',
          maxWidth: 360,
          minHeight: 180,
          cursor: 'pointer',
          perspective: '1000px',
        }}
      >
        <div
          style={{
            minHeight: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '0.5px solid var(--ou-border, #333)',
            borderRadius: 16,
            transition: 'transform 0.4s ease',
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
            background: 'transparent',
            padding: 32,
          }}
        >
          {/* Front */}
          <div
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
            <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>
              탭해서 뒤집기
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: 1.4,
                wordBreak: 'keep-all',
              }}
            >
              {card.front}
            </span>
          </div>

          {/* Back */}
          <div
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
            <span
              style={{
                fontSize: 13,
                textAlign: 'center',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'keep-all',
                color: 'var(--ou-text-secondary, #666)',
              }}
            >
              {card.back}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: domain tags + refresh */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          maxWidth: 360,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
          {card.domain && (
            <span style={{
              fontSize: 10,
              padding: '2px 8px',
              border: '0.5px solid var(--ou-border, #333)',
              borderRadius: 4,
            }}>
              {card.domain}
            </span>
          )}
          {card.source && (
            <span style={{
              fontSize: 10,
              padding: '2px 8px',
              border: '0.5px solid var(--ou-border, #333)',
              borderRadius: 4,
            }}>
              {card.source}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); advance(); }}
          title="다음 카드"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'inherit' }}
        >
          <ArrowsClockwise size={14} />
        </button>
      </div>
    </div>
  );
}

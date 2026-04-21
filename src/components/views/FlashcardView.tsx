'use client';

import { useState, useMemo, useCallback } from 'react';
import { CaretLeft, CaretRight, Shuffle, ArrowCounterClockwise } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

/**
 * 플래시카드 뷰
 * 참고: Anki, Quizlet, Brainscape
 * - 카드 뒤집기 (3D 플립)
 * - 난이도 평가 (쉬움/보통/어려움) → 학습 큐 재배치
 * - 셔플 기능
 * - 진도 표시 + 남은 카드 수
 * - 키보드 단축키 (← → Space)
 */

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty?: number; // 0=미학습, 1=어려움, 2=보통, 3=쉬움
}

function parseCards(nodes: ViewProps['nodes']): Flashcard[] {
  return nodes.map(n => {
    const triples = n.triples ?? n.domain_data?.triples ?? [];
    if (triples.length > 0) {
      const t = triples[0];
      return {
        id: n.id,
        front: t.subject ?? n.domain_data?.term ?? (n.raw ?? '').slice(0, 60),
        back: t.object ?? n.domain_data?.definition ?? n.raw ?? '',
      };
    }
    // 한자 데이터
    if (n.domain_data?.type === 'hanja') {
      const d = n.domain_data;
      const parts = [
        d.hun && d.sound ? `${d.hun} ${d.sound}` : (d.hun || d.sound || ''),
        d.meaning || '',
        d.radical ? `부수: ${d.radical}` : '',
        d.stroke_count ? `${d.stroke_count}획` : '',
        d.grade || '',
      ].filter(Boolean);
      return {
        id: n.id,
        front: d.char,
        back: parts.join(' · '),
      };
    }
    return {
      id: n.id,
      front: n.domain_data?.question ?? n.domain_data?.term ?? n.domain_data?.title ?? (n.raw ?? '').slice(0, 60) ?? '질문',
      back: n.domain_data?.answer ?? n.domain_data?.definition ?? n.domain_data?.content ?? n.raw ?? '답변',
    };
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FlashcardView({ nodes }: ViewProps) {
  const allCards = useMemo(() => parseCards(nodes), [nodes]);
  const [cards, setCards] = useState(allCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'study' | 'done'>('study');

  const card = cards[currentIndex];
  const studied = Object.keys(scores).length;
  const remaining = cards.length - studied;

  const flip = useCallback(() => setFlipped(f => !f), []);

  const rate = useCallback((difficulty: number) => {
    if (!card) return;
    setScores(prev => ({ ...prev, [card.id]: difficulty }));
    setFlipped(false);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      setMode('done');
    }
  }, [card, currentIndex, cards.length]);

  const goTo = useCallback((index: number) => {
    setFlipped(false);
    setCurrentIndex(Math.max(0, Math.min(cards.length - 1, index)));
  }, [cards.length]);

  const handleShuffle = useCallback(() => {
    setCards(shuffleArray(allCards));
    setCurrentIndex(0);
    setFlipped(false);
    setScores({});
    setMode('study');
  }, [allCards]);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setFlipped(false);
    setScores({});
    setMode('study');
  }, []);

  // 키보드 단축키
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
    if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    if (e.key === '1') rate(1);
    if (e.key === '2') rate(2);
    if (e.key === '3') rate(3);
  }, [flip, goTo, rate, currentIndex]);

  if (cards.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🃏</div>
        플래시카드로 변환할 데이터가 없습니다
      </div>
    );
  }

  // 완료 화면
  if (mode === 'done') {
    const easy = Object.values(scores).filter(s => s === 3).length;
    const medium = Object.values(scores).filter(s => s === 2).length;
    const hard = Object.values(scores).filter(s => s === 1).length;

    return (
      <div style={{ padding: 40, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 8 }}>
          학습 완료!
        </div>
        <div style={{ fontSize: 13, color: 'var(--ou-text-muted)', marginBottom: 24 }}>
          {cards.length}장 학습
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
          <StatBadge label="쉬움" count={easy} />
          <StatBadge label="보통" count={medium} />
          <StatBadge label="어려움" count={hard} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={restart} style={actionBtn}>
            <ArrowCounterClockwise size={14} /> 다시
          </button>
          <button onClick={handleShuffle} style={actionBtn}>
            <Shuffle size={14} /> 셔플
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, outline: 'none' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, width: '100%', maxWidth: 420, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>
          {currentIndex + 1} / {cards.length}
        </span>
        <button onClick={handleShuffle} style={{ ...actionBtn, padding: '4px 10px' }}>
          <Shuffle size={12} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%', maxWidth: 420, height: 4,
        borderRadius: 2, background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
        marginBottom: 20, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${((currentIndex + 1) / cards.length) * 100}%`,
          background: 'var(--ou-text-muted)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Card */}
      <div
        onClick={flip}
        style={{
          width: '100%', maxWidth: 420, minHeight: 240,
          cursor: 'pointer', perspective: '1000px',
          marginBottom: 20,
        }}
      >
        <div style={{
          minHeight: 240,
          borderRadius: 16,
          border: 'none',
          background: 'var(--ou-bg)',
          boxShadow: flipped ? 'var(--ou-neu-pressed-lg)' : 'var(--ou-neu-raised-lg)',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
        }}>
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 32, backfaceVisibility: 'hidden',
          }}>
            <span style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginBottom: 12, letterSpacing: 1 }}>
              FRONT · 탭하여 뒤집기
            </span>
            <span style={{
              fontSize: card.front.length === 1 ? 48 : card.front.length < 10 ? 28 : 18,
              fontWeight: 600, textAlign: 'center', lineHeight: 1.5,
              color: 'var(--ou-text-heading)',
              wordBreak: 'keep-all',
            }}>
              {card.front}
            </span>
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 32, backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}>
            <span style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginBottom: 12, letterSpacing: 1 }}>
              BACK
            </span>
            <span style={{
              fontSize: 14, textAlign: 'center', lineHeight: 1.8,
              whiteSpace: 'pre-wrap', wordBreak: 'keep-all',
              color: 'var(--ou-text-body)',
            }}>
              {card.back}
            </span>
          </div>
        </div>
      </div>

      {/* Rating buttons (visible when flipped) */}
      {flipped && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 16,
          animation: 'ou-fade-in 0.2s ease',
        }}>
          <RateButton label="어려움" shortcut="1" onClick={() => rate(1)} />
          <RateButton label="보통" shortcut="2" onClick={() => rate(2)} />
          <RateButton label="쉬움" shortcut="3" onClick={() => rate(3)} />
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <button
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          style={{ ...navBtn, opacity: currentIndex === 0 ? 0.2 : 1 }}
        >
          <CaretLeft size={20} />
        </button>
        <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
          Space로 뒤집기 · ←→ 이동
        </span>
        <button
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex === cards.length - 1}
          style={{ ...navBtn, opacity: currentIndex === cards.length - 1 ? 0.2 : 1 }}
        >
          <CaretRight size={20} />
        </button>
      </div>
    </div>
  );
}

function RateButton({ label, shortcut, onClick }: {
  label: string; shortcut: string; color?: string; borderColor?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', borderRadius: 10,
      background: 'var(--ou-bg)',
      border: 'none',
      boxShadow: 'var(--ou-neu-raised-sm)',
      cursor: 'pointer', fontSize: 13,
      color: 'var(--ou-text-body)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      transition: '150ms ease', minWidth: 80,
    }}>
      {label}
      <span style={{ fontSize: 9, color: 'var(--ou-text-muted)' }}>{shortcut}</span>
    </button>
  );
}

function StatBadge({ label, count }: { label: string; count: number; color?: string }) {
  return (
    <div style={{
      padding: '8px 16px', borderRadius: 10,
      background: 'var(--ou-bg)',
      boxShadow: 'var(--ou-neu-pressed-sm)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ou-text-heading)' }}>{count}</div>
      <div style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{label}</div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'var(--ou-bg)', border: 'none',
  boxShadow: 'var(--ou-neu-raised-sm)',
  borderRadius: 8,
  cursor: 'pointer', padding: 8,
  display: 'flex', alignItems: 'center',
  color: 'inherit',
};

const actionBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 999,
  border: 'none',
  background: 'var(--ou-bg)',
  boxShadow: 'var(--ou-neu-raised-sm)',
  fontSize: 12, color: 'var(--ou-text-muted)',
  cursor: 'pointer',
};

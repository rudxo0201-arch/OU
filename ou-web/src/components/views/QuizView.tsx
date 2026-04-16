'use client';

import { useState, useMemo, useCallback } from 'react';
import { ArrowRight, CheckCircle, XCircle, Trophy } from '@phosphor-icons/react';
import type { ViewProps } from './registry';

interface Question {
  id: string;
  question: string;
  correct: string;
  choices: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuestions(nodes: any[]): Question[] {
  if (nodes.length < 2) return [];

  return nodes.map(n => {
    const title = n.domain_data?.title ?? ((n.raw ?? '').slice(0, 40) || 'Untitled');
    const desc = n.domain_data?.description ?? n.domain_data?.content ?? n.raw ?? '';
    const question = `What is "${title}"?`;
    const correct = (desc || title).slice(0, 80);

    const wrongPool = nodes
      .filter(o => o.id !== n.id)
      .map(o => {
        const oDesc = o.domain_data?.description ?? o.domain_data?.content ?? o.raw ?? '';
        return (oDesc || o.domain_data?.title || 'Unknown').slice(0, 80);
      });

    const wrongs = shuffle(wrongPool).slice(0, 3);
    while (wrongs.length < 3) wrongs.push(`Option ${wrongs.length + 1}`);

    return {
      id: n.id,
      question,
      correct,
      choices: shuffle([correct, ...wrongs]),
    };
  });
}

export function QuizView({ nodes }: ViewProps) {
  const questions = useMemo(() => shuffle(generateQuestions(nodes)), [nodes]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selected !== null) return;
      setSelected(choice);
      if (choice === questions[current]?.correct) {
        setScore(s => s + 1);
      }
    },
    [selected, current, questions],
  );

  const handleNext = useCallback(() => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  }, [current, questions.length]);

  const handleRestart = useCallback(() => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }, []);

  if (nodes.length === 0) return null;
  if (questions.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>Not enough data to generate a quiz.</span>
      </div>
    );
  }

  if (finished) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 40 }}>
        <Trophy size={40} weight="duotone" style={{ color: 'var(--ou-gray-6, #666)' }} />
        <span style={{ fontSize: 18, fontWeight: 600 }}>
          {score} / {questions.length}
        </span>
        <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)' }}>
          {score === questions.length ? 'Perfect!' : score >= questions.length * 0.7 ? 'Great job!' : 'Keep learning!'}
        </span>
        <button
          onClick={handleRestart}
          style={{
            padding: '6px 16px',
            border: '0.5px solid var(--ou-border, #333)',
            borderRadius: 6,
            background: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: 'inherit',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>Quiz</span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>
          {current + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, backgroundColor: 'var(--ou-bg-subtle, #e0e0e0)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--ou-gray-5, #888)', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>

      <span style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>
        {q.question}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {q.choices.map((choice, i) => {
          const isSelected = selected === choice;
          const isCorrect = choice === q.correct;
          let borderColor = 'var(--ou-border, #333)';
          let bg = 'transparent';

          if (selected !== null) {
            if (isCorrect) {
              borderColor = 'var(--ou-gray-7, #555)';
              bg = 'var(--ou-bg-subtle, rgba(255,255,255,0.05))';
            } else if (isSelected && !isCorrect) {
              borderColor = 'var(--ou-gray-5, #888)';
            }
          }

          return (
            <div
              key={i}
              onClick={() => handleSelect(choice)}
              style={{
                border: `0.5px solid ${borderColor}`,
                borderRadius: 6,
                padding: '8px 12px',
                cursor: selected === null ? 'pointer' : 'default',
                backgroundColor: bg,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center' }}>
                {selected !== null && isCorrect && (
                  <CheckCircle size={16} weight="fill" style={{ color: 'var(--ou-gray-7, #555)' }} />
                )}
                {selected !== null && isSelected && !isCorrect && (
                  <XCircle size={16} weight="fill" style={{ color: 'var(--ou-gray-5, #888)' }} />
                )}
                <span style={{ fontSize: 12, flex: 1 }}>
                  {choice}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selected !== null && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleNext}
            style={{
              padding: '6px 16px',
              border: '0.5px solid var(--ou-border, #333)',
              borderRadius: 6,
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {current + 1 >= questions.length ? 'Results' : 'Next'}
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

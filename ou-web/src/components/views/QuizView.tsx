'use client';

import { useState, useMemo, useCallback } from 'react';
import { Stack, Text, Box, Button, Group, Progress } from '@mantine/core';
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
      <Stack p="md">
        <Text fz="xs" c="dimmed">Not enough data to generate a quiz.</Text>
      </Stack>
    );
  }

  if (finished) {
    return (
      <Stack p="md" align="center" gap="md" style={{ paddingTop: 40 }}>
        <Trophy size={40} weight="duotone" color="var(--mantine-color-gray-6)" />
        <Text fz="lg" fw={600}>
          {score} / {questions.length}
        </Text>
        <Text fz="sm" c="dimmed">
          {score === questions.length ? 'Perfect!' : score >= questions.length * 0.7 ? 'Great job!' : 'Keep learning!'}
        </Text>
        <Button variant="default" size="xs" onClick={handleRestart}>
          Try Again
        </Button>
      </Stack>
    );
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <Stack gap="md" p="md">
      <Group gap={8} justify="space-between">
        <Text fz="xs" c="dimmed">Quiz</Text>
        <Text fz={11} c="dimmed">
          {current + 1} / {questions.length}
        </Text>
      </Group>

      <Progress value={progress} size={3} color="gray" />

      <Text fz="sm" fw={500} mt="xs">
        {q.question}
      </Text>

      <Stack gap={6}>
        {q.choices.map((choice, i) => {
          const isSelected = selected === choice;
          const isCorrect = choice === q.correct;
          let borderColor = 'var(--mantine-color-default-border)';
          let bg = 'transparent';

          if (selected !== null) {
            if (isCorrect) {
              borderColor = 'var(--mantine-color-gray-7)';
              bg = 'var(--mantine-color-gray-1)';
            } else if (isSelected && !isCorrect) {
              borderColor = 'var(--mantine-color-gray-5)';
            }
          }

          return (
            <Box
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
              <Group gap={8} wrap="nowrap">
                {selected !== null && isCorrect && (
                  <CheckCircle size={16} weight="fill" color="var(--mantine-color-gray-7)" />
                )}
                {selected !== null && isSelected && !isCorrect && (
                  <XCircle size={16} weight="fill" color="var(--mantine-color-gray-5)" />
                )}
                <Text fz={12} style={{ flex: 1 }}>
                  {choice}
                </Text>
              </Group>
            </Box>
          );
        })}
      </Stack>

      {selected !== null && (
        <Group justify="flex-end">
          <Button
            variant="default"
            size="xs"
            rightSection={<ArrowRight size={14} />}
            onClick={handleNext}
          >
            {current + 1 >= questions.length ? 'Results' : 'Next'}
          </Button>
        </Group>
      )}
    </Stack>
  );
}

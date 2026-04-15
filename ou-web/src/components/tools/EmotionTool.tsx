'use client';

import { useState } from 'react';
import { Box, Text, Group, Stack, UnstyledButton, TextInput, Badge } from '@mantine/core';
import { Smiley, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const EMOTION_MAP: Record<string, string> = {
  행복: '행복',
  기쁘: '행복',
  좋: '행복',
  즐거: '행복',
  신나: '행복',
  설레: '설렘',
  감사: '감사',
  고마: '감사',
  슬프: '슬픔',
  슬퍼: '슬픔',
  우울: '우울',
  외로: '외로움',
  화나: '분노',
  짜증: '분노',
  열받: '분노',
  불안: '불안',
  걱정: '불안',
  긴장: '불안',
  초조: '불안',
  스트레스: '스트레스',
  지치: '피곤',
  피곤: '피곤',
  힘들: '피곤',
  편안: '평온',
  평화: '평온',
  차분: '평온',
};

// 감정 강도 5단계 (밝은 회색 → 진한 검정)
const INTENSITY_LEVELS = [
  { value: 1, label: '조금', color: '#d0d0d0' },
  { value: 2, label: '약간', color: '#a0a0a0' },
  { value: 3, label: '보통', color: '#707070' },
  { value: 4, label: '꽤', color: '#404040' },
  { value: 5, label: '많이', color: '#1a1a1a' },
];

function parseEmotion(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  // 감정 유형 감지
  for (const [keyword, emotion] of Object.entries(EMOTION_MAP)) {
    if (input.includes(keyword)) {
      parsed.emotion = emotion;
      break;
    }
  }

  // 강도 힌트
  if (/너무|정말|진짜|완전|엄청|매우/.test(input)) {
    parsed.intensity = '5';
  } else if (/꽤|상당히|많이/.test(input)) {
    parsed.intensity = '4';
  } else if (/조금|살짝|약간/.test(input)) {
    parsed.intensity = '2';
  }

  // 원인 추출 시도 — "~때문에", "~해서", "~라서"
  const causeMatch = input.match(/(.{2,20})(때문에|때문이야|해서|라서|덕분에|탓에)/);
  if (causeMatch) {
    parsed.cause = causeMatch[1].trim();
  }

  return parsed;
}

export function EmotionTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [selectedIntensity, setSelectedIntensity] = useState<number | null>(
    parsed.intensity ? parseInt(parsed.intensity) : null,
  );
  const [cause, setCause] = useState(parsed.cause ?? '');
  const [showCauseInput, setShowCauseInput] = useState(false);

  const emotionLabel = parsed.emotion ?? '기분';
  const isDone = selectedIntensity !== null;

  return (
    <Box
      mt="xs"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
        animation: 'ou-fade-in 300ms ease',
      }}
    >
      {/* 헤더 */}
      <Group
        gap="xs" px="sm" py={6}
        style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <Smiley size={14} weight="fill" />
        <Badge variant="light" color="gray" size="xs">감정</Badge>
        {isDone && <Check size={12} style={{ color: 'var(--mantine-color-green-5)' }} />}
      </Group>

      {/* 감정 & 정보 */}
      <Box px="sm" py="sm">
        <Stack gap={4}>
          <Group gap={6}>
            <Text fz={11} c="dimmed">감정</Text>
            <Text fz="sm" fw={600}>{emotionLabel}</Text>
          </Group>
          {selectedIntensity && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">정도</Text>
              <Text fz="sm">
                {INTENSITY_LEVELS.find(l => l.value === selectedIntensity)?.label}
              </Text>
            </Group>
          )}
          {cause && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">이유</Text>
              <Text fz="sm">{cause}</Text>
            </Group>
          )}
        </Stack>
      </Box>

      {/* 감정 강도 선택 */}
      {!selectedIntensity && (
        <Box px="sm" pb="sm">
          <Text fz={10} c="dimmed" mb={6}>어느 정도인가요?</Text>
          <Group gap={8} justify="center">
            {INTENSITY_LEVELS.map(level => (
              <UnstyledButton
                key={level.value}
                onClick={() => {
                  setSelectedIntensity(level.value);
                  onSubmit(`강도: ${level.label}`);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: level.color,
                    border: '0.5px solid var(--mantine-color-default-border)',
                    transition: 'transform 150ms',
                  }}
                />
                <Text fz={9} c="dimmed">{level.label}</Text>
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      )}

      {/* 이유 입력 (선택) */}
      {selectedIntensity && !cause && !showCauseInput && (
        <Box px="sm" pb="sm">
          <UnstyledButton
            onClick={() => setShowCauseInput(true)}
            style={{
              padding: '3px 10px',
              borderRadius: 14,
              fontSize: 12,
              border: '0.5px solid var(--mantine-color-default-border)',
              color: 'var(--mantine-color-dimmed)',
              transition: 'all 150ms',
            }}
          >
            + 이유 적기
          </UnstyledButton>
        </Box>
      )}

      {showCauseInput && !cause && (
        <Box px="sm" pb="sm">
          <TextInput
            size="xs"
            placeholder="어떤 일이 있었나요?"
            onChange={e => setCause(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                const val = (e.target as HTMLInputElement).value.trim();
                setCause(val);
                onSubmit(`이유: ${val}`);
                setShowCauseInput(false);
              }
            }}
            autoFocus
            styles={{
              input: {
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid var(--mantine-color-default-border)',
              },
            }}
          />
        </Box>
      )}

      {/* 하단 */}
      <Group
        px="sm" py={6}
        style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <UnstyledButton
          onClick={() => router.push('/my')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mantine-color-dimmed)' }}
        >
          내 우주에서 보기 <ArrowRight size={11} />
        </UnstyledButton>
      </Group>
    </Box>
  );
}

registerTool({
  id: 'emotion',
  label: '감정',
  match: (_input, domain) => domain === 'emotion',
  parse: parseEmotion,
  component: EmotionTool,
});

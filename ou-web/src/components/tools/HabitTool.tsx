'use client';

import { useState } from 'react';
import { Box, Text, Group, Stack, UnstyledButton, TextInput, Badge } from '@mantine/core';
import { Repeat, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const FREQUENCIES = ['매일', '주 2회', '주 3회', '주 5회', '월 2회', '월 4회'];
const TIME_OF_DAY = ['아침', '점심', '저녁', '자유'];

function parseHabit(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  // 습관명 추출 — 동사/명사 기반
  const habitPatterns = [
    /매일\s+(.{2,10})/,
    /(.{2,10})\s*(습관|루틴)/,
    /(.{2,10})\s*(하기|하려고|할래|시작)/,
  ];
  for (const pattern of habitPatterns) {
    const match = input.match(pattern);
    if (match) {
      parsed.habit = match[1].trim();
      break;
    }
  }

  // 잘 알려진 습관 직접 감지
  if (!parsed.habit) {
    const knownHabits = input.match(/(운동|독서|물\s?마시기|명상|스트레칭|영어|일기|산책|조깅|러닝|요가|필라테스|코딩|공부|수영|자전거)/);
    if (knownHabits) {
      parsed.habit = knownHabits[1];
    }
  }

  // 빈도 자동 감지
  if (/매일|매일매일|하루도/.test(input)) {
    parsed.frequency = '매일';
  } else {
    const weekMatch = input.match(/주\s*(\d)\s*회/);
    if (weekMatch) parsed.frequency = `주 ${weekMatch[1]}회`;
    const monthMatch = input.match(/월\s*(\d)\s*회/);
    if (monthMatch) parsed.frequency = `월 ${monthMatch[1]}회`;
  }

  // 시간대 감지
  if (/아침|기상|일어나/.test(input)) {
    parsed.timeOfDay = '아침';
  } else if (/점심|낮/.test(input)) {
    parsed.timeOfDay = '점심';
  } else if (/저녁|밤|자기\s*전|퇴근/.test(input)) {
    parsed.timeOfDay = '저녁';
  }

  return parsed;
}

export function HabitTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [localParsed, setLocalParsed] = useState(parsed);
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(parsed.frequency ?? null);
  const [selectedTime, setSelectedTime] = useState<string | null>(parsed.timeOfDay ?? null);

  const today = new Date();
  const startDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const allFilled = !!selectedFrequency && !!selectedTime;

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
        <Repeat size={14} weight="fill" />
        <Badge variant="light" color="gray" size="xs">습관</Badge>
        {allFilled && <Check size={12} style={{ color: 'var(--mantine-color-green-5)' }} />}
      </Group>

      {/* 파싱된 데이터 */}
      <Box px="sm" py="sm">
        <Stack gap={4}>
          {localParsed.habit && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">습관</Text>
              <Text fz="sm" fw={600}>{localParsed.habit}</Text>
            </Group>
          )}
          {selectedFrequency && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">빈도</Text>
              <Text fz="sm">{selectedFrequency}</Text>
            </Group>
          )}
          {selectedTime && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">시간대</Text>
              <Text fz="sm">{selectedTime}</Text>
            </Group>
          )}
          <Group gap={6}>
            <Text fz={11} c="dimmed">시작일</Text>
            <Text fz="sm">{startDate}</Text>
          </Group>
          {!localParsed.habit && (
            <Text fz="sm">{rawInput}</Text>
          )}
        </Stack>
      </Box>

      {/* 빈도 선택 */}
      {!selectedFrequency && (
        <Box px="sm" pb="sm">
          <Text fz={10} c="dimmed" mb={4}>얼마나 자주 하실 건가요?</Text>
          <Group gap={4}>
            {FREQUENCIES.map(freq => (
              <UnstyledButton
                key={freq}
                onClick={() => {
                  setSelectedFrequency(freq);
                  onSubmit(`빈도: ${freq}`);
                }}
                style={{
                  padding: '2px 10px',
                  borderRadius: 14,
                  fontSize: 11,
                  border: '0.5px solid var(--mantine-color-default-border)',
                  color: 'var(--mantine-color-dimmed)',
                  transition: 'all 150ms',
                }}
              >
                {freq}
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      )}

      {/* 시간대 선택 */}
      {selectedFrequency && !selectedTime && (
        <Box px="sm" pb="sm">
          <Text fz={10} c="dimmed" mb={4}>언제 하실 건가요?</Text>
          <Group gap={4}>
            {TIME_OF_DAY.map(time => (
              <UnstyledButton
                key={time}
                onClick={() => {
                  setSelectedTime(time);
                  onSubmit(`시간대: ${time}`);
                }}
                style={{
                  padding: '2px 10px',
                  borderRadius: 14,
                  fontSize: 11,
                  border: '0.5px solid var(--mantine-color-default-border)',
                  color: 'var(--mantine-color-dimmed)',
                  transition: 'all 150ms',
                }}
              >
                {time}
              </UnstyledButton>
            ))}
          </Group>
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
  id: 'habit',
  label: '습관',
  match: (_input, domain) => domain === 'habit',
  parse: parseHabit,
  component: HabitTool,
});

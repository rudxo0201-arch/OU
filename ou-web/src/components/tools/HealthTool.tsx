'use client';

import { useState } from 'react';
import { Box, Text, Group, Stack, UnstyledButton, TextInput, Badge } from '@mantine/core';
import { Heartbeat, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const HEALTH_PATTERN = /두통|운동|약|병원|컨디션|수면|식단|체중|혈압|스트레스|감기|열|배아파|허리|목아파|피곤|불면|소화/;

const SYMPTOM_MAP: Record<string, string> = {
  두통: '두통',
  머리: '두통',
  목아파: '목 통증',
  목: '목 통증',
  배아파: '복통',
  배: '복통',
  허리: '허리 통증',
  감기: '감기',
  열: '발열',
  피곤: '피로',
  불면: '불면',
  수면: '수면 문제',
  소화: '소화 불량',
  운동: '운동',
  약: '복약',
  병원: '병원 방문',
  컨디션: '컨디션',
  식단: '식단',
  체중: '체중',
  혈압: '혈압',
  스트레스: '스트레스',
};

const BODY_PARTS = [
  '머리', '목', '배', '등', '허리', '팔', '다리', '전신',
];

const SEVERITY_LEVELS = [
  { value: 1, color: '#e0e0e0' },
  { value: 2, color: '#b0b0b0' },
  { value: 3, color: '#808080' },
  { value: 4, color: '#505050' },
  { value: 5, color: '#1a1a1a' },
];

function parseHealth(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  // Detect symptom
  for (const [keyword, symptom] of Object.entries(SYMPTOM_MAP)) {
    if (input.includes(keyword)) {
      parsed.symptom = symptom;
      break;
    }
  }

  // Detect body part
  for (const part of BODY_PARTS) {
    if (input.includes(part)) {
      parsed.bodyPart = part;
      break;
    }
  }

  // Severity hints
  if (/심한|너무|정말|진짜|엄청|매우/.test(input)) {
    parsed.severity = '5';
  } else if (/꽤|상당히|많이/.test(input)) {
    parsed.severity = '4';
  } else if (/좀|약간|살짝|조금/.test(input)) {
    parsed.severity = '2';
  }

  return parsed;
}

export function HealthTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [selectedSeverity, setSelectedSeverity] = useState<number | null>(
    parsed.severity ? parseInt(parsed.severity) : null,
  );
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(
    parsed.bodyPart ?? null,
  );
  const [memo, setMemo] = useState('');
  const [showMemo, setShowMemo] = useState(false);

  const symptomLabel = parsed.symptom ?? '건강';
  const isDone = selectedSeverity !== null;

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
      {/* Header */}
      <Group
        gap="xs" px="sm" py={6}
        style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <Heartbeat size={14} weight="fill" />
        <Badge variant="light" color="gray" size="xs">건강</Badge>
        {isDone && <Check size={12} style={{ color: 'var(--mantine-color-green-5)' }} />}
      </Group>

      {/* Detected symptom */}
      <Box px="sm" py="sm">
        <Stack gap={4}>
          <Group gap={6}>
            <Text fz={11} c="dimmed">증상</Text>
            <Text fz="sm" fw={600}>{symptomLabel}</Text>
          </Group>
          {selectedSeverity && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">정도</Text>
              <Group gap={3}>
                {SEVERITY_LEVELS.map(level => (
                  <Box
                    key={level.value}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: level.value <= selectedSeverity ? level.color : 'transparent',
                      border: `1px solid ${level.color}`,
                    }}
                  />
                ))}
              </Group>
            </Group>
          )}
          {selectedBodyPart && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">부위</Text>
              <Text fz="sm">{selectedBodyPart}</Text>
            </Group>
          )}
          {memo && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">메모</Text>
              <Text fz="sm">{memo}</Text>
            </Group>
          )}
        </Stack>
      </Box>

      {/* Severity selector */}
      {!selectedSeverity && (
        <Box px="sm" pb="sm">
          <Text fz={10} c="dimmed" mb={6}>어느 정도인가요?</Text>
          <Group gap={8} justify="center">
            {SEVERITY_LEVELS.map(level => (
              <UnstyledButton
                key={level.value}
                onClick={() => {
                  setSelectedSeverity(level.value);
                  onSubmit(`정도: ${level.value}/5`);
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
                    border: `1.5px solid ${level.color}`,
                    backgroundColor: 'transparent',
                    transition: 'transform 150ms',
                  }}
                />
                <Text fz={9} c="dimmed">{level.value}</Text>
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      )}

      {/* Body part chips */}
      {selectedSeverity && !selectedBodyPart && (
        <Box px="sm" pb="sm">
          <Text fz={10} c="dimmed" mb={6}>어디가 불편한가요?</Text>
          <Group gap={6}>
            {BODY_PARTS.map(part => (
              <UnstyledButton
                key={part}
                onClick={() => {
                  setSelectedBodyPart(part);
                  onSubmit(`부위: ${part}`);
                }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 14,
                  fontSize: 12,
                  border: '0.5px solid var(--mantine-color-default-border)',
                  color: 'var(--mantine-color-text)',
                  transition: 'all 150ms',
                }}
              >
                {part}
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      )}

      {/* Optional memo */}
      {selectedSeverity && selectedBodyPart && !memo && !showMemo && (
        <Box px="sm" pb="sm">
          <UnstyledButton
            onClick={() => setShowMemo(true)}
            style={{
              padding: '3px 10px',
              borderRadius: 14,
              fontSize: 12,
              border: '0.5px solid var(--mantine-color-default-border)',
              color: 'var(--mantine-color-dimmed)',
              transition: 'all 150ms',
            }}
          >
            + 메모 추가
          </UnstyledButton>
        </Box>
      )}

      {showMemo && !memo && (
        <Box px="sm" pb="sm">
          <TextInput
            size="xs"
            placeholder="추가로 기록할 내용이 있나요?"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                const val = (e.target as HTMLInputElement).value.trim();
                setMemo(val);
                onSubmit(`메모: ${val}`);
                setShowMemo(false);
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

      {/* Footer */}
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
  id: 'health',
  label: '건강',
  match: (input, _domain) => HEALTH_PATTERN.test(input),
  parse: parseHealth,
  component: HealthTool,
});

'use client';

import { useState } from 'react';
import { Box, Text, Group, Stack, UnstyledButton, TextInput, Badge } from '@mantine/core';
import { CalendarBlank, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

// 일정 서브타입 감지
type ScheduleSubtype = 'appointment' | 'anniversary' | 'exam' | 'trip' | 'general';

function detectSubtype(input: string): ScheduleSubtype {
  if (/시험|고사|퀴즈|발표/.test(input)) return 'exam';
  if (/생일|기일|기념일|결혼기념/.test(input)) return 'anniversary';
  if (/여행|출장/.test(input)) return 'trip';
  if (/약속|만남|밥|미팅|회의|식사|결혼식/.test(input)) return 'appointment';
  return 'general';
}

// 서브타입별 필드 정의
const SUBTYPE_FIELDS: Record<ScheduleSubtype, { label: string; fields: { key: string; label: string; autoDetect: RegExp }[] }> = {
  appointment: {
    label: '약속',
    fields: [
      { key: 'date', label: '날짜', autoDetect: /(\d{1,2}월\s?\d{1,2}일|\d{1,2}일|월요일|화요일|수요일|목요일|금요일|토요일|일요일|내일|모레|오늘|다음주|이번주|주말)/ },
      { key: 'time', label: '시간', autoDetect: /(\d{1,2}시|\d{1,2}:\d{2}|오전|오후|저녁|점심|아침)/ },
      { key: 'place', label: '장소', autoDetect: /(호텔|레스토랑|카페|학교|회사|역|공원|집|센터|빌딩|몰|거리|동|구|시)/ },
    ],
  },
  anniversary: {
    label: '기념일',
    fields: [
      { key: 'date', label: '날짜', autoDetect: /(\d{1,2}월\s?\d{1,2}일|\d{1,2}일|월요일|화요일|수요일|목요일|금요일|토요일|일요일|내일|모레|다음주|이번주)/ },
    ],
  },
  exam: {
    label: '시험',
    fields: [
      { key: 'date', label: '날짜', autoDetect: /(\d{1,2}월\s?\d{1,2}일|\d{1,2}일|월요일|화요일|수요일|목요일|금요일|토요일|일요일|내일|다음주)/ },
      { key: 'subject', label: '과목', autoDetect: /(수학|영어|국어|과학|물리|화학|생물|역사|사회|경제|프로그래밍|코딩)/ },
    ],
  },
  trip: {
    label: '여행',
    fields: [
      { key: 'startDate', label: '출발일', autoDetect: /(\d{1,2}월\s?\d{1,2}일|\d{1,2}일)/ },
      { key: 'destination', label: '목적지', autoDetect: /(제주|부산|강릉|속초|여수|일본|도쿄|오사카|태국|발리|유럽|파리)/ },
    ],
  },
  general: {
    label: '일정',
    fields: [
      { key: 'date', label: '날짜', autoDetect: /(\d{1,2}월\s?\d{1,2}일|\d{1,2}일|월요일|화요일|수요일|목요일|금요일|토요일|일요일|내일|모레|오늘|다음주|이번주)/ },
    ],
  },
};

function parseSchedule(input: string): Record<string, string> {
  const subtype = detectSubtype(input);
  const config = SUBTYPE_FIELDS[subtype];
  const parsed: Record<string, string> = { _subtype: subtype };

  for (const field of config.fields) {
    const match = input.match(field.autoDetect);
    if (match) {
      parsed[field.key] = match[0];
    }
  }

  // 인물 감지
  const personMatch = input.match(/([가-힣]{2,4})(이|이랑|랑|의|한테|네|씨)/);
  if (personMatch) {
    parsed._person = personMatch[1];
  }

  return parsed;
}

export function ScheduleTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const subtype = (parsed._subtype as ScheduleSubtype) ?? 'general';
  const config = SUBTYPE_FIELDS[subtype];
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [localParsed, setLocalParsed] = useState(parsed);

  // "다음주", "이번주" 등이 있지만 구체적 요일이 없으면 요일 선택 필요
  const hasWeekRef = /다음주|이번주|이번 주|다음 주|주말/.test(rawInput);
  const hasSpecificDay = /월요일|화요일|수요일|목요일|금요일|토요일|일요일/.test(rawInput);
  const needsDayOfWeek = hasWeekRef && !hasSpecificDay;

  // 아직 채워지지 않은 필드 (요일 선택되면 date 필드는 채워진 것으로 처리)
  const missingFields = config.fields.filter(f => {
    if (f.key === 'date' && (localParsed[f.key] || localParsed.dayOfWeek)) return false;
    return !localParsed[f.key];
  });
  const allFilled = missingFields.length === 0 && (!needsDayOfWeek || localParsed.dayOfWeek);

  const handleSubmit = (key: string) => {
    if (!fieldValue.trim()) return;
    setLocalParsed(prev => ({ ...prev, [key]: fieldValue }));
    onSubmit(fieldValue);
    setFieldValue('');
    setEditingField(null);
  };

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
        gap="xs"
        px="sm"
        py={6}
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '0.5px solid var(--mantine-color-default-border)',
        }}
      >
        <CalendarBlank size={14} weight="fill" />
        <Badge variant="light" color="gray" size="xs">{config.label}</Badge>
        {allFilled && <Check size={12} style={{ color: 'var(--mantine-color-green-5)' }} />}
      </Group>

      {/* 파싱된 데이터 표시 */}
      <Box px="sm" py="sm">
        <Stack gap={4}>
          {/* 인물 */}
          {localParsed._person && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">누구</Text>
              <Text fz="sm" fw={500}>{localParsed._person}</Text>
            </Group>
          )}

          {/* 채워진 필드 */}
          {config.fields.map(field => {
            const val = localParsed[field.key];
            if (!val) return null;
            return (
              <Group key={field.key} gap={6}>
                <Text fz={11} c="dimmed">{field.label}</Text>
                <Text fz="sm" fw={500}>{val}</Text>
              </Group>
            );
          })}

          {/* 원본 (파싱된 게 하나도 없으면) */}
          {!localParsed._person && config.fields.every(f => !localParsed[f.key]) && (
            <Text fz="sm">{rawInput}</Text>
          )}
        </Stack>
      </Box>

      {/* 요일 선택 — "다음주" 등 주 단위 언급이 있지만 요일이 없을 때 */}
      {needsDayOfWeek && !localParsed.dayOfWeek && (
        <Box px="sm" pb="sm">
          <Text fz={10} c="dimmed" mb={4}>무슨 요일이에요?</Text>
          <Group gap={4}>
            {['월', '화', '수', '목', '금', '토', '일'].map(day => (
              <UnstyledButton
                key={day}
                onClick={() => {
                  setLocalParsed(prev => ({ ...prev, dayOfWeek: `${day}요일`, date: `${prev.date ?? ''} ${day}요일`.trim() }));
                  onSubmit(`${day}요일`);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 500,
                  border: '0.5px solid var(--mantine-color-default-border)',
                  color: 'var(--mantine-color-text)',
                  transition: 'all 150ms',
                }}
              >
                {day}
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      )}

      {/* 미입력 필드 칩 */}
      {missingFields.length > 0 && (
        <Box px="sm" pb="sm">
          <Group gap={6} mb={editingField ? 8 : 0}>
            {missingFields.map(field => (
              <UnstyledButton
                key={field.key}
                onClick={() => {
                  setEditingField(editingField === field.key ? null : field.key);
                  setFieldValue('');
                }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 14,
                  fontSize: 12,
                  border: '0.5px solid var(--mantine-color-default-border)',
                  background: editingField === field.key ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: 'var(--mantine-color-dimmed)',
                  transition: 'all 150ms',
                }}
              >
                + {field.label}
              </UnstyledButton>
            ))}
          </Group>

          {editingField && (
            <TextInput
              size="xs"
              placeholder={`${config.fields.find(f => f.key === editingField)?.label} 입력`}
              value={fieldValue}
              onChange={e => setFieldValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmit(editingField);
              }}
              autoFocus
              styles={{
                input: {
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid var(--mantine-color-default-border)',
                },
              }}
            />
          )}
        </Box>
      )}

      {/* 하단 */}
      <Group
        px="sm"
        py={6}
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

// Registry에 등록
registerTool({
  id: 'schedule',
  label: '일정',
  match: (_input, domain) => domain === 'schedule',
  parse: parseSchedule,
  component: ScheduleTool,
});

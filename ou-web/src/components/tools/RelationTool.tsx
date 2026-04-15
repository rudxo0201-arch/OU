'use client';

import { useState } from 'react';
import { Box, Text, Group, Stack, UnstyledButton, TextInput, Badge } from '@mantine/core';
import { UsersThree, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const RELATION_TYPES = ['가족', '친구', '직장', '학교', '기타'];

const OPTIONAL_FIELDS = [
  { key: 'birthday', label: '생일' },
  { key: 'contact', label: '연락처' },
  { key: 'memo', label: '메모' },
];

function parseRelation(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  // 이름 추출: "김철수", "엄마", "교수님" 등
  const nameMatch = input.match(/([가-힣]{2,4})(이|이랑|랑|한테|의|씨|는|가|을|를)?/);
  if (nameMatch) {
    parsed.name = nameMatch[1];
  }

  // 관계 유형 자동 감지
  if (/엄마|아빠|형|누나|오빠|언니|동생|할머니|할아버지|이모|삼촌|고모|사촌/.test(input)) {
    parsed.relationType = '가족';
  } else if (/친구|절친|베프/.test(input)) {
    parsed.relationType = '친구';
  } else if (/교수|선생|선배|후배|동기|학우|같은 반/.test(input)) {
    parsed.relationType = '학교';
  } else if (/팀장|부장|사장|대표|동료|상사|부하|인턴/.test(input)) {
    parsed.relationType = '직장';
  }

  // 관계 호칭 추출
  const titleMatch = input.match(/(엄마|아빠|형|누나|오빠|언니|동생|할머니|할아버지|이모|삼촌|고모|사촌|교수님?|선생님?|선배|후배|동기|팀장|부장|사장|대표|친구|절친)/);
  if (titleMatch) {
    parsed.title = titleMatch[1];
  }

  return parsed;
}

export function RelationTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(parsed.relationType ?? null);
  const [localParsed, setLocalParsed] = useState(parsed);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  const filledOptional = OPTIONAL_FIELDS.filter(f => localParsed[f.key]);
  const unfilledOptional = OPTIONAL_FIELDS.filter(f => !localParsed[f.key]);

  const handleSubmitField = (key: string) => {
    if (!fieldValue.trim()) return;
    setLocalParsed(prev => ({ ...prev, [key]: fieldValue }));
    onSubmit(`${key}: ${fieldValue}`);
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
        gap="xs" px="sm" py={6}
        style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <UsersThree size={14} weight="fill" />
        <Badge variant="light" color="gray" size="xs">인물</Badge>
        {selectedType && <Check size={12} style={{ color: 'var(--mantine-color-green-5)' }} />}
      </Group>

      {/* 파싱된 데이터 */}
      <Box px="sm" py="sm">
        <Stack gap={4}>
          {localParsed.name && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">이름</Text>
              <Text fz="sm" fw={600}>{localParsed.name}</Text>
            </Group>
          )}
          {localParsed.title && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">관계</Text>
              <Text fz="sm">{localParsed.title}</Text>
            </Group>
          )}
          {selectedType && (
            <Group gap={6}>
              <Text fz={11} c="dimmed">분류</Text>
              <Text fz="sm">{selectedType}</Text>
            </Group>
          )}
          {filledOptional.map(field => (
            <Group key={field.key} gap={6}>
              <Text fz={11} c="dimmed">{field.label}</Text>
              <Text fz="sm">{localParsed[field.key]}</Text>
            </Group>
          ))}
          {!localParsed.name && !localParsed.title && (
            <Text fz="sm">{rawInput}</Text>
          )}
        </Stack>
      </Box>

      {/* 관계 유형 선택 */}
      {!selectedType && (
        <Box px="sm" pb="sm">
          <Text fz={10} c="dimmed" mb={4}>어떤 사이인가요?</Text>
          <Group gap={4}>
            {RELATION_TYPES.map(type => (
              <UnstyledButton
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  onSubmit(`관계: ${type}`);
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
                {type}
              </UnstyledButton>
            ))}
          </Group>
        </Box>
      )}

      {/* 추가 정보 입력 칩 */}
      {unfilledOptional.length > 0 && (
        <Box px="sm" pb="sm">
          <Group gap={6} mb={editingField ? 8 : 0}>
            {unfilledOptional.map(field => (
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
              placeholder={`${OPTIONAL_FIELDS.find(f => f.key === editingField)?.label} 입력`}
              value={fieldValue}
              onChange={e => setFieldValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmitField(editingField);
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
  id: 'relation',
  label: '인물',
  match: (_input, domain) => domain === 'relation',
  parse: parseRelation,
  component: RelationTool,
});

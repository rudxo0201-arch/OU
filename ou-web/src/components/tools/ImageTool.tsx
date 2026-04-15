'use client';

import { useState, useEffect } from 'react';
import { Box, Text, Group, Stack, Badge, UnstyledButton, TextInput, Loader, SimpleGrid } from '@mantine/core';
import { Image as ImageIcon, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

// 이미지에서 추출된 텍스트를 분석해 어떤 종류인지 감지
function detectImageType(text: string): 'timetable' | 'receipt' | 'document' | 'general' {
  if (/월|화|수|목|금|토|일|교시|시간표|주차/.test(text) && /\d{1,2}:\d{2}/.test(text)) return 'timetable';
  if (/합계|총액|결제|카드|현금|영수증/.test(text)) return 'receipt';
  if (/제\d+조|제\d+장|목차|서론|결론/.test(text)) return 'document';
  return 'general';
}

interface TimetableEntry {
  day: string;
  subject: string;
  time: string;
  professor?: string;
}

function parseTimetableText(text: string): TimetableEntry[] {
  const entries: TimetableEntry[] = [];
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const lines = text.split('\n');

  let currentDay = '';
  for (const line of lines) {
    // 요일 감지
    for (const day of days) {
      if (line.includes(`${day}(`) || line.includes(`${day}요일`)) {
        currentDay = day;
      }
    }

    // 시간 + 과목명 패턴
    const timeMatch = line.match(/(\d{1,2}:\d{2})\s*[~\-]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const subject = line.replace(timeMatch[0], '').trim().split('\n')[0];
      if (subject && subject.length > 1) {
        entries.push({
          day: currentDay || '?',
          subject: subject.replace(/[,\s]+$/, ''),
          time: `${timeMatch[1]}~${timeMatch[2]}`,
        });
      }
    }
  }

  return entries;
}

export function ImageTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [ocrText, setOcrText] = useState(parsed._ocrText ?? '');
  const [imageType, setImageType] = useState(parsed._imageType ?? 'general');
  const [loading, setLoading] = useState(!parsed._ocrText);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [missingFields, setMissingFields] = useState<{ key: string; label: string; options?: string[] }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  useEffect(() => {
    if (ocrText) {
      const type = detectImageType(ocrText);
      setImageType(type);

      if (type === 'timetable') {
        const parsed = parseTimetableText(ocrText);
        setEntries(parsed);
        setMissingFields([
          { key: 'grade', label: '학년', options: ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'] },
          { key: 'location', label: '강의실' },
          { key: 'repeat', label: '매주 반복인가요?', options: ['네, 매주 같아요', '이번 주만이요'] },
        ]);
      } else if (type === 'receipt') {
        setMissingFields([
          { key: 'category', label: '카테고리', options: ['식비', '교통', '쇼핑', '문화', '의료', '기타'] },
        ]);
      }
    }
  }, [ocrText]);

  const handleAnswer = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    onSubmit(`${key}: ${value}`);
  };

  const totalEntries = entries.length || '여러';

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
        <ImageIcon size={14} weight="fill" />
        <Badge variant="light" color="gray" size="xs">
          {imageType === 'timetable' ? '시간표' : imageType === 'receipt' ? '영수증' : '이미지'} 인식 완료
        </Badge>
        {Object.keys(answers).length >= missingFields.length && missingFields.length > 0 && (
          <Check size={12} style={{ color: 'var(--mantine-color-green-5)' }} />
        )}
      </Group>

      {/* 로딩 */}
      {loading && (
        <Box px="sm" py="md" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader size={14} />
          <Text fz="xs" c="dimmed">이미지를 읽고 있어요...</Text>
        </Box>
      )}

      {/* 시간표: 요약 */}
      {imageType === 'timetable' && entries.length > 0 && (
        <Box px="sm" py="sm">
          <Text fz="sm" fw={500} mb={8}>
            {totalEntries}개 수업을 읽었어요
          </Text>

          {/* 미니 시간표 뷰 */}
          <SimpleGrid cols={5} spacing={4} mb={8}>
            {['월', '화', '수', '목', '금'].map(day => {
              const dayEntries = entries.filter(e => e.day === day);
              return (
                <Stack key={day} gap={2}>
                  <Text fz={10} fw={600} ta="center" c="dimmed">{day}</Text>
                  {dayEntries.length > 0 ? dayEntries.slice(0, 3).map((e, i) => (
                    <Box
                      key={i}
                      px={4}
                      py={2}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 4,
                        border: '0.5px solid var(--mantine-color-default-border)',
                      }}
                    >
                      <Text fz={9} truncate>{e.subject}</Text>
                    </Box>
                  )) : (
                    <Text fz={9} c="dimmed" ta="center">-</Text>
                  )}
                  {dayEntries.length > 3 && (
                    <Text fz={8} c="dimmed" ta="center">+{dayEntries.length - 3}</Text>
                  )}
                </Stack>
              );
            })}
          </SimpleGrid>
        </Box>
      )}

      {/* 영수증/일반: 텍스트 요약 */}
      {imageType !== 'timetable' && ocrText && (
        <Box px="sm" py="sm">
          <Text fz="sm" lineClamp={3}>{ocrText.slice(0, 200)}</Text>
        </Box>
      )}

      {/* 확인 필요 필드들 */}
      {missingFields.length > 0 && (
        <Box px="sm" pb="sm">
          {missingFields.filter(f => !answers[f.key]).length > 0 && (
            <Text fz={10} c="dimmed" mb={6}>확인이 필요해요</Text>
          )}

          {missingFields.map(field => {
            if (answers[field.key]) {
              return (
                <Group key={field.key} gap={6} mb={4}>
                  <Text fz={11} c="dimmed">{field.label}</Text>
                  <Text fz={11} fw={500}>{answers[field.key]}</Text>
                </Group>
              );
            }

            if (field.options) {
              return (
                <Box key={field.key} mb={8}>
                  <Text fz={11} c="dimmed" mb={4}>{field.label}</Text>
                  <Group gap={4}>
                    {field.options.map(opt => (
                      <UnstyledButton
                        key={opt}
                        onClick={() => handleAnswer(field.key, opt)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 14,
                          fontSize: 12,
                          border: '0.5px solid var(--mantine-color-default-border)',
                          color: 'var(--mantine-color-dimmed)',
                          transition: 'all 150ms',
                        }}
                      >
                        {opt}
                      </UnstyledButton>
                    ))}
                  </Group>
                </Box>
              );
            }

            return (
              <Box key={field.key} mb={8}>
                <Text fz={11} c="dimmed" mb={4}>{field.label}</Text>
                {editingField === field.key ? (
                  <TextInput
                    size="xs"
                    placeholder={`${field.label} 입력`}
                    value={fieldValue}
                    onChange={e => setFieldValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && fieldValue.trim()) {
                        handleAnswer(field.key, fieldValue);
                        setFieldValue('');
                        setEditingField(null);
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
                ) : (
                  <UnstyledButton
                    onClick={() => { setEditingField(field.key); setFieldValue(''); }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 14,
                      fontSize: 12,
                      border: '0.5px solid var(--mantine-color-default-border)',
                      color: 'var(--mantine-color-dimmed)',
                    }}
                  >
                    + {field.label} 입력
                  </UnstyledButton>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* 하단 */}
      <Group
        px="sm"
        py={6}
        justify="space-between"
        style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <UnstyledButton
          onClick={() => router.push('/my')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mantine-color-dimmed)' }}
        >
          내 우주에서 보기 <ArrowRight size={11} />
        </UnstyledButton>
        {entries.length > 0 && (
          <Text fz={10} c="dimmed">{entries.length}개 기록 예정</Text>
        )}
      </Group>
    </Box>
  );
}

// Registry 등록
registerTool({
  id: 'image',
  label: '이미지',
  match: (input) => /\[이미지:/.test(input),
  parse: (input) => ({ _rawInput: input }),
  component: ImageTool,
});

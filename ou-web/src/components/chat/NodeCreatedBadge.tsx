'use client';

import { Box, Text, Group, Badge, UnstyledButton, Stack, TextInput } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, CalendarBlank, ListChecks, Lightbulb,
  CurrencyCircleDollar, User, Brain, Check, Repeat,
  SmileyWink, Package, Broadcast, GraduationCap,
  PlayCircle, MapPin, Question,
} from '@phosphor-icons/react';
import { getDomainLabel, getDomainStyle, getDomainIcon, getConfidenceLabel, getConfidenceNumeric } from '@/lib/utils/domain';

// Phosphor icon component lookup
const ICON_MAP: Record<string, React.ElementType> = {
  CalendarBlank, ListChecks, Lightbulb, CurrencyCircleDollar,
  User, Brain, Repeat, SmileyWink, Package, Broadcast,
  GraduationCap, PlayCircle, MapPin, Question,
};

function getIconComponent(domain: string): React.ElementType {
  const iconName = getDomainIcon(domain);
  return ICON_MAP[iconName] ?? Brain;
}

// 도메인별 필수 필드 정의
const DOMAIN_FIELDS: Record<string, string[]> = {
  schedule: ['날짜', '장소'],
  task: ['마감일'],
  finance: ['카테고리'],
  relation: ['관계'],
};

interface NodeCreatedBadgeProps {
  domain: string;
  nodeId?: string;
  userMessage?: string;
  confidence?: string;
  onAddInfo?: (text: string) => void;
}

export function NodeCreatedBadge({ domain, nodeId, userMessage, confidence, onAddInfo }: NodeCreatedBadgeProps) {
  const router = useRouter();
  const domainLabel = getDomainLabel(domain);
  const domainStyle = getDomainStyle(domain);
  const Icon = getIconComponent(domain);
  const fields = DOMAIN_FIELDS[domain] ?? [];
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [filledFields, setFilledFields] = useState<Record<string, string>>({});
  const [faded, setFaded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 10초 후 자동 페이드
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFaded(true);
    }, 10000);

    return () => clearTimeout(fadeTimer);
  }, []);

  // 페이드 애니메이션 완료 후 높이 축소
  useEffect(() => {
    if (!faded) return;
    const hideTimer = setTimeout(() => {
      setHidden(true);
    }, 1000); // CSS transition 1초 후
    return () => clearTimeout(hideTimer);
  }, [faded]);

  // 사용자 메시지에서 이미 포함된 정보 감지 → 해당 필드 숨김
  const missingFields = fields.filter(field => {
    const msg = (userMessage ?? '').toLowerCase();
    if (field === '날짜' && /\d{1,2}[월일]|요일|내일|모레|오늘|다음주|이번주/.test(msg)) return false;
    if (field === '장소' && /호텔|레스토랑|카페|학교|회사|역|공원|집/.test(msg)) return false;
    if (field === '마감일' && /까지|마감|\d{1,2}일|\d{1,2}월/.test(msg)) return false;
    if (field === '카테고리') return true; // 항상 선택 가능
    if (field === '관계' && /친구|가족|동료|선배|후배|학원|학교/.test(msg)) return false;
    return !filledFields[field];
  });

  const handleFieldSubmit = (field: string) => {
    if (!fieldValue.trim()) return;
    setFilledFields(prev => ({ ...prev, [field]: fieldValue }));
    if (onAddInfo) {
      onAddInfo(`${field}: ${fieldValue}`);
    }
    setFieldValue('');
    setEditingField(null);
  };

  return (
    <Box
      ref={containerRef}
      mt="xs"
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
        animation: 'ou-fade-in 300ms ease',
        opacity: faded ? 0 : 1,
        transition: 'opacity 1s ease',
        ...(hidden ? { height: 0, margin: 0, padding: 0, border: 'none' } : {}),
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
        <Icon size={14} weight="fill" />
        <Badge
          variant="light"
          color="gray"
          size="xs"
          style={{
            borderStyle: domainStyle.borderStyle,
            borderWidth: domainStyle.borderWidth,
            borderColor: 'var(--mantine-color-default-border)',
            borderRadius: domainStyle.borderRadius,
            fontWeight: domainStyle.fontWeight,
          }}
        >
          {domainLabel} 기록됨
        </Badge>
        {/* Confidence dot */}
        {confidence && (() => {
          const numericVal = getConfidenceNumeric(confidence);
          const isHigh = numericVal > 0.8;
          const isMedium = numericVal >= 0.5 && numericVal <= 0.8;
          return (
            <Box
              component="span"
              title={`신뢰도: ${getConfidenceLabel(confidence)}`}
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: '1.5px solid var(--mantine-color-gray-5)',
                background: isHigh
                  ? 'var(--mantine-color-gray-5)'
                  : isMedium
                    ? 'linear-gradient(to top, var(--mantine-color-gray-5) 50%, transparent 50%)'
                    : 'transparent',
              }}
            />
          );
        })()}
        {missingFields.length === 0 && (
          <Check size={12} style={{ color: 'var(--mantine-color-green-5)' }} />
        )}
      </Group>

      {/* 기록된 내용 */}
      <Box px="sm" py="sm">
        <Text fz="xs" c="dimmed" mb={4}>기록됨</Text>
        <Text fz="sm" fw={500} mb={filledFields && Object.keys(filledFields).length > 0 ? 8 : 0}>
          {userMessage ?? '데이터 기록됨'}
        </Text>

        {/* 채워진 추가 필드 */}
        {Object.entries(filledFields).map(([key, val]) => (
          <Group key={key} gap={4} mb={2}>
            <Text fz={11} c="dimmed">{key}:</Text>
            <Text fz={11}>{val}</Text>
          </Group>
        ))}
      </Box>

      {/* 추가 가능한 필드 — 이미 입력된 건 안 보임 */}
      {missingFields.length > 0 && (
        <Box px="sm" pb="sm">
          <Group gap={6} mb={editingField ? 8 : 0}>
            {missingFields.map(field => (
              <UnstyledButton
                key={field}
                onClick={() => {
                  setEditingField(editingField === field ? null : field);
                  setFieldValue('');
                }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 14,
                  fontSize: 12,
                  border: '0.5px solid var(--mantine-color-default-border)',
                  background: editingField === field ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: 'var(--mantine-color-dimmed)',
                  transition: 'all 150ms',
                }}
              >
                + {field}
              </UnstyledButton>
            ))}
          </Group>

          {editingField && (
            <TextInput
              size="xs"
              placeholder={`${editingField} 입력`}
              value={fieldValue}
              onChange={e => setFieldValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleFieldSubmit(editingField);
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--mantine-color-dimmed)',
          }}
        >
          내 우주에서 보기 <ArrowRight size={11} />
        </UnstyledButton>
      </Group>
    </Box>
  );
}

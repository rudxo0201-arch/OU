'use client';

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
    <div
      ref={containerRef}
      style={{
        marginTop: 8,
        border: '0.5px solid var(--ou-border-subtle)',
        borderRadius: 'var(--ou-radius-md)',
        overflow: 'hidden',
        animation: 'ou-fade-in 300ms ease',
        opacity: faded ? 0 : 1,
        transition: 'opacity 1s ease',
        ...(hidden ? { height: 0, margin: 0, padding: 0, border: 'none' } : {}),
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 4,
          alignItems: 'center',
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '0.5px solid var(--ou-border-subtle)',
        }}
      >
        <Icon size={14} weight="fill" />
        <span
          style={{
            borderStyle: domainStyle.borderStyle,
            borderWidth: domainStyle.borderWidth,
            borderColor: 'var(--ou-border-subtle)',
            borderRadius: domainStyle.borderRadius,
            fontWeight: domainStyle.fontWeight,
            fontSize: 10,
            padding: '2px 8px',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--ou-text-dimmed)',
          }}
        >
          {domainLabel} 기록됨
        </span>
        {/* Confidence dot */}
        {confidence && (() => {
          const numericVal = getConfidenceNumeric(confidence);
          const isHigh = numericVal > 0.8;
          const isMedium = numericVal >= 0.5 && numericVal <= 0.8;
          return (
            <span
              title={`신뢰도: ${getConfidenceLabel(confidence)}`}
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: '1.5px solid var(--ou-text-dimmed)',
                background: isHigh
                  ? 'var(--ou-text-dimmed)'
                  : isMedium
                    ? 'linear-gradient(to top, var(--ou-text-dimmed) 50%, transparent 50%)'
                    : 'transparent',
              }}
            />
          );
        })()}
        {missingFields.length === 0 && (
          <Check size={12} style={{ color: 'var(--ou-text-dimmed)' }} />
        )}
      </div>

      {/* 기록된 내용 */}
      <div style={{ padding: '8px 12px' }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', display: 'block', marginBottom: 4 }}>기록됨</span>
        <span style={{ fontSize: 13, fontWeight: 500, display: 'block', color: 'var(--ou-text-body)', marginBottom: filledFields && Object.keys(filledFields).length > 0 ? 8 : 0 }}>
          {userMessage ?? '데이터 기록됨'}
        </span>

        {/* 채워진 추가 필드 */}
        {Object.entries(filledFields).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{key}:</span>
            <span style={{ fontSize: 11, color: 'var(--ou-text-body)' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* 추가 가능한 필드 — 이미 입력된 건 안 보임 */}
      {missingFields.length > 0 && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: editingField ? 8 : 0 }}>
            {missingFields.map(field => (
              <button
                key={field}
                onClick={() => {
                  setEditingField(editingField === field ? null : field);
                  setFieldValue('');
                }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 14,
                  fontSize: 12,
                  border: '0.5px solid var(--ou-border-subtle)',
                  background: editingField === field ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: 'var(--ou-text-dimmed)',
                  transition: 'all 150ms',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                + {field}
              </button>
            ))}
          </div>

          {editingField && (
            <input
              type="text"
              placeholder={`${editingField} 입력`}
              value={fieldValue}
              onChange={e => setFieldValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleFieldSubmit(editingField);
              }}
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-md)',
                padding: '6px 10px',
                fontSize: 12,
                color: 'var(--ou-text-body)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          )}
        </div>
      )}

      {/* 하단 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '6px 12px',
          borderTop: '0.5px solid var(--ou-border-subtle)',
        }}
      >
        <button
          onClick={() => router.push('/my')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--ou-text-dimmed)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          내 우주에서 보기 <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

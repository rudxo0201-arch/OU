/**
 * Domain utilities — Single source of truth for domain labels, styles, icons.
 *
 * All styles are grayscale per design rules (no color backgrounds/borders).
 * Differentiation is through border-style and font-weight variations.
 */

import type { DataNodeDomain } from '@/types';

// ── Korean labels ──────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  habit: '습관',
  knowledge: '지식',
  idea: '아이디어',
  relation: '인물',
  emotion: '감정',
  finance: '가계부',
  product: '상품',
  broadcast: '방송',
  education: '교육',
  media: '미디어',
  location: '장소',
  unresolved: '기타',
  development: '개발',
};

export function getDomainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain;
}

// ── Predicate Korean labels ────────────────────────────────────

const PREDICATE_LABELS: Record<string, string> = {
  is_a: '~은/는 ~이다',
  part_of: '~의 일부',
  causes: '~를 유발',
  derived_from: '~에서 유래',
  related_to: '~와 관련',
  opposite_of: '~의 반대',
  requires: '~가 필요',
  example_of: '~의 예시',
  involves: '~에 관여',
  located_at: '~에 위치',
  occurs_at: '~에 발생',
};

export function getPredicateLabel(predicate: string): string {
  return PREDICATE_LABELS[predicate] ?? predicate;
}

// ── Domain styles (grayscale, differentiated by border) ────────

export interface DomainStyle {
  borderStyle: string;
  borderWidth: string;
  borderRadius: string;
  fontWeight: number;
}

const DOMAIN_STYLES: Record<string, DomainStyle> = {
  schedule: {
    borderStyle: 'solid',
    borderWidth: '1.5px',
    borderRadius: '6px',
    fontWeight: 600,
  },
  finance: {
    borderStyle: 'dashed',
    borderWidth: '1px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  relation: {
    borderStyle: 'double',
    borderWidth: '3px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  knowledge: {
    borderStyle: 'solid',
    borderWidth: '0.5px',
    borderRadius: '6px',
    fontWeight: 400,
  },
  emotion: {
    borderStyle: 'solid',
    borderWidth: '0.5px',
    borderRadius: '9999px',
    fontWeight: 400,
  },
  habit: {
    borderStyle: 'dotted',
    borderWidth: '1px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  task: {
    borderStyle: 'solid',
    borderWidth: '1px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  idea: {
    borderStyle: 'solid',
    borderWidth: '0.5px',
    borderRadius: '8px',
    fontWeight: 400,
  },
  product: {
    borderStyle: 'solid',
    borderWidth: '1px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  broadcast: {
    borderStyle: 'dashed',
    borderWidth: '0.5px',
    borderRadius: '6px',
    fontWeight: 400,
  },
  education: {
    borderStyle: 'solid',
    borderWidth: '1px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  media: {
    borderStyle: 'solid',
    borderWidth: '0.5px',
    borderRadius: '8px',
    fontWeight: 400,
  },
  location: {
    borderStyle: 'dotted',
    borderWidth: '1px',
    borderRadius: '8px',
    fontWeight: 400,
  },
  unresolved: {
    borderStyle: 'solid',
    borderWidth: '0.5px',
    borderRadius: '6px',
    fontWeight: 400,
  },
  development: {
    borderStyle: 'solid',
    borderWidth: '1px',
    borderRadius: '4px',
    fontWeight: 500,
  },
};

const DEFAULT_STYLE: DomainStyle = {
  borderStyle: 'solid',
  borderWidth: '0.5px',
  borderRadius: '6px',
  fontWeight: 400,
};

export function getDomainStyle(domain: string): DomainStyle {
  return DOMAIN_STYLES[domain] ?? DEFAULT_STYLE;
}

// ── Phosphor icon names ────────────────────────────────────────

const DOMAIN_ICONS: Record<string, string> = {
  schedule: 'CalendarBlank',
  task: 'ListChecks',
  habit: 'Repeat',
  knowledge: 'Brain',
  idea: 'Lightbulb',
  relation: 'User',
  emotion: 'SmileyWink',
  finance: 'CurrencyCircleDollar',
  product: 'Package',
  broadcast: 'Broadcast',
  education: 'GraduationCap',
  media: 'PlayCircle',
  location: 'MapPin',
  unresolved: 'Question',
  development: 'Code',
};

export function getDomainIcon(domain: string): string {
  return DOMAIN_ICONS[domain] ?? 'Circle';
}

// ── Confidence utilities ───────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function getConfidenceLabel(confidence: string | undefined | null): string {
  if (!confidence) return '보통';
  switch (confidence) {
    case 'high': return '높음';
    case 'medium': return '보통';
    case 'low': return '낮음';
    default: return '보통';
  }
}

/**
 * Confidence numeric value (for display).
 * - high   > 0.8
 * - medium   0.5–0.8
 * - low    < 0.5
 */
export function getConfidenceNumeric(confidence: string | undefined | null): number {
  switch (confidence) {
    case 'high': return 0.9;
    case 'medium': return 0.65;
    case 'low': return 0.3;
    default: return 0.65;
  }
}

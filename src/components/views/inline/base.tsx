'use client';

/**
 * 인라인 뷰 공통 베이스 컴포넌트
 * 글래스모피즘 + 다크 테크 디자인 시스템
 */

import React from 'react';

// ── 글래스 토큰 ───────────────────────────────────────────
export const NEU = {
  card: {
    background: 'var(--ou-glass)',
    backdropFilter: 'var(--ou-blur-light)',
    WebkitBackdropFilter: 'var(--ou-blur-light)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'var(--ou-shadow-sm)',
    padding: '20px 22px',
    border: '1px solid var(--ou-glass-border)',
  } as React.CSSProperties,

  cardPressed: {
    background: 'var(--ou-glass-active)',
    backdropFilter: 'var(--ou-blur-light)',
    WebkitBackdropFilter: 'var(--ou-blur-light)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'none',
    padding: '20px 22px',
    border: '1px solid var(--ou-glass-border-hover)',
  } as React.CSSProperties,

  pill: {
    background: 'var(--ou-glass)',
    backdropFilter: 'var(--ou-blur-light)',
    WebkitBackdropFilter: 'var(--ou-blur-light)',
    borderRadius: '999px',
    boxShadow: 'none',
    padding: '4px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    border: '1px solid var(--ou-glass-border)',
  } as React.CSSProperties,
} as const;

// ── 타이포 ────────────────────────────────────────────────
export const TYPE = {
  label: {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'var(--ou-text-muted)',
  } as React.CSSProperties,

  emphasis: {
    fontSize: '34px',
    fontWeight: 800,
    color: 'var(--ou-text-heading)',
    letterSpacing: '-0.03em',
    lineHeight: 1,
  } as React.CSSProperties,

  emphasisMd: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--ou-text-heading)',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  } as React.CSSProperties,

  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--ou-text-strong)',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,

  sub: {
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--ou-text-secondary)',
  } as React.CSSProperties,

  meta: {
    fontSize: '11px',
    fontWeight: 400,
    color: 'var(--ou-text-muted)',
  } as React.CSSProperties,
} as const;

// ── 공통 카드 래퍼 ────────────────────────────────────────
interface InlineCardProps {
  label?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function InlineCard({ label, children, style }: InlineCardProps) {
  return (
    <div style={{ ...NEU.card, ...style }}>
      {label && <div style={{ ...TYPE.label, marginBottom: '10px' }}>{label}</div>}
      {children}
    </div>
  );
}

// ── 유틸 ──────────────────────────────────────────────────
export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDay(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return String(d.getDate());
  } catch {
    return '';
  }
}

export function formatDayOfWeek(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { weekday: 'short' });
  } catch {
    return '';
  }
}

export function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '';
  // "15:00" → "15:00" 또는 "3:00 PM" 형식 처리
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
  try {
    const d = new Date(`2000-01-01T${timeStr}`);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return timeStr;
  }
}

export function formatAmount(amount: number | string | undefined): string {
  if (!amount) return '0';
  const n = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount;
  return n.toLocaleString('ko-KR');
}

export function getDDay(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-day';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  } catch {
    return '';
  }
}

/** 첫 번째 노드의 domain_data 추출 */
export function extractData(nodes: any[]): Record<string, any> {
  if (!nodes || nodes.length === 0) return {};
  const node = nodes[0];
  return node?.domain_data || {};
}

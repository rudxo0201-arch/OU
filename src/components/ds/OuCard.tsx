'use client';

import { CSSProperties, MouseEvent, ReactNode, useState } from 'react';

/**
 * 우주에 떠 있는 것들. 배경색 없음. 테두리와 글로우로만 형태를 드러냄.
 *
 * variant:
 * - floating  : 투명 배경 + hairline 테두리 + glow (기본, 구 floating-block)
 * - glass     : surface-faint 배경 + hairline + blur (구 glass-block)
 * - white     : 흰색 배경 + dark 테두리 (대비용 카드)
 * - pill      : 가로 컴팩트 pill 형태
 * - ghost     : 테두리만 (no glow)
 *
 * 레거시 alias (기존 코드 호환):
 * - dark / raised / flat / pressed → floating
 * - light → white
 * - planet → floating (halftone 슬롯은 별도 컴포넌트로 분리)
 * - luminous → white
 */
export type OuCardVariant =
  | 'floating' | 'glass' | 'white' | 'pill' | 'ghost'
  | 'dark' | 'raised' | 'flat' | 'pressed' | 'light' | 'planet' | 'luminous';

export type OuCardSize = 'sm' | 'md' | 'lg';

export interface OuCardProps {
  children: ReactNode;
  padding?: number | string;
  elevated?: boolean;
  hoverable?: boolean;
  variant?: OuCardVariant;
  size?: OuCardSize;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
  className?: string;
}

const PADDING_BY_SIZE: Record<OuCardSize, number> = { sm: 16, md: 24, lg: 32 };

function resolveVariant(v: OuCardVariant): 'floating' | 'glass' | 'white' | 'pill' | 'ghost' {
  if (v === 'dark' || v === 'raised' || v === 'flat' || v === 'pressed' || v === 'planet') return 'floating';
  if (v === 'light' || v === 'luminous') return 'white';
  return v as 'floating' | 'glass' | 'white' | 'pill' | 'ghost';
}

export function OuCard({
  children,
  padding,
  elevated = false,
  hoverable = false,
  variant = 'floating',
  size = 'md',
  onClick,
  style,
  className,
}: OuCardProps) {
  const [hovered, setHovered] = useState(false);

  const resolved = resolveVariant(variant);
  const isInteractive = !!(hoverable || onClick);
  const p = padding !== undefined
    ? (typeof padding === 'number' ? `${padding}px` : padding)
    : `${PADDING_BY_SIZE[size]}px`;

  const baseTransition = 'background var(--ou-transition-fast), border-color var(--ou-transition-fast), box-shadow var(--ou-transition-fast), transform var(--ou-transition-fast)';

  // ── floating ──────────────────────────────────────────────────
  if (resolved === 'floating') {
    return (
      <div
        style={{
          background: 'transparent',
          border: `1px solid ${hovered && isInteractive ? 'var(--ou-border-hover)' : 'var(--ou-border-card)'}`,
          borderRadius: 'var(--ou-radius-card)',
          padding: p,
          boxShadow: hovered && isInteractive
            ? 'var(--ou-glow-hover)'
            : elevated ? 'var(--ou-glow-md)' : 'var(--ou-glow-sm)',
          transform: isInteractive && hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: baseTransition,
          cursor: onClick ? 'pointer' : 'default',
          ...style,
        }}
        className={className}
        onClick={onClick}
        onMouseEnter={() => isInteractive && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </div>
    );
  }

  // ── glass ──────────────────────────────────────────────────────
  if (resolved === 'glass') {
    return (
      <div
        style={{
          background: hovered && isInteractive ? 'var(--ou-surface-hover)' : 'var(--ou-surface-faint)',
          backdropFilter: 'var(--ou-blur-md)',
          WebkitBackdropFilter: 'var(--ou-blur-md)',
          border: `1px solid ${hovered && isInteractive ? 'var(--ou-border-hover)' : 'var(--ou-border-card)'}`,
          borderRadius: 'var(--ou-radius-card)',
          padding: p,
          boxShadow: hovered && isInteractive
            ? 'var(--ou-glow-hover)'
            : elevated ? 'var(--ou-glow-md)' : 'var(--ou-glow-sm)',
          transform: isInteractive && hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: baseTransition,
          cursor: onClick ? 'pointer' : 'default',
          ...style,
        }}
        className={className}
        onClick={onClick}
        onMouseEnter={() => isInteractive && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </div>
    );
  }

  // ── white ──────────────────────────────────────────────────────
  if (resolved === 'white') {
    return (
      <div
        style={{
          background: '#ffffff',
          border: `0.5px solid ${hovered && isInteractive ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 'var(--ou-radius-card)',
          padding: p,
          boxShadow: hovered && isInteractive
            ? '0 0 40px 8px rgba(255,255,255,0.20), 0 0 80px rgba(255,255,255,0.08)'
            : elevated
              ? '0 0 40px 8px rgba(255,255,255,0.18), 0 0 80px rgba(255,255,255,0.06)'
              : '0 0 24px 4px rgba(255,255,255,0.12), 0 0 48px rgba(255,255,255,0.05)',
          color: '#000000',
          transform: isInteractive && hovered ? 'translateY(-3px)' : 'translateY(0)',
          transition: baseTransition,
          cursor: onClick ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
        className={className}
        onClick={onClick}
        onMouseEnter={() => isInteractive && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 내부 미세 radial highlight */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          borderRadius: 'inherit',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.60), transparent 60%)',
          zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </div>
    );
  }

  // ── pill ──────────────────────────────────────────────────────
  if (resolved === 'pill') {
    return (
      <div
        style={{
          background: 'transparent',
          border: `0.5px solid ${hovered && isInteractive ? 'var(--ou-border-hover)' : 'var(--ou-border-card)'}`,
          borderRadius: 'var(--ou-radius-card)',
          padding: p,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--ou-space-3)',
          boxShadow: hovered && isInteractive ? 'var(--ou-glow-sm)' : 'none',
          transform: isInteractive && hovered ? 'translateX(2px)' : 'translateX(0)',
          transition: baseTransition,
          cursor: onClick ? 'pointer' : 'default',
          ...style,
        }}
        className={className}
        onClick={onClick}
        onMouseEnter={() => isInteractive && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </div>
    );
  }

  // ── ghost ─────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: 'transparent',
        border: `1px solid ${hovered && isInteractive ? 'var(--ou-border-card)' : 'var(--ou-border-subtle)'}`,
        borderRadius: 'var(--ou-radius-card)',
        padding: p,
        boxShadow: 'none',
        transform: isInteractive && hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: baseTransition,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      className={className}
      onClick={onClick}
      onMouseEnter={() => isInteractive && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}

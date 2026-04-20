'use client';
import { CSSProperties, ReactNode } from 'react';
import { NeuButton } from './NeuButton';

interface NeuPageLayoutProps {
  children: ReactNode;
  // 상단 바 설정
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode; // 우측 액션 영역
  // 콘텐츠 영역
  maxWidth?: number | string;
  noPadding?: boolean; // 콘텐츠 영역 padding 제거 (전체 너비 레이아웃용)
  style?: CSSProperties;
  headerStyle?: CSSProperties;
}

export function NeuPageLayout({
  children,
  title,
  onBack,
  backLabel,
  trailing,
  maxWidth,
  noPadding = false,
  style,
  headerStyle,
}: NeuPageLayoutProps) {
  const hasHeader = title || onBack || trailing;

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--ou-bg)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {hasHeader && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderBottom: '1px solid var(--ou-border-faint)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--ou-bg)',
            ...headerStyle,
          }}
        >
          {onBack && (
            <NeuButton variant="ghost" size="sm" onClick={onBack} style={{ padding: '6px 10px', minWidth: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {backLabel && <span style={{ fontSize: 13 }}>{backLabel}</span>}
            </NeuButton>
          )}
          {title && (
            <h1
              style={{
                flex: 1,
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--ou-text-strong)',
                letterSpacing: '-0.3px',
              }}
            >
              {title}
            </h1>
          )}
          {trailing && <div style={{ marginLeft: 'auto' }}>{trailing}</div>}
        </header>
      )}
      <main
        style={{
          flex: 1,
          padding: noPadding ? 0 : 'clamp(16px, 6vw, 80px)',
          maxWidth: maxWidth ?? undefined,
          width: '100%',
          margin: maxWidth ? '0 auto' : undefined,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
    </div>
  );
}

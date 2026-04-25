'use client';
import { forwardRef, InputHTMLAttributes } from 'react';

interface OrbSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onSearch?: (query: string) => void;
}

export const OrbSearch = forwardRef<HTMLInputElement, OrbSearchProps>(
  ({ placeholder = '검색...', onSearch, style, ...props }, ref) => {
    return (
      <div style={{
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-pill)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
        padding: '10px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'all var(--ou-transition)',
        ...style,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" stroke="var(--ou-text-muted)" strokeWidth="1.5" />
          <path d="M16 16l4 4" stroke="var(--ou-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={ref}
          placeholder={placeholder}
          onChange={e => onSearch?.(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent',
            color: 'var(--ou-text-strong)',
            fontSize: 14, fontFamily: 'inherit',
          }}
          {...props}
        />
      </div>
    );
  }
);
OrbSearch.displayName = 'OrbSearch';

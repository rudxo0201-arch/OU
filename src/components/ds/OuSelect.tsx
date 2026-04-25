'use client';
import { CSSProperties, useEffect, useRef, useState } from 'react';

interface OuSelectOption {
  value: string;
  label: string;
}

interface OuSelectProps {
  options: OuSelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

export function OuSelect({ options, value, onChange, label, placeholder = '선택하세요', disabled = false, style }: OuSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ou-text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 'var(--ou-radius-md)',
          border: 'none',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-pressed-sm)',
          fontSize: 13,
          color: selected ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'inherit',
          transition: 'all var(--ou-transition)',
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--ou-bg)',
            borderRadius: 'var(--ou-radius-md)',
            boxShadow: 'var(--ou-neu-raised-lg)',
            overflow: 'hidden',
            animation: 'ou-scale-in 0.12s ease',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: opt.value === value ? 'var(--ou-surface-subtle)' : 'transparent',
                color: opt.value === value ? 'var(--ou-text-heading)' : 'var(--ou-text-body)',
                fontSize: 13,
                fontWeight: opt.value === value ? 600 : 400,
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ou-surface-muted)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = opt.value === value ? 'var(--ou-surface-subtle)' : 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

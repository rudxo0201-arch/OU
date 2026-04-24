'use client';

import { CSSProperties, FormEvent, useState } from 'react';
import { useToast } from '@/components/ds';

interface OrbInputBarProps {
  domain: string;
  placeholder?: string;
}

const DOMAIN_LABEL: Record<string, string> = {
  schedule: '일정', task: '할 일', finance: '지출',
  habit: '습관', note: '노트', idea: '아이디어',
  knowledge: '지식', media: '미디어', location: '장소',
  relation: '인물',
};

/**
 * Orb 전용 하단 입력 바.
 * domainHint로 Orb 도메인을 강제 분류하고, context로 출처를 기록한다.
 */
export function OrbInputBar({ domain, placeholder }: OrbInputBarProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    const text = value.trim();
    setLoading(true);
    setValue('');

    try {
      const res = await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          domainHint: domain,
        }),
      });
      if (!res.ok) throw new Error('기록 실패');

      const data = await res.json();
      const { nodeId, title } = data as { nodeId?: string; title?: string };

      const label = DOMAIN_LABEL[domain] ?? '기록';
      const summary = title ? `${label}에 기록 — ${title}` : `${label}에 기록됨`;

      window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain } }));

      show(summary, 'success', {
        duration: 4000,
        action: nodeId ? {
          label: '취소',
          onClick: () => {
            fetch(`/api/quick?nodeId=${nodeId}`, { method: 'DELETE' }).catch(() => {});
          },
        } : undefined,
      });
    } catch {
      show('오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 6px 0 14px',
    height: 48,
    background: 'rgba(255,255,255,1)',
    border: `1px solid ${focused ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.09)'}`,
    borderRadius: 14,
    boxShadow: focused
      ? '0 0 0 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.10)'
      : '0 1px 2px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.08)',
    transition: 'all 160ms ease',
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: 680,
      zIndex: 100,
    }}>
      <form onSubmit={handleSubmit}>
        <div style={containerStyle}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder ?? '입력...'}
            disabled={loading}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'rgba(0,0,0,0.78)',
              fontFamily: 'var(--ou-font-body)',
              minWidth: 0,
            }}
          />

          {loading ? (
            <span className="ou-spinner" style={{ width: 18, height: 18, flexShrink: 0, marginRight: 6 }} />
          ) : value.trim() ? (
            <button
              type="submit"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(0,0,0,0.88)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#fff',
                fontSize: 15,
                transition: 'transform 120ms ease, background 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.88)')}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.88)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              ↑
            </button>
          ) : (
            <kbd style={{
              padding: '2px 6px',
              marginRight: 6,
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 5,
              fontSize: 10,
              fontFamily: 'var(--ou-font-mono)',
              color: 'rgba(0,0,0,0.32)',
              lineHeight: 1.4,
              flexShrink: 0,
            }}>
              Enter
            </kbd>
          )}
        </div>
      </form>
    </div>
  );
}

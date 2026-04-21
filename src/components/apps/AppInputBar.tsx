'use client';

import { useState, useRef, useCallback } from 'react';

interface AppInputBarProps {
  domain: string;
  placeholder: string;
  onRecorded?: () => void;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * 기록형 앱 하단 고정 AI 입력바.
 * QSD Q채널과 동일 파이프라인 (/api/quick) + domainHint로 분류 스킵.
 */
export function AppInputBar({ domain, placeholder, onRecorded }: AppInputBarProps) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    const text = value.trim();
    if (!text || status === 'loading') return;

    setStatus('loading');
    setValue('');

    try {
      const res = await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, domainHint: domain }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('done');
      onRecorded?.();
      setTimeout(() => setStatus('idle'), 1800);
    } catch {
      setStatus('error');
      setValue(text); // 실패 시 복원
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [value, domain, status, onRecorded]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent & { isComposing: boolean }).isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const statusLabel =
    status === 'loading' ? '저장 중...' :
    status === 'done'    ? '기록됨 ✓' :
    status === 'error'   ? '실패. 다시 시도해 주세요' : null;

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      background: 'var(--ou-bg)',
      borderTop: '1px solid var(--ou-border-faint)',
      padding: '12px 24px 16px',
      zIndex: 20,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-pressed-md)',
        borderRadius: 12,
        padding: '10px 16px',
      }}>
        {/* AI 아이콘 */}
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ou-text-disabled)' }} />
        </div>

        {/* 입력 필드 */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={status === 'loading'}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 13,
            color: 'var(--ou-text-body)',
            caretColor: 'var(--ou-text-strong)',
          }}
        />

        {/* 상태 표시 or 전송 버튼 */}
        {statusLabel ? (
          <span style={{
            fontSize: 11,
            color: status === 'done' ? 'var(--ou-text-body)' : status === 'error' ? 'var(--ou-text-muted)' : 'var(--ou-text-disabled)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontFamily: 'var(--ou-font-mono)',
          }}>
            {statusLabel}
          </span>
        ) : value.trim() ? (
          <button
            onClick={submit}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-sm)',
              color: 'var(--ou-text-body)',
              fontSize: 14,
              flexShrink: 0,
              transition: 'box-shadow 150ms ease',
            }}
            title="기록 (Enter)"
          >
            ↑
          </button>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)', flexShrink: 0, letterSpacing: '0.04em' }}>
            Enter
          </span>
        )}
      </div>
    </div>
  );
}

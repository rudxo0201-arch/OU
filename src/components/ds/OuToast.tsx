'use client';

import { CSSProperties, createContext, useCallback, useContext, useEffect, useState } from 'react';

type OuToastType = 'info' | 'success' | 'warning' | 'error';

interface OuToastAction {
  label: string;
  onClick: () => void;
}

interface OuToastItem {
  id: string;
  message: string;
  type: OuToastType;
  duration?: number;
  action?: OuToastAction;
}

interface OuToastContextValue {
  show: (message: string, type?: OuToastType, options?: { duration?: number; action?: OuToastAction }) => void;
}

const OuToastContext = createContext<OuToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(OuToastContext);
}

// ── 레퍼런스 스타일 얇은 선 아이콘 ─────────────────────────
function TypeIcon({ type }: { type: OuToastType }) {
  const props = {
    width: 13, height: 13, viewBox: '0 0 13 13', fill: 'none' as const,
    stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  if (type === 'success') return (
    <svg {...props}>
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M4 6.5L5.8 8.3L9 5" />
    </svg>
  );
  if (type === 'warning') return (
    <svg {...props}>
      <path d="M6.5 1.5L11.8 11H1.2L6.5 1.5Z" />
      <path d="M6.5 5.5V7.5" strokeLinecap="round" />
      <circle cx="6.5" cy="9.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
  if (type === 'error') return (
    <svg {...props}>
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M4.5 4.5L8.5 8.5M8.5 4.5L4.5 8.5" />
    </svg>
  );
  return (
    <svg {...props}>
      <circle cx="6.5" cy="6.5" r="5" />
      <path d="M6.5 6V9.5" strokeLinecap="round" />
      <circle cx="6.5" cy="4" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const TYPE_LABEL: Record<OuToastType, string> = {
  success: 'Done',
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
};

// ── 진행 바 (타이머 시각화) ────────────────────────────────
function ProgressBar({ duration }: { duration: number }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: '1.5px',
      width: '100%',
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '0 0 var(--ou-radius-sm) var(--ou-radius-sm)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: '100%',
        background: 'rgba(255,255,255,0.28)',
        transformOrigin: 'left',
        animation: `ou-toast-shrink ${duration}ms linear forwards`,
      }} />
    </div>
  );
}

function ToastItemView({ toast, onRemove }: { toast: OuToastItem; onRemove: (id: string) => void }) {
  const duration = toast.duration ?? 3200;

  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(t);
  }, [toast.id, duration, onRemove]);

  const containerStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 14px 11px 13px',
    // 레퍼런스의 active row — 검정 + inner top highlight
    background: 'var(--ou-accent)',
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.10)',   // 내부 상단 하이라이트
      '0 4px 16px rgba(0,0,0,0.22)',             // 부유감
      '0 1px 4px rgba(0,0,0,0.14)',
    ].join(', '),
    borderRadius: 'var(--ou-radius-sm)',
    color: 'rgba(255,255,255,0.90)',
    fontSize: 'var(--ou-text-sm)',
    fontFamily: 'var(--ou-font-body)',
    animation: 'ou-slide-in-right 280ms cubic-bezier(0.16, 1, 0.3, 1)',
    minWidth: 240,
    maxWidth: 340,
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle}>
      {/* 아이콘 */}
      <span style={{ color: 'rgba(255,255,255,0.45)', display: 'flex', flexShrink: 0 }}>
        <TypeIcon type={toast.type} />
      </span>

      {/* 타입 라벨 */}
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.07em',
        color: 'rgba(255,255,255,0.38)',
        textTransform: 'uppercase' as const,
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {TYPE_LABEL[toast.type]}
      </span>

      {/* 구분선 */}
      <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />

      {/* 메시지 */}
      <span style={{ flex: 1, lineHeight: 1.4, color: 'rgba(255,255,255,0.88)' }}>
        {toast.message}
      </span>

      {/* 액션 버튼 */}
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onRemove(toast.id); }}
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 'var(--ou-radius-xs)',
            color: 'rgba(255,255,255,0.80)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            flexShrink: 0,
            fontFamily: 'var(--ou-font-body)',
            transition: 'background var(--ou-transition-fast)',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
        >
          {toast.action.label}
        </button>
      )}

      {/* 닫기 */}
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="닫기"
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.28)',
          cursor: 'pointer',
          padding: '2px 0 2px 4px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          transition: 'color var(--ou-transition-fast)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.28)'; }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M2 2L9 9M9 2L2 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {/* 하단 타이머 바 */}
      <ProgressBar duration={duration} />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<OuToastItem[]>([]);

  const show = useCallback((
    message: string,
    type: OuToastType = 'info',
    options?: { duration?: number; action?: OuToastAction }
  ) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, ...options }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <OuToastContext.Provider value={{ show }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 6,
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItemView toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </OuToastContext.Provider>
  );
}

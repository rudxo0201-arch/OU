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

const TYPE_COLOR: Record<OuToastType, string> = {
  info:    'var(--ou-info)',
  success: 'var(--ou-success)',
  warning: 'var(--ou-warning)',
  error:   'var(--ou-error)',
};

function ToastItemView({ toast, onRemove }: { toast: OuToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 3200);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onRemove]);

  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: 'var(--ou-surface)',
    border: '1px solid var(--ou-glass-border-hover)',
    borderLeft: `3px solid ${TYPE_COLOR[toast.type]}`,
    borderRadius: 'var(--ou-radius-md)',
    boxShadow: 'var(--ou-shadow-lg)',
    color: 'var(--ou-text-body)',
    fontSize: 'var(--ou-text-sm)',
    animation: 'ou-slide-down 200ms ease-out',
    cursor: 'default',
    maxWidth: 360,
    minWidth: 240,
  };

  return (
    <div style={style}>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onRemove(toast.id); }}
          style={{
            background: 'rgba(0,0,0,0.06)',
            border: '1px solid var(--ou-glass-border)',
            borderRadius: 'var(--ou-radius-xs)',
            color: 'var(--ou-text-body)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            flexShrink: 0,
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--ou-text-muted)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '0 2px',
        }}
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<OuToastItem[]>([]);

  const show = useCallback((message: string, type: OuToastType = 'info', options?: { duration?: number; action?: OuToastAction }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, ...options }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <OuToastContext.Provider value={{ show }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItemView toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </OuToastContext.Provider>
  );
}

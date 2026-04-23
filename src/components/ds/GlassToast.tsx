'use client';

import { CSSProperties, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, options?: { duration?: number; action?: ToastAction }) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TYPE_COLOR: Record<ToastType, string> = {
  info:    'var(--ou-info)',
  success: 'var(--ou-success)',
  warning: 'var(--ou-warning)',
  error:   'var(--ou-error)',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), toast.duration ?? 3200);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onRemove]);

  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: 'var(--ou-glass-elevated)',
    backdropFilter: 'var(--ou-blur)',
    WebkitBackdropFilter: 'var(--ou-blur)',
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
            background: 'rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 6,
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
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info', options?: { duration?: number; action?: ToastAction }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, ...options }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{
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
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

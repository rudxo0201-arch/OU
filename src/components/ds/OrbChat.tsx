'use client';
import { useState, useRef, forwardRef, useImperativeHandle } from 'react';

export interface OrbChatHandle {
  sendMessage: (text: string) => void;
}

interface OrbChatProps {
  placeholder?: string;
  onSend?: (text: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
}

export const OrbChat = forwardRef<OrbChatHandle, OrbChatProps>(
  ({ placeholder = 'Just talk...', onSend, onAttach, disabled }, ref) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const send = () => {
      const text = input.trim();
      if (!text || disabled) return;
      onSend?.(text);
      setInput('');
    };

    useImperativeHandle(ref, () => ({
      sendMessage: (text: string) => { onSend?.(text); }
    }));

    return (
      <div style={{
        background: 'var(--ou-bg)',
        borderRadius: 'var(--ou-radius-lg)',
        boxShadow: 'var(--ou-neu-raised-md)',
        padding: '16px 20px 12px',
        display: 'flex', flexDirection: 'column',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          style={{
            width: '100%', border: 'none', outline: 'none',
            background: 'transparent',
            color: 'var(--ou-text-strong)',
            fontSize: 16, fontFamily: 'inherit',
            resize: 'none', minHeight: 40, lineHeight: 1.6,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10 }}>
          {onAttach && (
            <button
              onClick={onAttach}
              disabled={disabled}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-sm)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 300, color: 'var(--ou-text-secondary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                transition: 'all var(--ou-transition)',
              }}
            >+</button>
          )}
          <span style={{ flex: 1 }} />
          <button
            onClick={send}
            disabled={!input.trim() || disabled}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: input.trim() && !disabled
                ? 'linear-gradient(135deg, var(--ou-accent), var(--ou-accent-secondary))'
                : 'var(--ou-bg)',
              boxShadow: input.trim() && !disabled ? 'var(--ou-neu-raised-sm)' : 'var(--ou-neu-raised-xs)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: !input.trim() || disabled ? 'not-allowed' : 'pointer',
              transition: 'all var(--ou-transition)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7"
                stroke={input.trim() && !disabled ? '#fff' : 'var(--ou-text-disabled)'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    );
  }
);
OrbChat.displayName = 'OrbChat';

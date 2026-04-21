'use client';

import { CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { GlassCard } from '@/components/ds';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface OrbChatProps {
  domainHint?: string;
  placeholder?: string;
}

export function OrbChat({ domainHint, placeholder = '말해보세요...' }: OrbChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          ...(domainHint ? { domainHint } : {}),
        }),
      });

      if (!res.ok) throw new Error('Chat failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // SSE parse
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) full += parsed.text;
              if (parsed.content) full += parsed.content;
            } catch {
              full += data;
            }
          }
        }

        setMessages((prev) => prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: full } : m
        ));
      }

      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsg.id ? { ...m, streaming: false } : m
      ));
    } catch (err) {
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsg.id ? { ...m, content: '오류가 발생했습니다.', streaming: false } : m
      ));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, loading, domainHint]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 'calc(100vh - 52px)',
    }}>
      {/* 메시지 영역 */}
      <div className="ou-scroll" style={{
        flex: 1,
        padding: '24px 24px 16px',
        maxWidth: 720,
        margin: '0 auto',
        width: '100%',
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            color: 'var(--ou-text-muted)',
            fontSize: 'var(--ou-text-sm)',
          }}>
            대화를 시작해보세요.
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 12,
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 16px',
              borderRadius: msg.role === 'user'
                ? '16px 16px 4px 16px'
                : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'var(--ou-accent)' : 'var(--ou-glass)',
              backdropFilter: msg.role === 'assistant' ? 'var(--ou-blur-light)' : undefined,
              WebkitBackdropFilter: msg.role === 'assistant' ? 'var(--ou-blur-light)' : undefined,
              border: msg.role === 'assistant' ? '1px solid var(--ou-glass-border)' : undefined,
              color: msg.role === 'user' ? '#fff' : 'var(--ou-text-body)',
              fontSize: 'var(--ou-text-sm)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content || (msg.streaming ? (
                <span className="ou-spinner" style={{ width: 14, height: 14 }} />
              ) : null)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력바 */}
      <div style={{
        padding: '12px 24px 24px',
        maxWidth: 720,
        margin: '0 auto',
        width: '100%',
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          height: 48,
          background: 'var(--ou-glass)',
          backdropFilter: 'var(--ou-blur)',
          WebkitBackdropFilter: 'var(--ou-blur)',
          border: '1px solid var(--ou-glass-border)',
          borderRadius: 'var(--ou-radius-pill)',
          transition: 'border-color var(--ou-transition-fast)',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            autoFocus
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--ou-text-body)',
              fontSize: 'var(--ou-text-base)',
              fontFamily: 'var(--ou-font-body)',
            }}
          />
          {input.trim() && (
            <button type="submit" disabled={loading} style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--ou-accent)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              flexShrink: 0,
              transition: 'transform var(--ou-transition-fast)',
            }}>
              ↑
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

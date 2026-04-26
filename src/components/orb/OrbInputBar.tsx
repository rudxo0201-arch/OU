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
  relation: '인물', journal: '일기',
};

/**
 * Orb 전용 하단 입력 바.
 *
 * /api/orb-input 사용 — LLM 동기 파싱 + clarification 플로우.
 * 모호한 경우 저장하지 않고 질문 카드를 표시한다.
 */
export function OrbInputBar({ domain, placeholder }: OrbInputBarProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  // clarification 상태
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [clarificationQ, setClarificationQ] = useState<string | null>(null);

  async function submit(text: string, clarificationAnswer?: string) {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/orb-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          domain,
          ...(clarificationAnswer ? { clarificationAnswer } : {}),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        const detail = json?.error ?? '알 수 없는 오류';
        show(`저장 실패: ${detail}`, 'error', { duration: 8000 });
        return;
      }

      if (!json.saved && json.clarification) {
        // clarification 질문 — 저장 보류, 카드 표시
        setPendingText(text);
        setClarificationQ(json.clarification);
        return;
      }

      // 저장 완료
      clearClarification();
      show(`${DOMAIN_LABEL[domain] ?? '기록'}에 기록됨`, 'success', { duration: 3000 });
      window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain } }));
    } catch {
      show('네트워크 오류', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const text = value.trim();
    setValue('');
    await submit(text);
  }

  async function handleClarificationReply(answer: string) {
    if (!pendingText) return;
    const orig = pendingText;
    clearClarification();
    await submit(orig, answer);
  }

  function clearClarification() {
    setPendingText(null);
    setClarificationQ(null);
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
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* clarification 카드 */}
      {clarificationQ && (
        <ClarificationCard
          question={clarificationQ}
          onReply={handleClarificationReply}
          onDismiss={clearClarification}
        />
      )}

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

interface ClarificationCardProps {
  question: string;
  onReply: (answer: string) => void;
  onDismiss: () => void;
}

function ClarificationCard({ question, onReply, onDismiss }: ClarificationCardProps) {
  const [answer, setAnswer] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    onReply(answer.trim());
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)',
      border: '1px solid rgba(0,0,0,0.10)',
      borderRadius: 12,
      padding: '12px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{
          margin: 0,
          fontSize: 13,
          color: 'rgba(0,0,0,0.72)',
          lineHeight: 1.5,
          flex: 1,
        }}>
          {question}
        </p>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(0,0,0,0.32)',
            fontSize: 16,
            lineHeight: 1,
            padding: '0 2px',
            flexShrink: 0,
          }}
          aria-label="취소"
        >
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6 }}>
        <input
          autoFocus
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="답변..."
          style={{
            flex: 1,
            height: 34,
            padding: '0 10px',
            border: '1px solid rgba(0,0,0,0.14)',
            borderRadius: 8,
            fontSize: 13,
            color: 'rgba(0,0,0,0.78)',
            background: 'rgba(0,0,0,0.03)',
            outline: 'none',
            fontFamily: 'var(--ou-font-body)',
          }}
        />
        <button
          type="submit"
          disabled={!answer.trim()}
          style={{
            height: 34,
            padding: '0 12px',
            borderRadius: 8,
            background: answer.trim() ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.12)',
            border: 'none',
            cursor: answer.trim() ? 'pointer' : 'default',
            color: answer.trim() ? '#fff' : 'rgba(0,0,0,0.32)',
            fontSize: 13,
            transition: 'all 120ms ease',
            flexShrink: 0,
          }}
        >
          저장
        </button>
      </form>
    </div>
  );
}

'use client';

/**
 * VideoOrb
 *
 * 영상 전용 Orb 컴포넌트. 댓글/Gemini 자리를 대체.
 *
 * 동작:
 * - 인사이트/의견 → 영상 DataNode에 기록 + 타임스탬프 자동 태깅
 * - 질문 → AI 답변 (영상 트랜스크립트 컨텍스트) → Q&A도 기록
 * - 댓글 인용 → 인용문 + 내 의견 함께 기록
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { PaperPlaneTilt, Quotes } from '@phosphor-icons/react';
import { formatTime } from '@/hooks/useYouTubePlayer';

export interface VideoOrbMessage {
  role: 'user' | 'assistant';
  content: string;
  timestampSeconds?: number;  // 영상 재생 위치
  quotedComment?: string;     // 인용된 댓글
  isQuestion?: boolean;
}

interface Props {
  videoId: string;
  nodeId: string | null;            // 수집 완료 후 설정
  currentTime: number;              // 현재 재생 위치 (초)
  transcriptContext: string | null; // AI 컨텍스트용 트랜스크립트
  quotedComment: string | null;     // 외부에서 주입된 인용 댓글
  onQuoteConsumed: () => void;      // 인용 소비 후 초기화
}

export function VideoOrb({
  videoId,
  nodeId,
  currentTime,
  transcriptContext,
  quotedComment,
  onQuoteConsumed,
}: Props) {
  const [messages, setMessages] = useState<VideoOrbMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 댓글 인용 주입
  useEffect(() => {
    if (quotedComment) {
      setInput(prev => {
        const quote = `> "${quotedComment}"\n\n`;
        return prev ? prev + '\n' + quote : quote;
      });
      textareaRef.current?.focus();
      onQuoteConsumed();
    }
  }, [quotedComment, onQuoteConsumed]);

  // 메시지 추가 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const isQuestion = text.endsWith('?') || text.endsWith('？') || text.startsWith('?') || /^(뭐|무엇|어떻|왜|언제|어디|누가|어떻게|how|what|why|when|where|who)/i.test(text);
    const hasQuote = text.startsWith('>');

    const userMsg: VideoOrbMessage = {
      role: 'user',
      content: text,
      timestampSeconds: currentTime,
      isQuestion,
      quotedComment: hasQuote ? text.split('\n\n')[0].replace(/^>\s*"?/, '').replace(/"?\s*$/, '') : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      if (isQuestion) {
        // 질문 → AI 답변
        const res = await fetch('/api/youtube/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            nodeId,
            question: text,
            transcriptContext,
            currentTime,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const assistantMsg: VideoOrbMessage = {
            role: 'assistant',
            content: data.answer,
            timestampSeconds: currentTime,
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
      } else {
        // 인사이트/의견 → 기록
        if (nodeId) {
          await fetch(`/api/nodes/${nodeId}/annotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'note',
              content: text,
              metadata: { timestampSeconds: currentTime, source: 'video_orb' },
            }),
          });
        }

        // 확인 메시지
        const confirmMsg: VideoOrbMessage = {
          role: 'assistant',
          content: '기록했어요.',
          timestampSeconds: currentTime,
        };
        setMessages(prev => [...prev, confirmMsg]);
      }
    } catch {
      // silent fail
    } finally {
      setSending(false);
    }
  }, [input, sending, currentTime, videoId, nodeId, transcriptContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      borderRadius: 'var(--ou-radius-lg)',
      background: 'var(--ou-bg)',
      boxShadow: 'var(--ou-neu-raised-sm)',
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--ou-border-faint)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ou-text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--ou-text-strong)',
          boxShadow: '0 0 6px 2px color-mix(in srgb, var(--ou-text-strong) 20%, transparent)',
        }} />
        Orb
      </div>

      {/* 메시지 목록 */}
      <div style={{
        padding: '12px 16px',
        minHeight: 120,
        maxHeight: 320,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ou-text-disabled)', textAlign: 'center', padding: '20px 0' }}>
            인사이트나 질문을 입력하면 내 우주에 기록돼요
          </div>
        )}

        {messages.map((msg, i) => (
          <OrbMessage key={i} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--ou-border-faint)',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="인사이트, 질문, 댓글 인용... (Enter로 전송)"
          rows={2}
          style={{
            flex: 1,
            resize: 'none',
            border: 'none',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-pressed-sm)',
            borderRadius: 'var(--ou-radius-md)',
            padding: '8px 12px',
            fontSize: 14,
            color: 'var(--ou-text-body)',
            outline: 'none',
            lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--ou-radius-md)',
            border: 'none',
            background: 'var(--ou-bg)',
            boxShadow: input.trim() && !sending ? 'var(--ou-neu-raised-md)' : 'var(--ou-neu-pressed-sm)',
            cursor: input.trim() && !sending ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: input.trim() && !sending ? 'var(--ou-text-body)' : 'var(--ou-text-disabled)',
            flexShrink: 0,
            transition: 'box-shadow 150ms ease, color 150ms ease',
          }}
        >
          <PaperPlaneTilt size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── 메시지 버블 ─────────────────────────────────────────────────────────────

function OrbMessage({ msg }: { msg: VideoOrbMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: 3,
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '8px 12px',
        borderRadius: 'var(--ou-radius-md)',
        background: 'var(--ou-bg)',
        boxShadow: isUser ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
        fontSize: 13,
        color: 'var(--ou-text-body)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ou-text-disabled)' }}>
        {isUser && msg.timestampSeconds !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            ▶ {formatTime(msg.timestampSeconds)}
          </span>
        )}
        {isUser && msg.role === 'user' && !msg.isQuestion && (
          <span>기록됨 ✓</span>
        )}
        {msg.quotedComment && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Quotes size={10} />
            인용
          </span>
        )}
      </div>
    </div>
  );
}

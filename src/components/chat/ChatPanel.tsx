'use client';

import { useRef, useEffect, useState } from 'react';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { ChatInput, type ChatInputHandle } from './ChatInput';

// Strip LLM meta/view blocks from visible content
function cleanContent(text: string): string {
  let cleaned = text;
  // Remove ```json:view {...}``` blocks
  cleaned = cleaned.replace(/```json:view[\s\S]*?```/g, '').trim();
  // Remove ```json:meta {...}``` blocks
  cleaned = cleaned.replace(/```json:meta[\s\S]*?```/g, '').trim();
  return cleaned;
}

export interface NodeSelectPayload {
  nodeId: string;
  title: string;
  domain: string;
  data?: Record<string, any>;
}

interface ChatPanelProps {
  onNodeSelect?: (payload: NodeSelectPayload) => void;
  autoSendOnOpen?: boolean;
}

export function ChatPanel({ onNodeSelect, autoSendOnOpen }: ChatPanelProps) {
  const { messages } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-send pending message when chat opens
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const pendingSent = useRef(false);
  useEffect(() => {
    if (autoSendOnOpen && !pendingSent.current) {
      const pending = useChatStore.getState().pendingMessage;
      if (pending) {
        pendingSent.current = true;
        useChatStore.getState().setPendingMessage(null);
        setPendingMsg(pending);
      }
    }
    if (!autoSendOnOpen) pendingSent.current = false;
  }, [autoSendOnOpen]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
    }}>
      {/* Messages area */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '24px 20px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {messages.length === 0 && <EmptyState />}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onNodeSelect={onNodeSelect}
            onSendMessage={(text) => chatInputRef.current?.sendMessage(text)}
          />
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px 20px' }}>
        <ChatInput ref={chatInputRef} initialMessage={pendingMsg} onSent={() => setPendingMsg(null)} />
      </div>
    </div>
  );
}

// ---- Empty state ----
function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      opacity: 0.4,
    }}>
      <span style={{
        fontFamily: "var(--font-orbitron, 'Orbitron')",
        fontSize: 24, fontWeight: 700, color: 'var(--ou-text-muted)',
        letterSpacing: 3,
      }}>OU</span>
      <span style={{ fontSize: 14, color: 'var(--ou-text-muted)' }}>
        무엇이든 말해보세요
      </span>
    </div>
  );
}

// ---- Message bubble ----
const BUBBLE_COLLAPSE_THRESHOLD = 400;

function MessageBubble({ message, onNodeSelect, onSendMessage }: {
  message: ChatMessage;
  onNodeSelect?: (payload: NodeSelectPayload) => void;
  onSendMessage?: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const { removeMessage } = useChatStore();
  const isLong = message.content.length > BUBBLE_COLLAPSE_THRESHOLD;

  // 검색 모드: 유저 메시지에 hanjaResults만 있고 assistant 응답이 없는 경우
  const isSearchResult = isUser && message.hanjaResults && message.hanjaResults.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        animation: 'ou-fade-in 0.3s ease',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={isUser ? {
        maxWidth: isSearchResult ? '90%' : '75%',
        padding: '14px 20px',
        borderRadius: '20px 20px 4px 20px',
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-md)',
        fontSize: 15,
        lineHeight: 1.7,
        color: 'var(--ou-text-strong)',
      } : {
        maxWidth: '85%',
        padding: '14px 18px',
        borderRadius: '20px 20px 20px 4px',
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
        fontSize: 15,
        lineHeight: 1.8,
        color: 'var(--ou-text-body)',
      }}>
        {/* YouTube embed */}
        {message.youtubeEmbed && (
          <div style={{
            marginBottom: 8, borderRadius: 10, overflow: 'hidden',
            border: '1px solid var(--ou-border-faint)',
          }}>
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${message.youtubeEmbed.videoId}?rel=0`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Image preview */}
        {message.imagePreview && (
          <div style={{ marginBottom: 8, borderRadius: 10, overflow: 'hidden', maxWidth: 240 }}>
            <img src={message.imagePreview} alt="" style={{ width: '100%', display: 'block', borderRadius: 10 }} />
          </div>
        )}
        {/* File result */}
        {message.fileResult && (
          <div style={{
            marginBottom: 8, padding: '10px 14px', borderRadius: 10,
            border: '0.5px solid var(--ou-border-faint)',
            background: 'var(--ou-border-faint)',
            fontSize: 12, color: 'var(--ou-text-secondary)',
          }}>
            <span style={{ color: 'var(--ou-text-body)' }}>{message.fileResult.fileName}</span>
            {message.fileResult.pageCount && <span> · {message.fileResult.pageCount}페이지</span>}
          </div>
        )}
        {isLong && !expanded ? (
          <span>{cleanContent(message.content.slice(0, BUBBLE_COLLAPSE_THRESHOLD))}...</span>
        ) : (
          cleanContent(message.content)
        )}
        {message.streaming && <StreamingDots />}

        {/* 더보기 / 접기 */}
        {isLong && !message.streaming && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                fontSize: 11, color: 'var(--ou-text-muted)',
                cursor: 'pointer', padding: '3px 10px',
                borderRadius: 'var(--ou-radius-pill)',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-xs)',
              }}
            >{expanded ? '접기' : '더보기'}</button>
            {expanded && (
              <button
                onClick={() => setViewerOpen(true)}
                style={{
                  fontSize: 11, color: 'var(--ou-text-muted)',
                  cursor: 'pointer', padding: '3px 10px',
                  borderRadius: 'var(--ou-radius-pill)',
                  background: 'var(--ou-bg)',
                  boxShadow: 'var(--ou-neu-raised-xs)',
                }}
              >새 창으로</button>
            )}
          </div>
        )}

        {/* 소형 뷰어 윈도우 */}
        {viewerOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={(e) => { if (e.target === e.currentTarget) setViewerOpen(false); }}>
            <div style={{
              width: '80%', maxWidth: 500, maxHeight: '60vh',
              background: 'var(--ou-bg)',
              borderRadius: 'var(--ou-radius-lg)',
              boxShadow: 'var(--ou-neu-raised-lg)',
              padding: 20,
              display: 'flex', flexDirection: 'column',
              resize: 'both', overflow: 'auto',
              minWidth: 280, minHeight: 180,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-muted)', letterSpacing: 1 }}>
                  전체 내용 · {message.content.length.toLocaleString()}자
                </span>
                <button onClick={() => setViewerOpen(false)} style={{ fontSize: 18, color: 'var(--ou-text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{
                flex: 1, overflow: 'auto',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-pressed-sm)',
                borderRadius: 'var(--ou-radius-sm)',
                padding: 14,
                fontSize: 13, lineHeight: 1.7,
                color: 'var(--ou-text-body)',
                whiteSpace: 'pre-wrap',
              }}>
                {message.content}
              </div>
            </div>
          </div>
        )}

        {/* Node created badge */}
        {message.nodeCreated && !message.streaming && (
          <div
            onClick={() => onNodeSelect?.({
              nodeId: message.nodeCreated!.nodeId || '',
              title: message.content.slice(0, 40),
              domain: message.nodeCreated!.domain,
              data: message.nodeCreated!.domain_data,
            })}
            style={{
              marginTop: 10,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              border: '0.5px solid var(--ou-border-faint)',
              fontSize: 11,
              color: 'var(--ou-text-muted)',
              cursor: onNodeSelect ? 'pointer' : 'default',
              transition: '150ms ease',
            }}
          >
            {getDomainLabel(message.nodeCreated.domain)} 기록됨
          </div>
        )}

        {/* Inline view for created nodes */}
        {message.nodeCreated && !message.streaming && (
          <InlineView domain={message.nodeCreated.domain} data={message.nodeCreated.domain_data} content={message.content} />
        )}

        {/* Follow-up suggestions */}
        {message.suggestions && message.suggestions.length > 0 && !message.streaming && (
          <SuggestionsUI suggestions={message.suggestions} onSelect={onSendMessage} />
        )}

        {/* Hanja inline cards */}
        {message.hanjaResults && message.hanjaResults.length > 0 && (
          <HanjaInlineCards results={message.hanjaResults} searchMode={!!isSearchResult} onNodeSelect={onNodeSelect} />
        )}
      </div>

      {/* 말풍선 지우기 */}
      {hovered && !message.streaming && (
        <button
          onClick={() => removeMessage(message.id)}
          title="말풍선 지우기"
          style={{
            position: 'absolute',
            top: -6, right: isUser ? undefined : -6, left: isUser ? -6 : undefined,
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--ou-border-faint)',
            border: '1px solid var(--ou-border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 11,
            color: 'var(--ou-text-muted)',
            transition: '150ms ease',
          }}
        >×</button>
      )}
    </div>
  );
}

function StreamingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 6 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: '50%',
          background: 'var(--ou-text-secondary)',
          animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}

function getDomainLabel(domain: string): string {
  const labels: Record<string, string> = {
    schedule: '일정', finance: '지출', task: '할 일',
    emotion: '감정', idea: '아이디어', habit: '습관',
    knowledge: '지식', relation: '인물', media: '미디어',
    product: '제품', education: '교육', location: '장소',
  };
  return labels[domain] || '데이터';
}

// ---- Inline view for created data ----
function InlineView({ domain, data, content }: { domain: string; data?: Record<string, any>; content: string }) {
  const cardStyle: React.CSSProperties = {
    marginTop: 12,
    padding: '14px 16px',
    borderRadius: 12,
    border: '0.5px solid var(--ou-border-faint)',
    background: 'var(--ou-bg)',
    boxShadow: 'var(--ou-neu-pressed-sm)',
    fontSize: 13,
    color: 'var(--ou-text-body)',
    animation: 'ou-fade-in 0.4s ease',
  };

  if (domain === 'schedule') {
    const date = data?.date || data?.when || data?.datetime || '';
    const title = data?.title || data?.what || content.slice(0, 40);
    const time = data?.time || data?.start_time || '';
    const location = data?.location || data?.place || '';
    const participants = data?.participants || data?.with || '';

    // 날짜 표시용 파싱
    let displayDate = date;
    try {
      if (date) {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          displayDate = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
        }
      }
    } catch { /* skip */ }

    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>SCHEDULE</div>
        {/* 날짜 강조 */}
        {displayDate && (
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--ou-text-secondary)',
            marginBottom: 6,
          }}>{displayDate}</div>
        )}
        {/* 시간 */}
        {time && (
          <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--ou-text-strong)', marginBottom: 4, letterSpacing: -0.5 }}>
            {time}
          </div>
        )}
        {/* 제목 */}
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ou-text-strong)', marginBottom: 4 }}>{title}</div>
        {/* 장소 */}
        {location && (
          <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 2 }}>{location}</div>
        )}
        {/* 함께 */}
        {participants && (
          <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 2 }}>{participants}</div>
        )}
      </div>
    );
  }

  if (domain === 'finance') {
    const amount = data?.amount || '';
    const category = data?.category || '';
    const memo = data?.memo || data?.title || '';
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>FINANCE</div>
        {amount && (
          <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--ou-text-strong)', letterSpacing: -0.5 }}>
            {typeof amount === 'number' ? amount.toLocaleString() + '원' : amount}
          </div>
        )}
        {(category || memo) && (
          <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 6 }}>
            {[category, memo].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    );
  }

  if (domain === 'relation') {
    const person = data?.person || data?.name || '';
    const phone = data?.phone || data?.contact || '';
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>PERSON</div>
        {person && <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ou-text-strong)' }}>{person}</div>}
        {phone && <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 4 }}>{phone}</div>}
      </div>
    );
  }

  if (domain === 'task') {
    const title = data?.title || data?.what || content.slice(0, 40);
    const deadline = data?.deadline || data?.due || '';
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
            border: '1.5px solid var(--ou-text-muted)',
          }} />
          <div>
            <div style={{ fontSize: 14, color: 'var(--ou-text-strong)' }}>{title}</div>
            {deadline && <div style={{ fontSize: 11, color: 'var(--ou-text-secondary)', marginTop: 3 }}>{deadline}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (domain === 'idea') {
    const title = data?.title || content.slice(0, 60);
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>IDEA</div>
        <div style={{ fontSize: 14, color: 'var(--ou-text-body)', lineHeight: 1.6 }}>{title}</div>
      </div>
    );
  }

  if (domain === 'knowledge') {
    const title = data?.title || content.slice(0, 60);
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>KNOWLEDGE</div>
        <div style={{ fontSize: 14, color: 'var(--ou-text-body)', lineHeight: 1.6 }}>{title}</div>
      </div>
    );
  }

  return null;
}

// ---- Suggestions UI: 객관식 + 주관식 ----
function SuggestionsUI({ suggestions, onSelect }: { suggestions: string[]; onSelect?: (text: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [customSent, setCustomSent] = useState(false);

  const handleSelect = (text: string) => {
    if (selected) return;
    setSelected(text);
    onSelect?.(text);
  };

  const handleCustomSend = () => {
    if (!customInput.trim() || customSent) return;
    setCustomSent(true);
    onSelect?.(customInput.trim());
    setCustomInput('');
  };

  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 객관식 칩 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => handleSelect(s)}
            disabled={!!selected}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: '1px solid var(--ou-border-subtle)',
              background: selected === s ? 'var(--ou-border-subtle)' : 'var(--ou-bg)',
              boxShadow: selected === s ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-xs)',
              fontSize: 13,
              color: selected === s ? 'var(--ou-text-strong)' : 'var(--ou-text-secondary)',
              cursor: selected ? 'default' : 'pointer',
              opacity: selected && selected !== s ? 0.35 : 1,
              transition: '150ms ease',
            }}
          >
            {s}
          </button>
        ))}
      </div>
      {/* 주관식 입력 */}
      {!selected && !customSent && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCustomSend(); }}
            placeholder="직접 입력..."
            style={{
              flex: 1, padding: '7px 12px',
              borderRadius: 20,
              border: '1px solid var(--ou-border-faint)',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-xs, inset 1px 1px 3px rgba(0,0,0,0.07))',
              fontSize: 13,
              color: 'var(--ou-text-body)',
              outline: 'none',
            }}
          />
          {customInput.trim() && (
            <button
              onClick={handleCustomSend}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-raised-sm)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 14, color: 'var(--ou-text-secondary)',
              }}
            >→</button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Hanja inline cards ----
type HanjaResult = NonNullable<ChatMessage['hanjaResults']>[number];

function HanjaInlineCards({ results, searchMode, onNodeSelect }: { results: HanjaResult[]; searchMode?: boolean; onNodeSelect?: (payload: NodeSelectPayload) => void }) {
  const [expanded, setExpanded] = useState(searchMode || false);
  const [selected, setSelected] = useState<HanjaResult | null>(null);
  const PREVIEW_COUNT = searchMode ? 20 : 6;

  const visible = expanded ? results : results.slice(0, PREVIEW_COUNT);
  const hasMore = results.length > PREVIEW_COUNT;

  return (
    <div style={{ marginTop: 12 }}>
      {/* Label */}
      <div style={{
        fontSize: 11, color: 'var(--ou-text-muted)',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        漢 한자 {results.length}자 {searchMode ? '분석' : '감지'}
      </div>

      {/* Card grid */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
      }}>
        {visible.map(h => (
          <button
            key={h.char}
            onClick={() => {
              const next = selected?.char === h.char ? null : h;
              setSelected(next);
              if (next && onNodeSelect) {
                onNodeSelect({
                  nodeId: next.nodeId,
                  title: `${next.char}(${next.readings_ko[0] || next.hangul_reading || ''})`,
                  domain: 'knowledge',
                  data: {
                    type: 'hanja',
                    char: next.char,
                    readings_ko: next.readings_ko,
                    ko_hun: next.ko_hun,
                    definition_en: next.definition_en,
                    radical: `${next.radical_char}(${next.radical_name_ko})`,
                    stroke_count: next.stroke_count,
                    grade: next.grade,
                    composition: next.composition,
                  },
                });
              }
            }}
            style={{
              padding: '8px 4px',
              width: 64, minHeight: 72,
              borderRadius: 8,
              border: selected?.char === h.char
                ? '1px solid var(--ou-text-muted)'
                : '1px solid var(--ou-border-faint)',
              background: selected?.char === h.char
                ? 'var(--ou-border-faint)'
                : 'var(--ou-border-faint)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2,
              cursor: 'pointer',
              transition: '150ms ease',
            }}
          >
            <span style={{
              fontSize: 24, fontWeight: 300,
              color: 'var(--ou-text-strong)',
              lineHeight: 1.2,
            }}>
              {h.char}
            </span>
            <span style={{
              fontSize: 10, color: 'var(--ou-text-secondary)',
              lineHeight: 1.2,
            }}>
              {h.readings_ko[0] || h.hangul_reading || ''}
            </span>
            {h.grade && (
              <span style={{
                fontSize: 9, color: 'var(--ou-text-muted)',
              }}>
                {h.grade}급
              </span>
            )}
          </button>
        ))}

        {/* More button */}
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              width: 64, minHeight: 72,
              borderRadius: 8,
              border: '1px solid var(--ou-border-faint)',
              background: 'transparent',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              cursor: 'pointer',
              fontSize: 12, color: 'var(--ou-text-muted)',
            }}
          >
            +{results.length - PREVIEW_COUNT}
            <span style={{ fontSize: 10 }}>더보기</span>
          </button>
        )}
      </div>

      {/* Detail panel */}
      {selected && <HanjaDetail hanja={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function HanjaDetail({ hanja, onClose }: { hanja: HanjaResult; onClose: () => void }) {
  const reading = hanja.readings_ko[0] || hanja.hangul_reading || '';
  const hun = hanja.ko_hun?.[0] || '';
  const label = hun ? `${hun} ${reading}` : reading;

  return (
    <div style={{
      marginTop: 8,
      padding: '14px 16px',
      borderRadius: 10,
      border: '1px solid var(--ou-border-subtle)',
      background: 'var(--ou-border-faint)',
      animation: 'ou-fade-in 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 36, fontWeight: 300, color: 'var(--ou-text-strong)' }}>
            {hanja.char}
          </span>
          <div>
            <div style={{ fontSize: 14, color: 'var(--ou-text-strong)' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--ou-text-secondary)', marginTop: 2 }}>
              부수 {hanja.radical_char}({hanja.radical_name_ko}) · {hanja.stroke_count}획
              {hanja.grade ? ` · ${hanja.grade}급` : ''}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 24, height: 24, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--ou-border-faint)',
          color: 'var(--ou-text-muted)',
          fontSize: 14, cursor: 'pointer',
        }}>×</button>
      </div>

      {/* Definition */}
      {hanja.definition_en && (
        <div style={{
          marginTop: 10, fontSize: 12,
          color: 'var(--ou-text-secondary)', lineHeight: 1.6,
        }}>
          {hanja.definition_en}
        </div>
      )}

      {/* Composition */}
      {hanja.composition?.explanation && (
        <div style={{
          marginTop: 10, padding: '8px 12px',
          borderRadius: 6,
          background: 'var(--ou-border-faint)',
          border: '1px solid var(--ou-border-faint)',
          fontSize: 12, color: 'var(--ou-text-secondary)',
          lineHeight: 1.6,
        }}>
          <span style={{ color: 'var(--ou-text-disabled)', fontSize: 10, marginRight: 6 }}>
            {hanja.composition.type}
          </span>
          {hanja.composition.explanation}
        </div>
      )}
    </div>
  );
}

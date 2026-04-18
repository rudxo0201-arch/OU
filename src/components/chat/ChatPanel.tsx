'use client';

import { useRef, useEffect, useState } from 'react';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { ChatInput } from './ChatInput';

// Strip LLM meta blocks from visible content
function cleanContent(text: string): string {
  // Remove ```json.meta {...}``` blocks
  let cleaned = text.replace(/```json\.meta\s*\{[^}]*\}```/g, '').trim();
  // Remove ```meta {...}``` blocks
  cleaned = cleaned.replace(/```meta\s*\{[^}]*\}```/g, '').trim();
  // Remove standalone json blocks that look like metadata
  cleaned = cleaned.replace(/```json\s*\{"domain"[^`]*```/g, '').trim();
  // Remove triple-backtick wrapped single-line json
  cleaned = cleaned.replace(/```\s*\{"domain"[^`]*```/g, '').trim();
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
  const chatInputRef = useRef<{ sendMessage: (text: string) => void }>(null);

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
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} onNodeSelect={onNodeSelect} />)}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px 20px' }}>
        <ChatInput initialMessage={pendingMsg} onSent={() => setPendingMsg(null)} />
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
        fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
        letterSpacing: 3,
      }}>OU</span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>
        무엇이든 말해보세요
      </span>
    </div>
  );
}

// ---- Message bubble ----
function MessageBubble({ message, onNodeSelect }: { message: ChatMessage; onNodeSelect?: (payload: NodeSelectPayload) => void }) {
  const isUser = message.role === 'user';
  const [hovered, setHovered] = useState(false);
  const { removeMessage } = useChatStore();

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
        padding: '12px 18px',
        borderRadius: '20px 20px 4px 20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 0 16px rgba(255,255,255,0.04)',
        fontSize: 14,
        lineHeight: 1.7,
        color: 'rgba(255,255,255,0.92)',
      } : {
        maxWidth: '85%',
        paddingLeft: 14,
        borderLeft: '1.5px solid rgba(255,255,255,0.12)',
        fontSize: 14,
        lineHeight: 1.8,
        color: 'rgba(255,255,255,0.7)',
      }}>
        {/* YouTube embed */}
        {message.youtubeEmbed && (
          <div style={{
            marginBottom: 8, borderRadius: 10, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
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
            border: '0.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            fontSize: 12, color: 'rgba(255,255,255,0.5)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{message.fileResult.fileName}</span>
            {message.fileResult.pageCount && <span> · {message.fileResult.pageCount}페이지</span>}
          </div>
        )}
        {cleanContent(message.content)}
        {message.streaming && <StreamingDots />}

        {/* Node created badge */}
        {message.nodeCreated && (
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
              padding: '5px 14px',
              borderRadius: 999,
              border: '0.5px solid rgba(255,255,255,0.08)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              boxShadow: '0 0 8px rgba(255,255,255,0.02)',
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
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
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
          background: 'rgba(255,255,255,0.4)',
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
    border: '0.5px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    animation: 'ou-fade-in 0.4s ease',
  };

  if (domain === 'schedule') {
    const date = data?.date || data?.when || '';
    const title = data?.title || data?.what || content.slice(0, 30);
    // Try to parse day number for mini calendar highlight
    const dayMatch = date.match?.(/(\d{1,2})일/) || date.match?.(/\/(\d{1,2})/) || date.match?.(/(\d{1,2})$/);
    const highlightDay = dayMatch ? parseInt(dayMatch[1]) : 0;
    const now = new Date();
    const todayDay = now.getDate();

    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>SCHEDULE</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, marginBottom: 4 }}>{title}</div>
        {date && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{date}</div>}
        {/* Mini calendar */}
        <MiniCalendar highlightDay={highlightDay} todayDay={todayDay} />
      </div>
    );
  }

  if (domain === 'finance') {
    const amount = data?.amount || '';
    const category = data?.category || '';
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>FINANCE</span>
        </div>
        {amount && <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{typeof amount === 'number' ? amount.toLocaleString() + '원' : amount}</div>}
        {category && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{category}</div>}
      </div>
    );
  }

  if (domain === 'relation') {
    const person = data?.person || data?.name || '';
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>PERSON</span>
        </div>
        {person && <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{person}</div>}
      </div>
    );
  }

  if (domain === 'task') {
    const title = data?.title || data?.what || content.slice(0, 30);
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)' }} />
          <span style={{ color: 'rgba(255,255,255,0.8)' }}>{title}</span>
        </div>
      </div>
    );
  }

  if (domain === 'idea' || domain === 'knowledge') {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 6 }}>
          {domain === 'idea' ? 'IDEA' : 'KNOWLEDGE'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)' }}>{data?.title || content.slice(0, 60)}</div>
      </div>
    );
  }

  // Generic fallback
  return null;
}

function MiniCalendar({ highlightDay, todayDay }: { highlightDay: number; todayDay: number }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ maxWidth: 220 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {days.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.2)', padding: 2 }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          const isHighlight = day === highlightDay;
          const isToday = day === todayDay;
          return (
            <div key={i} style={{
              textAlign: 'center', fontSize: 10, padding: '3px 0',
              borderRadius: 4,
              color: isHighlight ? '#fff' : isToday ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
              border: isHighlight
                ? '1px solid rgba(255,255,255,0.5)'
                : isToday
                  ? '1px solid rgba(255,255,255,0.15)'
                  : '1px solid transparent',
              boxShadow: isHighlight ? '0 0 8px rgba(255,255,255,0.1)' : 'none',
              visibility: day ? 'visible' : 'hidden',
            }}>
              {day ?? ''}
            </div>
          );
        })}
      </div>
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
        fontSize: 11, color: 'rgba(255,255,255,0.35)',
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
                ? '1px solid rgba(255,255,255,0.3)'
                : '1px solid rgba(255,255,255,0.08)',
              background: selected?.char === h.char
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.02)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2,
              cursor: 'pointer',
              transition: '150ms ease',
            }}
          >
            <span style={{
              fontSize: 24, fontWeight: 300,
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.2,
            }}>
              {h.char}
            </span>
            <span style={{
              fontSize: 10, color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.2,
            }}>
              {h.readings_ko[0] || h.hangul_reading || ''}
            </span>
            {h.grade && (
              <span style={{
                fontSize: 9, color: 'rgba(255,255,255,0.3)',
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
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'transparent',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              cursor: 'pointer',
              fontSize: 12, color: 'rgba(255,255,255,0.3)',
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
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.03)',
      animation: 'ou-fade-in 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 36, fontWeight: 300, color: 'rgba(255,255,255,0.9)' }}>
            {hanja.char}
          </span>
          <div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              부수 {hanja.radical_char}({hanja.radical_name_ko}) · {hanja.stroke_count}획
              {hanja.grade ? ` · ${hanja.grade}급` : ''}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 24, height: 24, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 14, cursor: 'pointer',
        }}>×</button>
      </div>

      {/* Definition */}
      {hanja.definition_en && (
        <div style={{
          marginTop: 10, fontSize: 12,
          color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
        }}>
          {hanja.definition_en}
        </div>
      )}

      {/* Composition */}
      {hanja.composition?.explanation && (
        <div style={{
          marginTop: 10, padding: '8px 12px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          fontSize: 12, color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.6,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginRight: 6 }}>
            {hanja.composition.type}
          </span>
          {hanja.composition.explanation}
        </div>
      )}
    </div>
  );
}

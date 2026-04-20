'use client';

import { useRef, useEffect, useState } from 'react';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { NeuCard, NeuButton, NeuBadge, NeuModal } from '@/components/ds';
import { AddToHomeButton } from './AddToHomeButton';
import { stripLLMMeta } from '@/lib/utils/stripLLMMeta';
import { ViewOptionsChips } from './OrbFullscreen';

export interface NodeSelectPayload {
  nodeId: string;
  title: string;
  domain: string;
  data?: Record<string, unknown>;
}

interface ChatPanelProps {
  onNodeSelect?: (payload: NodeSelectPayload) => void;
  autoSendOnOpen?: boolean;
}

export function ChatPanel({ onNodeSelect, autoSendOnOpen }: ChatPanelProps) {
  const { messages } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div
        ref={scrollRef}
        className="ou-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {messages.length === 0 && <EmptyState />}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onNodeSelect={onNodeSelect}
            onSendMessage={(text, linkedNodeId) => chatInputRef.current?.sendMessage(text, linkedNodeId)}
          />
        ))}
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <ViewOptionsChips />
        <div style={{ paddingTop: 12 }}>
          <ChatInput ref={chatInputRef} initialMessage={pendingMsg} onSent={() => setPendingMsg(null)} />
        </div>
      </div>
    </div>
  );
}

// ---- Empty state ----
function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingTop: '30%',
        opacity: 0.35,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--ou-font-logo)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ou-text-muted)',
            letterSpacing: 2,
          }}
        >
          OU
        </span>
      </div>
      <span style={{ fontSize: 13, color: 'var(--ou-text-muted)' }}>무엇이든 말해보세요</span>
    </div>
  );
}

// ---- Message bubble ----
const BUBBLE_COLLAPSE_THRESHOLD = 400;

function MessageBubble({
  message,
  onNodeSelect,
  onSendMessage,
}: {
  message: ChatMessage;
  onNodeSelect?: (payload: NodeSelectPayload) => void;
  onSendMessage?: (text: string, linkedNodeId?: string) => void;
}) {
  const isUser = message.role === 'user';
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const { removeMessage } = useChatStore();
  const isLong = message.content.length > BUBBLE_COLLAPSE_THRESHOLD;
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
      <div
        style={{
          maxWidth: isSearchResult ? '90%' : isUser ? '75%' : '85%',
          padding: '14px 18px',
          borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
          background: 'var(--ou-bg)',
          boxShadow: isUser ? 'var(--ou-neu-raised-md)' : 'var(--ou-neu-pressed-sm)',
          fontSize: 15,
          lineHeight: isUser ? 1.7 : 1.8,
          color: isUser ? 'var(--ou-text-strong)' : 'var(--ou-text-body)',
        }}
      >
        {/* YouTube embed */}
        {message.youtubeEmbed && (
          <div style={{ marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--ou-border-faint)' }}>
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
          <NeuCard variant="pressed" size="sm" style={{ marginBottom: 8, padding: '8px 12px' }}>
            <span style={{ fontSize: 12, color: 'var(--ou-text-body)' }}>{message.fileResult.fileName}</span>
            {message.fileResult.pageCount && (
              <span style={{ fontSize: 12, color: 'var(--ou-text-secondary)' }}> · {message.fileResult.pageCount}페이지</span>
            )}
          </NeuCard>
        )}

        {/* Content */}
        {isLong && !expanded
          ? <span>{stripLLMMeta(message.content.slice(0, BUBBLE_COLLAPSE_THRESHOLD))}…</span>
          : stripLLMMeta(message.content)
        }
        {message.streaming && <StreamingDots />}

        {/* 더보기/접기 */}
        {isLong && !message.streaming && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <NeuButton variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} style={{ fontSize: 11, padding: '3px 10px' }}>
              {expanded ? '접기' : '더보기'}
            </NeuButton>
            {expanded && (
              <NeuButton variant="ghost" size="sm" onClick={() => setViewerOpen(true)} style={{ fontSize: 11, padding: '3px 10px' }}>
                새 창으로
              </NeuButton>
            )}
          </div>
        )}

        {/* 소형 뷰어 모달 */}
        <NeuModal
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          title={`전체 내용 · ${message.content.length.toLocaleString()}자`}
          maxWidth={500}
        >
          <NeuCard variant="pressed" style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: 'var(--ou-text-body)', maxHeight: '50vh', overflow: 'auto' }}>
            {stripLLMMeta(message.content)}
          </NeuCard>
        </NeuModal>

        {/* Node created badges (primary + additional) */}
        {message.nodeCreated && !message.streaming && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <div
              onClick={() => onNodeSelect?.({
                nodeId: message.nodeCreated!.nodeId || '',
                title: message.content.slice(0, 40),
                domain: message.nodeCreated!.domain,
                data: message.nodeCreated!.domain_data,
              })}
              style={{ cursor: onNodeSelect ? 'pointer' : 'default' }}
            >
              <NeuBadge>{getDomainLabel(message.nodeCreated.domain)} 기록됨</NeuBadge>
            </div>
            {message.nodeCreated.additionalNodes?.map((n) => (
              <div
                key={n.id}
                onClick={() => onNodeSelect?.({
                  nodeId: n.id,
                  title: message.content.slice(0, 40),
                  domain: n.domain,
                  data: n.domain_data,
                })}
                style={{ cursor: onNodeSelect ? 'pointer' : 'default' }}
              >
                <NeuBadge>{getDomainLabel(n.domain)} 기록됨</NeuBadge>
              </div>
            ))}
          </div>
        )}

        {/* Inline view — primary node */}
        {message.nodeCreated && !message.streaming && (
          <InlineView domain={message.nodeCreated.domain} data={message.nodeCreated.domain_data} content={message.content} />
        )}

        {/* Inline views — additional nodes */}
        {message.nodeCreated?.additionalNodes && !message.streaming && message.nodeCreated.additionalNodes.map((n) => (
          <InlineView key={n.id} domain={n.domain} data={n.domain_data} content={message.content} />
        ))}

        {/* 홈 화면에 추가하기 */}
        {message.nodeCreated && !message.streaming && (
          <AddToHomeButton domain={message.nodeCreated.domain} nodeId={message.nodeCreated.nodeId} />
        )}

        {/* Follow-up suggestions */}
        {message.suggestions && message.suggestions.length > 0 && !message.streaming && (
          <SuggestionsUI
            suggestions={message.suggestions}
            linkedNodeId={message.nodeCreated?.nodeId}
            onSelect={onSendMessage}
          />
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
            top: -6,
            right: isUser ? undefined : -6,
            left: isUser ? -6 : undefined,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-sm)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--ou-text-muted)',
            transition: '150ms ease',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function StreamingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 6 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--ou-text-secondary)',
            animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
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
export function InlineView({ domain, data, content }: { domain: string; data?: Record<string, unknown>; content: string }) {
  const safeContent = stripLLMMeta(content);
  if (domain === 'schedule') {
    const date = (data?.date || data?.when || data?.datetime || '') as string;
    const title = (data?.title || data?.what || safeContent.slice(0, 40)) as string;
    const time = (data?.time || data?.start_time || '') as string;
    const location = (data?.location || data?.place || '') as string;
    const participants = (data?.participants || data?.with || '') as string;

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
      <NeuCard variant="pressed" size="sm" style={{ marginTop: 12, animation: 'ou-fade-in 0.4s ease' }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>SCHEDULE</div>
        {displayDate && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-secondary)', marginBottom: 6 }}>{displayDate}</div>}
        {time && <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--ou-text-strong)', marginBottom: 4, letterSpacing: -0.5 }}>{time}</div>}
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ou-text-strong)', marginBottom: 4 }}>{title}</div>
        {location && <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 2 }}>{location}</div>}
        {participants && <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 2 }}>{participants as string}</div>}
      </NeuCard>
    );
  }

  if (domain === 'finance') {
    const amount = data?.amount || '';
    const category = (data?.category || '') as string;
    const memo = (data?.memo || data?.title || '') as string;
    return (
      <NeuCard variant="pressed" size="sm" style={{ marginTop: 12, animation: 'ou-fade-in 0.4s ease' }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>FINANCE</div>
        {amount && (
          <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--ou-text-strong)', letterSpacing: -0.5 }}>
            {typeof amount === 'number' ? amount.toLocaleString() + '원' : String(amount)}
          </div>
        )}
        {(category || memo) && (
          <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 6 }}>
            {[category, memo].filter(Boolean).join(' · ')}
          </div>
        )}
      </NeuCard>
    );
  }

  if (domain === 'relation') {
    const name = (data?.name || data?.person || '') as string;
    const relationship = (data?.relationship || '') as string;
    const type = (data?.type || '') as string;
    const contact = (data?.contact || data?.phone || '') as string;
    const birthday = (data?.birthday || '') as string;
    const mbti = (data?.mbti || '') as string;
    const job = (data?.job || '') as string;
    const likes = (data?.likes || '') as string;
    const typeLabel: Record<string, string> = { family: '가족', friend: '친구', work: '직장', school: '학교', romantic: '연인', other: '지인' };
    const meta = [relationship || typeLabel[type] || '', birthday ? `🎂 ${birthday}` : '', mbti, job].filter(Boolean).join(' · ');
    return (
      <NeuCard variant="pressed" size="sm" style={{ marginTop: 12, animation: 'ou-fade-in 0.4s ease' }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>PERSON</div>
        {name && <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ou-text-strong)' }}>{name}</div>}
        {meta && <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 4 }}>{meta}</div>}
        {contact && <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginTop: 2 }}>{contact}</div>}
        {likes && <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 6 }}>좋아하는 것: {likes}</div>}
      </NeuCard>
    );
  }

  if (domain === 'task') {
    const title = (data?.title || data?.what || safeContent.slice(0, 40)) as string;
    const deadline = (data?.deadline || data?.due || '') as string;
    return (
      <NeuCard variant="pressed" size="sm" style={{ marginTop: 12, animation: 'ou-fade-in 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2, border: '1.5px solid var(--ou-text-muted)', boxShadow: 'var(--ou-neu-pressed-sm)' }} />
          <div>
            <div style={{ fontSize: 14, color: 'var(--ou-text-strong)' }}>{title}</div>
            {deadline && <div style={{ fontSize: 11, color: 'var(--ou-text-secondary)', marginTop: 3 }}>{deadline}</div>}
          </div>
        </div>
      </NeuCard>
    );
  }

  if (domain === 'idea' || domain === 'knowledge') {
    const title = (data?.title || safeContent.slice(0, 60)) as string;
    return (
      <NeuCard variant="pressed" size="sm" style={{ marginTop: 12, animation: 'ou-fade-in 0.4s ease' }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 10 }}>
          {domain.toUpperCase()}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ou-text-body)', lineHeight: 1.6 }}>{title}</div>
      </NeuCard>
    );
  }

  return null;
}

// ---- Suggestions UI ----
function SuggestionsUI({
  suggestions,
  linkedNodeId,
  onSelect,
}: {
  suggestions: string[];
  linkedNodeId?: string;
  onSelect?: (text: string, linkedNodeId?: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [customSent, setCustomSent] = useState(false);

  const handleSelect = (text: string) => {
    if (selected) return;
    setSelected(text);
    onSelect?.(text, linkedNodeId);
  };

  const handleCustomSend = () => {
    if (!customInput.trim() || customSent) return;
    setCustomSent(true);
    onSelect?.(customInput.trim(), linkedNodeId);
    setCustomInput('');
  };

  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {suggestions.map((s, i) => (
          <NeuButton
            key={i}
            size="sm"
            variant={selected === s ? 'ghost' : 'default'}
            onClick={() => handleSelect(s)}
            disabled={!!selected && selected !== s}
            style={{
              fontSize: 13,
              boxShadow: selected === s ? 'var(--ou-neu-pressed-sm)' : undefined,
              opacity: selected && selected !== s ? 0.35 : 1,
            }}
          >
            {s}
          </NeuButton>
        ))}
      </div>
      {!selected && !customSent && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSend(); }}
            placeholder="직접 입력..."
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: 20,
              border: 'none',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
              fontSize: 13,
              color: 'var(--ou-text-body)',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {customInput.trim() && (
            <NeuButton variant="ghost" size="sm" onClick={handleCustomSend} style={{ padding: '5px 10px' }}>
              →
            </NeuButton>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Hanja inline cards ----
type HanjaResult = NonNullable<ChatMessage['hanjaResults']>[number];

function HanjaInlineCards({
  results,
  searchMode,
  onNodeSelect,
}: {
  results: HanjaResult[];
  searchMode?: boolean;
  onNodeSelect?: (payload: NodeSelectPayload) => void;
}) {
  const [expandAll, setExpandAll] = useState(searchMode || false);
  const [selected, setSelected] = useState<HanjaResult | null>(null);
  const PREVIEW_COUNT = searchMode ? 20 : 6;
  const visible = expandAll ? results : results.slice(0, PREVIEW_COUNT);
  const hasMore = results.length > PREVIEW_COUNT;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        漢 한자 {results.length}자 {searchMode ? '분석' : '감지'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {visible.map((h) => (
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
                    type: 'hanja', char: next.char,
                    readings_ko: next.readings_ko, ko_hun: next.ko_hun,
                    definition_en: next.definition_en,
                    radical: `${next.radical_char}(${next.radical_name_ko})`,
                    stroke_count: next.stroke_count, grade: next.grade,
                    composition: next.composition,
                  },
                });
              }
            }}
            style={{
              padding: '8px 4px',
              width: 64,
              minHeight: 72,
              borderRadius: 8,
              border: 'none',
              background: 'var(--ou-bg)',
              boxShadow: selected?.char === h.char ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              transition: '150ms ease',
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 300, color: 'var(--ou-text-strong)', lineHeight: 1.2 }}>{h.char}</span>
            <span style={{ fontSize: 10, color: 'var(--ou-text-secondary)', lineHeight: 1.2 }}>
              {h.readings_ko[0] || h.hangul_reading || ''}
            </span>
            {h.grade && <span style={{ fontSize: 9, color: 'var(--ou-text-muted)' }}>{h.grade}급</span>}
          </button>
        ))}
        {hasMore && !expandAll && (
          <button
            onClick={() => setExpandAll(true)}
            style={{
              width: 64,
              minHeight: 72,
              borderRadius: 8,
              border: 'none',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-sm)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--ou-text-muted)',
            }}
          >
            +{results.length - PREVIEW_COUNT}
            <span style={{ fontSize: 10 }}>더보기</span>
          </button>
        )}
      </div>
      {selected && <HanjaDetail hanja={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function HanjaDetail({ hanja, onClose }: { hanja: HanjaResult; onClose: () => void }) {
  const reading = hanja.readings_ko[0] || hanja.hangul_reading || '';
  const hun = hanja.ko_hun?.[0] || '';
  const label = hun ? `${hun} ${reading}` : reading;

  return (
    <NeuCard variant="pressed" size="sm" style={{ marginTop: 8, animation: 'ou-fade-in 0.2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 36, fontWeight: 300, color: 'var(--ou-text-strong)' }}>{hanja.char}</span>
          <div>
            <div style={{ fontSize: 14, color: 'var(--ou-text-strong)' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--ou-text-secondary)', marginTop: 2 }}>
              부수 {hanja.radical_char}({hanja.radical_name_ko}) · {hanja.stroke_count}획
              {hanja.grade ? ` · ${hanja.grade}급` : ''}
            </div>
          </div>
        </div>
        <NeuButton variant="ghost" size="sm" onClick={onClose} style={{ padding: '4px 8px', minWidth: 0 }}>×</NeuButton>
      </div>
      {hanja.definition_en && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ou-text-secondary)', lineHeight: 1.6 }}>
          {hanja.definition_en}
        </div>
      )}
      {hanja.composition?.explanation && (
        <NeuCard variant="raised" size="sm" style={{ marginTop: 10, padding: '8px 12px' }}>
          <span style={{ color: 'var(--ou-text-disabled)', fontSize: 10, marginRight: 6 }}>{hanja.composition.type}</span>
          <span style={{ fontSize: 12, color: 'var(--ou-text-secondary)', lineHeight: 1.6 }}>{hanja.composition.explanation}</span>
        </NeuCard>
      )}
    </NeuCard>
  );
}

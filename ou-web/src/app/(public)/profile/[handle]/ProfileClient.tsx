'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { UserPlus, UserMinus, PencilSimple, Globe, Robot, PaperPlaneTilt, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { RankBadge } from '@/components/ui/RankBadge';

interface Persona {
  id: string;
  display_name?: string;
  handle: string;
  bio?: string;
  avatar_url?: string;
}

interface DataNode {
  id: string;
  domain: string;
  raw?: string;
  created_at?: string;
  [key: string]: unknown;
}

// Map domain to user-friendly Korean label
const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  habit: '습관',
  knowledge: '지식',
  idea: '아이디어',
  relation: '관계',
  emotion: '감정',
  finance: '재정',
  product: '상품',
  broadcast: '방송',
  education: '교육',
  media: '미디어',
  location: '장소',
  unresolved: '기타',
};

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export function ProfileClient({ persona, nodes, totalNodeCount }: { persona: Persona; nodes: DataNode[]; totalNodeCount: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const isOwn = user?.id === persona.id;

  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const chatViewport = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatViewport.current?.scrollTo({ top: chatViewport.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || streaming || chatMessages.length >= 20) return;

    const userMsg: ChatMsg = { role: 'user', content: trimmed };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setStreaming(true);
    scrollToBottom();

    // Add placeholder for assistant
    const assistantMsg: ChatMsg = { role: 'assistant', content: '' };
    setChatMessages([...updated, assistantMsg]);

    try {
      const res = await fetch(`/api/profile/${persona.handle}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: updated.slice(-10),
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
              setChatMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: fullText };
                return copy;
              });
              scrollToBottom();
            }
          } catch { /* skip parse errors */ }
        }
      }
    } catch {
      setChatMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: 'assistant', content: '응답을 가져올 수 없었어요. 다시 시도해 주세요.' };
        return copy;
      });
    } finally {
      setStreaming(false);
      scrollToBottom();
    }
  };

  const fetchStats = useCallback(async () => {
    const supabase = createClient();

    // Follower count
    const { count } = await supabase
      .from('persona_follows')
      .select('id', { count: 'exact', head: true })
      .eq('persona_id', persona.id);

    setFollowerCount(count ?? 0);

    // Check if current user follows this profile
    if (user) {
      const { data } = await supabase
        .from('persona_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('persona_id', persona.id)
        .single();
      setFollowing(!!data);
    }

    setStatsLoading(false);
  }, [persona.id, user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleFollow = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setFollowLoading(true);
    try {
      const method = following ? 'DELETE' : 'POST';
      const res = await fetch('/api/social/follow', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: persona.id }),
      });
      if (res.ok || res.status === 409) {
        setFollowing(!following);
        setFollowerCount(prev => following ? prev - 1 : prev + 1);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  /* ── Card style ── */
  const cardStyle: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--ou-border-subtle)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'var(--ou-glow-sm)',
    cursor: 'pointer',
    transition: 'box-shadow var(--ou-transition), border-color var(--ou-transition)',
    padding: 16,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 800, margin: '0 auto', padding: 24, background: 'transparent' }}>
      {/* Header: avatar, name, bio, actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Avatar as orb-block */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: '0.5px solid var(--ou-border-subtle)',
            boxShadow: 'var(--ou-glow-md)',
            overflow: 'hidden',
            background: 'var(--ou-surface-muted)',
          }}
        >
          {persona.avatar_url && (
            <img src={persona.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--ou-text-strong)' }}>
            {persona.display_name ?? persona.handle}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ou-text-dimmed)' }}>
            @{persona.handle}
          </span>

          {persona.bio && (
            <span style={{ fontSize: 14, marginTop: 4, textAlign: 'center', color: 'var(--ou-text-body)' }}>
              {persona.bio}
            </span>
          )}

          {/* Stats — badge-block style */}
          {statsLoading ? (
            <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 13, marginTop: 4 }}>...</span>
          ) : (
            <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
              <span style={{
                fontSize: 14,
                padding: '4px 14px',
                background: 'var(--ou-surface-muted)',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                color: 'var(--ou-text-body)',
              }}>
                공개 기록 {nodes.length}
              </span>
              <span style={{
                fontSize: 14,
                padding: '4px 14px',
                background: 'var(--ou-surface-muted)',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                color: 'var(--ou-text-body)',
              }}>
                팔로워 {followerCount}
              </span>
            </div>
          )}

          {/* Rank */}
          <div style={{ marginTop: 8, maxWidth: 240 }}>
            <RankBadge nodeCount={totalNodeCount} variant="compact" />
          </div>

          {/* Action button — pill-block */}
          <div style={{ marginTop: 16 }}>
            {isOwn ? (
              <button
                onClick={() => router.push('/settings')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 16px',
                  borderRadius: 'var(--ou-radius-pill)',
                  borderWidth: '0.5px',
                  borderStyle: 'solid',
                  borderColor: 'var(--ou-border-subtle)',
                  background: 'transparent',
                  color: 'var(--ou-text-body)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <PencilSimple size={16} weight="light" />
                편집
              </button>
            ) : (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 16px',
                  borderRadius: 'var(--ou-radius-pill)',
                  borderWidth: '0.5px',
                  borderStyle: 'solid',
                  borderColor: following ? 'var(--ou-border-hover)' : 'var(--ou-border-subtle)',
                  background: following ? 'var(--ou-surface-muted)' : 'transparent',
                  color: 'var(--ou-text-body)',
                  boxShadow: following ? 'var(--ou-glow-sm)' : 'none',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: followLoading ? 'wait' : 'pointer',
                }}
              >
                {following
                  ? <UserMinus size={16} weight="light" />
                  : <UserPlus size={16} weight="light" />
                }
                {following ? '팔로잉' : '팔로우'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Public nodes grid — card-block items */}
      {nodes.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Globe size={36} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={{ fontSize: 14, color: 'var(--ou-text-dimmed)' }}>
              공개된 기록이 없어요
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {nodes.map(node => (
            <div
              key={node.id}
              style={cardStyle}
              onClick={() => router.push(`/view/${node.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--ou-glow-hover)';
                e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
                e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    background: 'var(--ou-surface-muted)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    borderRadius: 'var(--ou-radius-pill)',
                    color: 'var(--ou-text-dimmed)',
                  }}
                >
                  {DOMAIN_LABELS[node.domain] ?? node.domain}
                </span>
                {node.created_at && (
                  <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)' }}>
                    {new Date(node.created_at as string).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
              <p style={{
                fontSize: 14,
                color: 'var(--ou-text-body)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                margin: 0,
              }}>
                {node.raw}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* AI Chat Button */}
      {!chatOpen && nodes.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setChatOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 'var(--ou-radius-pill)',
              borderWidth: '0.5px',
              borderStyle: 'solid',
              borderColor: 'var(--ou-border-subtle)',
              background: 'transparent',
              color: 'var(--ou-text-body)',
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <Robot size={18} weight="light" />
            이 사람의 AI에게 물어보기
          </button>
        </div>
      )}

      {/* AI Chat Panel */}
      {chatOpen && (
        <div
          style={{
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-card)',
            overflow: 'hidden',
            background: 'transparent',
            boxShadow: 'var(--ou-glow-sm)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '0.5px solid var(--ou-border-faint)',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Robot size={18} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ou-text-strong)' }}>
                {persona.display_name ?? persona.handle}의 AI
              </span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <X size={16} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{ padding: '6px 16px', background: 'var(--ou-surface-faint)' }}>
            <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
              AI가 공개된 기록을 바탕으로 답변합니다
            </span>
          </div>

          {/* Messages */}
          <div
            ref={chatViewport}
            style={{ height: 400, overflow: 'auto', padding: '12px 16px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      padding: '6px 12px',
                      maxWidth: '80%',
                      borderRadius: 'var(--ou-radius-md)',
                      background: msg.role === 'user'
                        ? 'var(--ou-surface-hover)'
                        : 'var(--ou-surface-subtle)',
                      border: '0.5px solid var(--ou-border-faint)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'var(--ou-text-body)',
                      }}
                    >
                      {msg.content || (streaming && i === chatMessages.length - 1 ? '...' : '')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div
            style={{
              display: 'flex',
              padding: '10px 16px',
              gap: 8,
              borderTop: '0.5px solid var(--ou-border-faint)',
              alignItems: 'center',
            }}
          >
            <input
              placeholder="궁금한 것을 물어보세요"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              disabled={streaming || chatMessages.length >= 20}
              style={{
                flex: 1,
                borderWidth: '0.5px',
                borderStyle: 'solid',
                borderColor: 'var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                background: 'transparent',
                color: 'var(--ou-text-body)',
                padding: '8px 14px',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={sendChatMessage}
              disabled={streaming || !chatInput.trim() || chatMessages.length >= 20}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                cursor: streaming || !chatInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: streaming || !chatInput.trim() ? 0.4 : 1,
                flexShrink: 0,
              }}
            >
              <PaperPlaneTilt size={18} weight="light" style={{ color: '#111' }} />
            </button>
          </div>

          {chatMessages.length >= 20 && (
            <span style={{ fontSize: 12, textAlign: 'center', display: 'block', paddingBottom: 8, color: 'var(--ou-text-dimmed)' }}>
              최대 대화 수에 도달했어요
            </span>
          )}
        </div>
      )}

      <span style={{ fontSize: 12, textAlign: 'center', color: 'var(--ou-text-dimmed)' }}>
        Made with OU
      </span>
    </div>
  );
}

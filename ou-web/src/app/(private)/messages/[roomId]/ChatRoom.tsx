'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PaperPlaneRight, ArrowLeft } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content?: string | null;
  node_id?: string | null;
  created_at: string;
}

interface MemberProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function ChatRoom({ roomId, userId }: { roomId: string; userId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherMember, setOtherMember] = useState<MemberProfile | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  // Fetch messages via API
  const fetchMessages = useCallback(async (before?: string) => {
    try {
      const url = before
        ? `/api/messages/${roomId}?before=${encodeURIComponent(before)}&limit=50`
        : `/api/messages/${roomId}?limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      if (before) {
        setMessages(prev => [...(data.messages ?? []), ...prev]);
      } else {
        setMessages(data.messages ?? []);
      }
      setHasMore(data.hasMore ?? false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Fetch other member info
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', roomId)
        .neq('user_id', userId);

      if (data && data.length > 0) {
        const otherId = data[0].user_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', otherId)
          .single();

        if (profile) {
          setOtherMember({
            user_id: profile.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          });
        }
      }
    };
    fetchMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Auto-scroll when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (isAtBottom.current && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Track scroll position
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    try {
      await fetch(`/api/messages/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      isAtBottom.current = true;
    } finally {
      setSending(false);
    }
  };

  const loadMore = () => {
    if (messages.length > 0) {
      fetchMessages(messages[0].created_at);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const headerName = otherMember?.display_name || '대화방';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, borderBottom: '0.5px solid var(--color-default-border)' }}
      >
        <button onClick={() => router.push('/messages')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={22} weight="light" />
        </button>
        {otherMember?.avatar_url && (
          <img src={otherMember.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <span style={{ fontWeight: 600, fontSize: 14 }}>{headerName}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: 16, overflowY: 'auto' }}
      >
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>불러오는 중...</span>
          </div>
        )}

        {!loading && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={loadMore} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-dimmed)' }}>
              이전 메시지 불러오기
            </button>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>아직 메시지가 없어요. 첫 메시지를 보내보세요!</span>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === userId;
          const showTime = idx === messages.length - 1 ||
            messages[idx + 1]?.sender_id !== msg.sender_id;

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
              }}
            >
              {!isMine && showTime && otherMember && (
                <span style={{ fontSize: 10, color: 'var(--color-dimmed)', marginBottom: 2, padding: '0 4px' }}>
                  {otherMember.display_name || '회원'}
                </span>
              )}
              <div
                style={{
                  padding: 10,
                  maxWidth: 320,
                  background: isMine ? '#374151' : 'var(--color-default)',
                  borderRadius: 12,
                  color: isMine ? '#fff' : 'inherit',
                }}
              >
                {msg.content && <span style={{ fontSize: 14 }}>{msg.content}</span>}
              </div>
              {showTime && (
                <span style={{ fontSize: 10, color: 'var(--color-dimmed)', marginTop: 2, padding: '0 4px' }}>
                  {formatTime(msg.created_at)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, borderTop: '0.5px solid var(--color-default-border)' }}>
        <input
          type="text"
          placeholder="메시지 입력..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          style={{ flex: 1, padding: '10px 16px', borderRadius: 24, border: '1px solid var(--color-default-border)', fontSize: 14, outline: 'none' }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--color-default-border)',
            background: '#f3f4f6', cursor: !input.trim() || sending ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: !input.trim() || sending ? 0.5 : 1,
          }}
        >
          <PaperPlaneRight size={18} />
        </button>
      </div>
    </div>
  );
}

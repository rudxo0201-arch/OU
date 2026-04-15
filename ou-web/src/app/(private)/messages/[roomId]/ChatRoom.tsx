'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Stack, TextInput, ActionIcon, Box, Paper, Text, Group,
  UnstyledButton, Avatar, Loader, Center,
} from '@mantine/core';
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
    <Stack h="100vh" gap={0}>
      {/* Header */}
      <Group
        p="md"
        gap="sm"
        style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <UnstyledButton onClick={() => router.push('/messages')}>
          <ArrowLeft size={22} weight="light" />
        </UnstyledButton>
        {otherMember?.avatar_url && (
          <Avatar src={otherMember.avatar_url} size="sm" radius="xl" />
        )}
        <Text fw={600} fz="sm">{headerName}</Text>
      </Group>

      {/* Messages */}
      <Stack
        ref={scrollRef}
        flex={1}
        gap="sm"
        p="md"
        style={{ overflowY: 'auto' }}
        onScroll={handleScroll}
      >
        {loading && (
          <Center py="xl">
            <Loader size="sm" color="gray" />
          </Center>
        )}

        {!loading && hasMore && (
          <Center>
            <UnstyledButton onClick={loadMore}>
              <Text fz="xs" c="dimmed">이전 메시지 불러오기</Text>
            </UnstyledButton>
          </Center>
        )}

        {!loading && messages.length === 0 && (
          <Box ta="center" py="xl">
            <Text c="dimmed" fz="sm">아직 메시지가 없어요. 첫 메시지를 보내보세요!</Text>
          </Box>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === userId;
          const showTime = idx === messages.length - 1 ||
            messages[idx + 1]?.sender_id !== msg.sender_id;

          return (
            <Box
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
              }}
            >
              {!isMine && showTime && otherMember && (
                <Text fz={10} c="dimmed" mb={2} px={4}>
                  {otherMember.display_name || '회원'}
                </Text>
              )}
              <Paper
                p="sm"
                maw={320}
                style={{
                  background: isMine
                    ? 'var(--mantine-color-dark-4)'
                    : 'var(--mantine-color-default)',
                  borderRadius: 12,
                }}
              >
                {msg.content && <Text fz="sm">{msg.content}</Text>}
              </Paper>
              {showTime && (
                <Text fz={10} c="dimmed" mt={2} px={4}>
                  {formatTime(msg.created_at)}
                </Text>
              )}
            </Box>
          );
        })}
      </Stack>

      {/* Input */}
      <Group p="md" gap="sm" style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}>
        <TextInput
          flex={1}
          placeholder="메시지 입력..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          radius="xl"
          size="md"
        />
        <ActionIcon
          size="lg"
          radius="xl"
          variant="light"
          color="gray"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          loading={sending}
        >
          <PaperPlaneRight size={18} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}

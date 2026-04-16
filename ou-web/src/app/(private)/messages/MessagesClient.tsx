'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Text, Paper, Group, Button, Box, Avatar,
  Center, Modal, TextInput, Loader, UnstyledButton, Badge,
} from '@mantine/core';
import { useRouter } from 'next/navigation';
import { ChatCircle, PlusCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

interface OtherMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  handle: string | null;
}

interface RoomData {
  id: string;
  name: string | null;
  last_message: string | null;
  updated_at: string | null;
  created_at: string | null;
  other_members: OtherMember[];
  unread_count: number;
}

interface ProfileResult {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

export function MessagesClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/rooms');
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Real-time: listen for new messages in any of user's rooms to update list
  useEffect(() => {
    const channel = supabase
      .channel('rooms-list-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const newMsg = payload.new as { room_id: string; content?: string; sender_id: string; created_at: string };
        setRooms(prev => {
          const roomIdx = prev.findIndex(r => r.id === newMsg.room_id);
          if (roomIdx === -1) {
            // Room not in our list; refetch
            fetchRooms();
            return prev;
          }
          const updated = [...prev];
          const room = { ...updated[roomIdx] };
          room.last_message = newMsg.content ?? room.last_message;
          room.updated_at = newMsg.created_at;
          if (newMsg.sender_id !== userId) {
            room.unread_count = (room.unread_count || 0) + 1;
          }
          updated[roomIdx] = room;
          // Re-sort by updated_at descending
          updated.sort((a, b) => {
            const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return tb - ta;
          });
          return updated;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const searchUsers = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', userId)
        .limit(10);
      setResults(data ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const createRoomWithUser = async (targetUserId: string) => {
    setCreating(true);
    try {
      const res = await fetch('/api/messages/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const { roomId } = await res.json();
      if (roomId) {
        setModalOpen(false);
        router.push(`/messages/${roomId}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const openNewChat = () => {
    setQuery('');
    setResults([]);
    setModalOpen(true);
  };

  const getRoomDisplayName = (room: RoomData) => {
    if (room.name) return room.name;
    const other = room.other_members?.[0];
    if (other) return other.display_name || other.handle || '회원';
    return '대화방';
  };

  const getRoomAvatar = (room: RoomData) => {
    const other = room.other_members?.[0];
    return other?.avatar_url ?? undefined;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('ko-KR', { weekday: 'short' });
    }
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Center h="60vh">
        <Loader size="sm" color="gray" />
      </Center>
    );
  }

  const renderRoomList = () => (
    <Stack gap="sm" p="xl" maw={640} mx="auto">
      <Group justify="space-between" mb="sm">
        <Text
          fz={10}
          fw={500}
          style={{
            color: 'var(--ou-text-heading)',
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          MESSAGES
        </Text>
        {/* pill-block create button */}
        <Button
          variant="default"
          size="sm"
          leftSection={<PlusCircle size={16} style={{ color: 'var(--ou-text-body)' }} />}
          onClick={openNewChat}
          style={{
            background: 'transparent',
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-pill)',
            color: 'var(--ou-text-body)',
            boxShadow: 'var(--ou-glow-sm)',
            transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
          }}
        >
          새 대화
        </Button>
      </Group>

      {rooms.map(room => (
        /* card-block room item */
        <div
          key={room.id}
          style={{
            cursor: 'pointer',
            padding: 16,
            background: 'transparent',
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-card)',
            boxShadow: 'var(--ou-glow-sm)',
            transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
          }}
          onClick={() => router.push(`/messages/${room.id}`)}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
          }}
        >
          <Group gap="sm" wrap="nowrap">
            {/* Avatar — 36px circle with border-muted */}
            <Avatar
              src={getRoomAvatar(room)}
              size={36}
              radius="xl"
              color="gray"
              style={{
                border: '0.5px solid var(--ou-border-muted)',
                boxShadow: 'var(--ou-glow-xs)',
                flexShrink: 0,
              }}
            >
              {!getRoomAvatar(room) && <ChatCircle size={18} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />}
            </Avatar>
            <Box flex={1} style={{ overflow: 'hidden' }}>
              <Group justify="space-between" mb={2} wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <Text fz="sm" fw={room.unread_count > 0 ? 700 : 500} lineClamp={1} style={{ color: 'var(--ou-text-strong)' }}>
                    {getRoomDisplayName(room)}
                  </Text>
                </Group>
                <Text fz="xs" style={{ flexShrink: 0, color: 'var(--ou-text-dimmed)' }}>
                  {formatTime(room.updated_at)}
                </Text>
              </Group>
              <Group gap="xs" wrap="nowrap">
                <Text
                  fz="xs"
                  fw={room.unread_count > 0 ? 500 : 400}
                  lineClamp={1}
                  flex={1}
                  style={{ color: room.unread_count > 0 ? 'var(--ou-text-body)' : 'var(--ou-text-dimmed)' }}
                >
                  {room.last_message ?? '아직 메시지가 없어요'}
                </Text>
                {/* badge-block.count unread */}
                {room.unread_count > 0 && (
                  <div
                    style={{
                      flexShrink: 0,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 'var(--ou-radius-pill)',
                      border: '0.5px solid var(--ou-border-muted)',
                      background: 'var(--ou-surface-hover)',
                      boxShadow: 'var(--ou-glow-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--ou-text-strong)',
                    }}
                  >
                    {room.unread_count > 9 ? '9+' : room.unread_count}
                  </div>
                )}
              </Group>
            </Box>
          </Group>
        </div>
      ))}
    </Stack>
  );

  const renderEmpty = () => (
    <Center h="60vh">
      <Stack align="center" gap="md">
        <ChatCircle size={48} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
        <Text fw={600} fz="lg" style={{ color: 'var(--ou-text-strong)' }}>아직 대화가 없어요</Text>
        <Text fz="sm" ta="center" style={{ color: 'var(--ou-text-dimmed)' }}>
          친구를 초대해서 대화를 시작해보세요.
        </Text>
        <Group gap="sm">
          <Button
            variant="default"
            leftSection={<PlusCircle size={18} style={{ color: 'var(--ou-text-body)' }} />}
            onClick={openNewChat}
            style={{
              background: 'transparent',
              border: '0.5px solid var(--ou-border-subtle)',
              borderRadius: 'var(--ou-radius-pill)',
              color: 'var(--ou-text-body)',
              boxShadow: 'var(--ou-glow-sm)',
            }}
          >
            새 대화 시작하기
          </Button>
        </Group>
      </Stack>
    </Center>
  );

  return (
    <>
      {rooms.length === 0 ? renderEmpty() : renderRoomList()}

      {/* Modal — floating-block in modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Text fw={600} style={{ color: 'var(--ou-text-strong)' }}>새 대화</Text>}
        centered
        styles={{
          content: {
            background: 'var(--ou-surface-muted)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '0.5px solid var(--ou-border-subtle)',
            boxShadow: 'var(--ou-glow-lg)',
            borderRadius: 'var(--ou-radius-card)',
          },
          header: {
            background: 'transparent',
            borderBottom: '0.5px solid var(--ou-border-faint)',
          },
          body: {
            background: 'transparent',
          },
        }}
      >
        <Stack gap="md" mt="sm">
          {/* input-block search */}
          <TextInput
            placeholder="이름 또는 아이디로 검색"
            leftSection={<MagnifyingGlass size={16} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />}
            value={query}
            onChange={(e) => searchUsers(e.currentTarget.value)}
            autoFocus
            styles={{
              input: {
                background: 'transparent',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                color: 'var(--ou-text-body)',
                boxShadow: 'var(--ou-glow-sm)',
              },
            }}
          />

          {searching && (
            <Center py="md">
              <Loader size="sm" color="gray" />
            </Center>
          )}

          {!searching && results.length > 0 && (
            <Stack gap={4}>
              {results.map(profile => (
                <UnstyledButton
                  key={profile.id}
                  onClick={() => createRoomWithUser(profile.id)}
                  disabled={creating}
                  py="sm"
                  px="xs"
                  style={{
                    borderRadius: 'var(--ou-radius-card)',
                    border: '0.5px solid transparent',
                    transition: 'border-color var(--ou-transition), background var(--ou-transition)',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--ou-surface-faint)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Group gap="sm">
                    <Avatar
                      src={profile.avatar_url ?? undefined}
                      size="sm"
                      radius="xl"
                      style={{
                        border: '0.5px solid var(--ou-border-muted)',
                        boxShadow: 'var(--ou-glow-xs)',
                      }}
                    />
                    <Box>
                      <Text fz="sm" fw={500} style={{ color: 'var(--ou-text-strong)' }}>
                        {profile.display_name || profile.handle}
                      </Text>
                      {profile.handle && (
                        <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>@{profile.handle}</Text>
                      )}
                    </Box>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          )}

          {!searching && query.length >= 2 && results.length === 0 && (
            <Text fz="sm" ta="center" py="md" style={{ color: 'var(--ou-text-dimmed)' }}>
              검색 결과가 없어요
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}

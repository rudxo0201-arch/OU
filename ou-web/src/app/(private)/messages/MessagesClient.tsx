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
        <Text fw={600} fz="lg">메시지</Text>
        <Button
          variant="light"
          color="gray"
          size="sm"
          leftSection={<PlusCircle size={16} />}
          onClick={openNewChat}
        >
          새 대화
        </Button>
      </Group>

      {rooms.map(room => (
        <Paper
          key={room.id}
          p="md"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push(`/messages/${room.id}`)}
        >
          <Group gap="sm" wrap="nowrap">
            <Avatar
              src={getRoomAvatar(room)}
              size="md"
              radius="xl"
              color="gray"
            >
              {!getRoomAvatar(room) && <ChatCircle size={20} weight="light" />}
            </Avatar>
            <Box flex={1} style={{ overflow: 'hidden' }}>
              <Group justify="space-between" mb={2} wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <Text fz="sm" fw={room.unread_count > 0 ? 700 : 500} lineClamp={1}>
                    {getRoomDisplayName(room)}
                  </Text>
                </Group>
                <Text fz="xs" c="dimmed" style={{ flexShrink: 0 }}>
                  {formatTime(room.updated_at)}
                </Text>
              </Group>
              <Group gap="xs" wrap="nowrap">
                <Text
                  fz="xs"
                  c={room.unread_count > 0 ? undefined : 'dimmed'}
                  fw={room.unread_count > 0 ? 500 : 400}
                  lineClamp={1}
                  flex={1}
                >
                  {room.last_message ?? '아직 메시지가 없어요'}
                </Text>
                {room.unread_count > 0 && (
                  <Badge
                    size="sm"
                    variant="filled"
                    color="dark"
                    circle
                    style={{ flexShrink: 0 }}
                  >
                    {room.unread_count > 9 ? '9+' : room.unread_count}
                  </Badge>
                )}
              </Group>
            </Box>
          </Group>
        </Paper>
      ))}
    </Stack>
  );

  const renderEmpty = () => (
    <Center h="60vh">
      <Stack align="center" gap="md">
        <ChatCircle size={48} weight="light" color="var(--mantine-color-gray-5)" />
        <Text fw={600} fz="lg">아직 대화가 없어요</Text>
        <Text fz="sm" c="dimmed" ta="center">
          친구를 초대해서 대화를 시작해보세요.
        </Text>
        <Group gap="sm">
          <Button
            variant="light"
            color="gray"
            leftSection={<PlusCircle size={18} />}
            onClick={openNewChat}
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

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="새 대화"
        centered
        styles={{
          header: { borderBottom: '0.5px solid var(--mantine-color-default-border)' },
        }}
      >
        <Stack gap="md" mt="sm">
          <TextInput
            placeholder="이름 또는 아이디로 검색"
            leftSection={<MagnifyingGlass size={16} weight="light" />}
            value={query}
            onChange={(e) => searchUsers(e.currentTarget.value)}
            autoFocus
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
                  style={{ borderRadius: 'var(--mantine-radius-md)' }}
                >
                  <Group gap="sm">
                    <Avatar
                      src={profile.avatar_url ?? undefined}
                      size="sm"
                      radius="xl"
                    />
                    <Box>
                      <Text fz="sm" fw={500}>
                        {profile.display_name || profile.handle}
                      </Text>
                      {profile.handle && (
                        <Text fz="xs" c="dimmed">@{profile.handle}</Text>
                      )}
                    </Box>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          )}

          {!searching && query.length >= 2 && results.length === 0 && (
            <Text fz="sm" c="dimmed" ta="center" py="md">
              검색 결과가 없어요
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}

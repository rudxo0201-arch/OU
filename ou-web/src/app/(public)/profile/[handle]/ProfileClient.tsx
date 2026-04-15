'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Stack, Group, Avatar, Text, Button, Box,
  Badge, SimpleGrid, Paper, Loader, Center,
  ScrollArea, TextInput, ActionIcon,
} from '@mantine/core';
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

  return (
    <Stack gap="xl" maw={800} mx="auto" p="xl">
      {/* Header: avatar, name, bio, actions */}
      <Group align="flex-start" wrap="nowrap">
        <Avatar
          src={persona.avatar_url ?? undefined}
          size={96}
          radius="xl"
          style={{ border: '0.5px solid var(--mantine-color-default-border)' }}
        />
        <Stack gap={4} flex={1}>
          <Group gap="xs" align="baseline">
            <Text fw={700} fz="xl">{persona.display_name ?? persona.handle}</Text>
            <Text c="dimmed" fz="sm">@{persona.handle}</Text>
          </Group>

          {persona.bio && <Text fz="sm" mt={4}>{persona.bio}</Text>}

          {/* Stats */}
          {statsLoading ? (
            <Loader size="xs" color="gray" mt={4} />
          ) : (
            <Group gap="lg" mt={4}>
              <Text fz="sm">
                <Text span fw={600}>{nodes.length}</Text>
                <Text span c="dimmed" ml={4}>공개 기록</Text>
              </Text>
              <Text fz="sm">
                <Text span fw={600}>{followerCount}</Text>
                <Text span c="dimmed" ml={4}>팔로워</Text>
              </Text>
            </Group>
          )}

          {/* Rank */}
          <Box mt={8} maw={240}>
            <RankBadge nodeCount={totalNodeCount} variant="compact" />
          </Box>
        </Stack>

        {/* Action button */}
        <Box>
          {isOwn ? (
            <Button
              variant="outline"
              color="dark"
              size="sm"
              style={{ borderWidth: '0.5px' }}
              leftSection={<PencilSimple size={16} weight="light" />}
              onClick={() => router.push('/settings')}
            >
              편집
            </Button>
          ) : (
            <Button
              variant={following ? 'light' : 'outline'}
              color="dark"
              size="sm"
              style={{ borderWidth: '0.5px' }}
              leftSection={
                following
                  ? <UserMinus size={16} weight="light" />
                  : <UserPlus size={16} weight="light" />
              }
              loading={followLoading}
              onClick={handleFollow}
            >
              {following ? '팔로잉' : '팔로우'}
            </Button>
          )}
        </Box>
      </Group>

      {/* Public nodes grid */}
      {nodes.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Globe size={36} weight="light" color="var(--mantine-color-gray-4)" />
            <Text fz="sm" c="dimmed">공개된 기록이 없어요</Text>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {nodes.map(node => (
            <Paper
              key={node.id}
              p="md"
              radius="md"
              style={{
                border: '0.5px solid var(--mantine-color-default-border)',
                cursor: 'pointer',
              }}
              onClick={() => router.push(`/view/${node.id}`)}
            >
              <Group justify="space-between" mb={6}>
                <Badge
                  variant="light"
                  color="gray"
                  size="xs"
                  styles={{ root: { textTransform: 'none' } }}
                >
                  {DOMAIN_LABELS[node.domain] ?? node.domain}
                </Badge>
                {node.created_at && (
                  <Text fz={10} c="dimmed">
                    {new Date(node.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                )}
              </Group>
              <Text fz="sm" lineClamp={3}>{node.raw}</Text>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      {/* AI Chat Button */}
      {!chatOpen && nodes.length > 0 && (
        <Center>
          <Button
            variant="outline"
            color="dark"
            style={{ borderWidth: '0.5px' }}
            leftSection={<Robot size={18} weight="light" />}
            onClick={() => setChatOpen(true)}
          >
            이 사람의 AI에게 물어보기
          </Button>
        </Center>
      )}

      {/* AI Chat Panel */}
      {chatOpen && (
        <Paper
          radius="md"
          style={{
            border: '0.5px solid var(--mantine-color-default-border)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Group
            justify="space-between"
            px="md"
            py="sm"
            style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
          >
            <Group gap="xs">
              <Robot size={18} weight="light" />
              <Text fw={600} fz="sm">
                {persona.display_name ?? persona.handle}의 AI
              </Text>
            </Group>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setChatOpen(false)}
            >
              <X size={16} weight="light" />
            </ActionIcon>
          </Group>

          {/* Disclaimer */}
          <Box px="md" py={6} bg="var(--mantine-color-gray-0)">
            <Text fz="xs" c="dimmed">
              AI가 공개된 기록을 바탕으로 답변합니다
            </Text>
          </Box>

          {/* Messages */}
          <ScrollArea h={400} viewportRef={chatViewport} px="md" py="sm">
            <Stack gap="sm">
              {chatMessages.map((msg, i) => (
                <Box
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    px="sm"
                    py={6}
                    maw="80%"
                    style={{
                      borderRadius: 'var(--mantine-radius-md)',
                      background:
                        msg.role === 'user'
                          ? 'var(--mantine-color-dark-7)'
                          : 'var(--mantine-color-gray-1)',
                    }}
                  >
                    <Text
                      fz="sm"
                      c={msg.role === 'user' ? 'white' : 'dark'}
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {msg.content || (streaming && i === chatMessages.length - 1 ? '...' : '')}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Stack>
          </ScrollArea>

          {/* Input */}
          <Group
            px="md"
            py="sm"
            gap="xs"
            style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}
          >
            <TextInput
              flex={1}
              placeholder="궁금한 것을 물어보세요"
              size="sm"
              value={chatInput}
              onChange={e => setChatInput(e.currentTarget.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              disabled={streaming || chatMessages.length >= 20}
              styles={{
                input: { borderWidth: '0.5px' },
              }}
            />
            <ActionIcon
              variant="filled"
              color="dark"
              size="lg"
              onClick={sendChatMessage}
              disabled={streaming || !chatInput.trim() || chatMessages.length >= 20}
            >
              <PaperPlaneTilt size={18} weight="light" />
            </ActionIcon>
          </Group>

          {chatMessages.length >= 20 && (
            <Text fz="xs" c="dimmed" ta="center" pb="xs">
              최대 대화 수에 도달했어요
            </Text>
          )}
        </Paper>
      )}

      <Text fz="xs" c="dimmed" ta="center">Made with OU</Text>
    </Stack>
  );
}

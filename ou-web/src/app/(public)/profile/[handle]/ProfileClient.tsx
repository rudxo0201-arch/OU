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

  /* ── Card style ── */
  const cardStyle: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--ou-border-subtle)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'var(--ou-glow-sm)',
    cursor: 'pointer',
    transition: 'box-shadow var(--ou-transition), border-color var(--ou-transition)',
  };

  return (
    <Stack gap="xl" maw={800} mx="auto" p="xl" style={{ background: 'transparent' }}>
      {/* Header: avatar, name, bio, actions */}
      <Stack align="center" gap="md">
        {/* Avatar as orb-block */}
        <Avatar
          src={persona.avatar_url ?? undefined}
          size={96}
          radius="50%"
          style={{
            border: '0.5px solid var(--ou-border-subtle)',
            boxShadow: 'var(--ou-glow-md)',
          }}
        />
        <Stack gap={4} align="center">
          <Text fw={700} fz="xl" style={{ color: 'var(--ou-text-strong)' }}>
            {persona.display_name ?? persona.handle}
          </Text>
          <Text fz="sm" style={{ color: 'var(--ou-text-dimmed)' }}>
            @{persona.handle}
          </Text>

          {persona.bio && (
            <Text fz="sm" mt={4} ta="center" style={{ color: 'var(--ou-text-body)' }}>
              {persona.bio}
            </Text>
          )}

          {/* Stats — badge-block style */}
          {statsLoading ? (
            <Loader size="xs" color="gray" mt={4} />
          ) : (
            <Group gap="lg" mt={8}>
              <Badge
                variant="light"
                color="gray"
                size="lg"
                style={{
                  background: 'var(--ou-surface-muted)',
                  border: '0.5px solid var(--ou-border-subtle)',
                  color: 'var(--ou-text-body)',
                }}
              >
                공개 기록 {nodes.length}
              </Badge>
              <Badge
                variant="light"
                color="gray"
                size="lg"
                style={{
                  background: 'var(--ou-surface-muted)',
                  border: '0.5px solid var(--ou-border-subtle)',
                  color: 'var(--ou-text-body)',
                }}
              >
                팔로워 {followerCount}
              </Badge>
            </Group>
          )}

          {/* Rank */}
          <Box mt={8} maw={240}>
            <RankBadge nodeCount={totalNodeCount} variant="compact" />
          </Box>

          {/* Action button — pill-block */}
          <Box mt="md">
            {isOwn ? (
              <Button
                variant="outline"
                color="gray"
                size="sm"
                radius="xl"
                style={{
                  borderWidth: '0.5px',
                  borderColor: 'var(--ou-border-subtle)',
                  background: 'transparent',
                  color: 'var(--ou-text-body)',
                }}
                leftSection={<PencilSimple size={16} weight="light" />}
                onClick={() => router.push('/settings')}
              >
                편집
              </Button>
            ) : (
              <Button
                variant={following ? 'light' : 'outline'}
                color="gray"
                size="sm"
                radius="xl"
                style={{
                  borderWidth: '0.5px',
                  borderColor: following ? 'var(--ou-border-hover)' : 'var(--ou-border-subtle)',
                  background: following ? 'var(--ou-surface-muted)' : 'transparent',
                  color: 'var(--ou-text-body)',
                  boxShadow: following ? 'var(--ou-glow-sm)' : 'none',
                }}
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
        </Stack>
      </Stack>

      {/* Public nodes grid — card-block items */}
      {nodes.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Globe size={36} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <Text fz="sm" style={{ color: 'var(--ou-text-dimmed)' }}>
              공개된 기록이 없어요
            </Text>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {nodes.map(node => (
            <Paper
              key={node.id}
              p="md"
              radius="md"
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
              <Group justify="space-between" mb={6}>
                <Badge
                  variant="light"
                  color="gray"
                  size="xs"
                  styles={{ root: { textTransform: 'none' } }}
                  style={{
                    background: 'var(--ou-surface-muted)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    color: 'var(--ou-text-dimmed)',
                  }}
                >
                  {DOMAIN_LABELS[node.domain] ?? node.domain}
                </Badge>
                {node.created_at && (
                  <Text fz={10} style={{ color: 'var(--ou-text-dimmed)' }}>
                    {new Date(node.created_at as string).toLocaleDateString('ko-KR')}
                  </Text>
                )}
              </Group>
              <Text fz="sm" lineClamp={3} style={{ color: 'var(--ou-text-body)' }}>
                {node.raw}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      {/* AI Chat Button */}
      {!chatOpen && nodes.length > 0 && (
        <Center>
          <Button
            variant="outline"
            color="gray"
            radius="xl"
            style={{
              borderWidth: '0.5px',
              borderColor: 'var(--ou-border-subtle)',
              background: 'transparent',
              color: 'var(--ou-text-body)',
            }}
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
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-card)',
            overflow: 'hidden',
            background: 'transparent',
            boxShadow: 'var(--ou-glow-sm)',
          }}
        >
          {/* Header */}
          <Group
            justify="space-between"
            px="md"
            py="sm"
            style={{ borderBottom: '0.5px solid var(--ou-border-faint)' }}
          >
            <Group gap="xs">
              <Robot size={18} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
              <Text fw={600} fz="sm" style={{ color: 'var(--ou-text-strong)' }}>
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
          <Box px="md" py={6} style={{ background: 'var(--ou-surface-faint)' }}>
            <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>
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
                      borderRadius: 'var(--ou-radius-md)',
                      background: msg.role === 'user'
                        ? 'var(--ou-surface-hover)'
                        : 'var(--ou-surface-subtle)',
                      border: '0.5px solid var(--ou-border-faint)',
                    }}
                  >
                    <Text
                      fz="sm"
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'var(--ou-text-body)',
                      }}
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
            style={{ borderTop: '0.5px solid var(--ou-border-faint)' }}
          >
            <TextInput
              flex={1}
              placeholder="궁금한 것을 물어보세요"
              size="sm"
              radius="xl"
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
                input: {
                  borderWidth: '0.5px',
                  borderColor: 'var(--ou-border-subtle)',
                  background: 'transparent',
                  color: 'var(--ou-text-body)',
                },
              }}
            />
            <ActionIcon
              variant="filled"
              color="dark"
              size="lg"
              radius="xl"
              onClick={sendChatMessage}
              disabled={streaming || !chatInput.trim() || chatMessages.length >= 20}
            >
              <PaperPlaneTilt size={18} weight="light" />
            </ActionIcon>
          </Group>

          {chatMessages.length >= 20 && (
            <Text fz="xs" ta="center" pb="xs" style={{ color: 'var(--ou-text-dimmed)' }}>
              최대 대화 수에 도달했어요
            </Text>
          )}
        </Paper>
      )}

      <Text fz="xs" ta="center" style={{ color: 'var(--ou-text-dimmed)' }}>
        Made with OU
      </Text>
    </Stack>
  );
}

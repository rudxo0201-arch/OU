'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Stack, Text, Paper, Group, Avatar, Badge, ActionIcon, Box, Divider,
  Button, Textarea, Center, UnstyledButton,
} from '@mantine/core';
import { Heart, ChatCircle, ArrowsClockwise, PaperPlaneTilt, Rss, CheckCircle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdBanner } from '@/components/ui/AdBanner';
import { createClient } from '@/lib/supabase/client';

interface FeedNode {
  id: string;
  domain: string;
  raw?: string;
  title?: string;
  created_at: string;
  like_count?: number;
  comment_count?: number;
  domain_data?: Record<string, any>;
  profiles?: { id?: string; display_name?: string; avatar_url?: string } | null;
  author_handle?: string | null;
  user_id?: string;
}

type FeedTab = 'following' | 'discover';

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  knowledge: '지식',
  idea: '아이디어',
  relation: '관계',
  emotion: '감정',
  finance: '가계부',
  habit: '습관',
};

export function FeedClient({ nodes, userId }: { nodes: FeedNode[]; userId?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<FeedTab>(nodes.length > 0 ? 'following' : 'discover');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    nodes.forEach(n => { map[n.id] = n.like_count ?? 0; });
    return map;
  });
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Real-time new posts
  const [newPosts, setNewPosts] = useState<FeedNode[]>([]);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const displayedNodeIds = useRef(new Set(nodes.map(n => n.id)));

  // Subscribe to new public data_nodes in real-time
  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'data_nodes',
        filter: 'visibility=eq.public',
      }, async (payload) => {
        const newNode = payload.new as FeedNode & { user_id?: string; visibility?: string };

        // Skip own posts
        if (userId && newNode.user_id === userId) return;

        // Skip if already displayed
        if (displayedNodeIds.current.has(newNode.id)) return;

        // Fetch the author profile
        let profile: { id?: string; display_name?: string; avatar_url?: string } | null = null;
        if (newNode.user_id) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', newNode.user_id)
            .single();
          profile = p;
        }

        const enrichedNode: FeedNode = {
          ...newNode,
          profiles: profile,
          like_count: 0,
          comment_count: 0,
          author_handle: null,
        };

        setNewPosts(prev => [enrichedNode, ...prev]);
        setShowNewBanner(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const showNewPosts = () => {
    // Update displayed IDs set
    newPosts.forEach(p => displayedNodeIds.current.add(p.id));
    // Prepend new posts to the displayed list
    setAllNodes(prev => [...newPosts, ...prev]);
    setNewPosts([]);
    setShowNewBanner(false);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Merged node list (initial SSR + newly loaded)
  const [allNodes, setAllNodes] = useState<FeedNode[]>(nodes);

  const handleLike = async (nodeId: string) => {
    const wasLiked = likedIds.has(nodeId);
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    setLikeCounts(prev => ({
      ...prev,
      [nodeId]: (prev[nodeId] ?? 0) + (wasLiked ? -1 : 1),
    }));
    await fetch('/api/social/like', {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handleComment = async (nodeId: string) => {
    if (!commentText.trim()) return;
    await fetch('/api/social/comment', {
      method: 'POST',
      body: JSON.stringify({ nodeId, text: commentText }),
      headers: { 'Content-Type': 'application/json' },
    });
    setCommentText('');
    setCommentOpenId(null);
  };

  // Show discover content when following tab is empty
  const displayNodes = tab === 'following' && allNodes.length === 0
    ? [] // will show empty state
    : allNodes; // In real app, discover tab would fetch different data

  const renderEmptyState = () => (
    <Center h="50vh">
      <Stack align="center" gap="md">
        <Rss size={48} weight="light" color="var(--mantine-color-gray-5)" />
        <Text fw={600} fz="lg">
          {tab === 'following'
            ? '팔로우한 사람의 새로운 소식이 없어요'
            : '아직 공유된 내용이 없어요'
          }
        </Text>
        <Text fz="sm" c="dimmed" ta="center">
          {tab === 'following'
            ? '다른 사용자를 팔로우해서 피드를 채워보세요.'
            : '대화를 시작하고 내 기록을 공개해보세요.'
          }
        </Text>
        <Group gap="sm">
          {tab === 'following' && (
            <Button variant="light" color="gray" onClick={() => setTab('discover')}>
              추천 둘러보기
            </Button>
          )}
          <Button variant="subtle" color="gray" onClick={() => router.push('/chat')}>
            대화 시작하기
          </Button>
        </Group>
      </Stack>
    </Center>
  );

  return (
    <Stack gap="md" maw={640} mx="auto" p="xl">
      {/* Header with tabs */}
      <Group justify="space-between" mb="xs">
        <Text fw={600} fz="lg">피드</Text>
        <Group gap={4}>
          <UnstyledButton
            onClick={() => setTab('following')}
            px="sm"
            py={4}
            style={{
              borderRadius: 'var(--mantine-radius-xl)',
              background: tab === 'following'
                ? 'var(--mantine-color-dark-4)'
                : 'transparent',
              transition: 'background 150ms',
            }}
          >
            <Text fz="sm" fw={tab === 'following' ? 600 : 400} c={tab === 'following' ? undefined : 'dimmed'}>
              팔로잉
            </Text>
          </UnstyledButton>
          <UnstyledButton
            onClick={() => setTab('discover')}
            px="sm"
            py={4}
            style={{
              borderRadius: 'var(--mantine-radius-xl)',
              background: tab === 'discover'
                ? 'var(--mantine-color-dark-4)'
                : 'transparent',
              transition: 'background 150ms',
            }}
          >
            <Text fz="sm" fw={tab === 'discover' ? 600 : 400} c={tab === 'discover' ? undefined : 'dimmed'}>
              추천
            </Text>
          </UnstyledButton>
        </Group>
      </Group>

      {/* New posts banner */}
      {showNewBanner && newPosts.length > 0 && (
        <UnstyledButton
          onClick={showNewPosts}
          style={{
            textAlign: 'center',
            padding: '8px 16px',
            borderRadius: 'var(--mantine-radius-xl)',
            background: 'var(--mantine-color-dark-6)',
            border: '0.5px solid var(--mantine-color-default-border)',
          }}
        >
          <Text fz="sm" fw={500}>
            새 글 {newPosts.length}개
          </Text>
        </UnstyledButton>
      )}

      {displayNodes.length === 0 ? renderEmptyState() : (
        <>
          {displayNodes.map((node, i) => (
            <Box key={node.id}>
              <Paper p="md">
                <Group mb="sm">
                  <UnstyledButton
                    onClick={() => {
                      if (node.author_handle) {
                        router.push(`/profile/${node.author_handle}`);
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: node.author_handle ? 'pointer' : 'default' }}
                  >
                    <Avatar src={node.profiles?.avatar_url ?? undefined} size="sm" radius="xl" />
                    <div>
                      <Text fz="sm" fw={500} style={node.author_handle ? { textDecoration: 'none' } : undefined}>
                        {node.profiles?.display_name ?? '익명'}
                      </Text>
                      <Text fz="xs" c="dimmed">
                        {new Date(node.created_at).toLocaleDateString('ko-KR')}
                      </Text>
                    </div>
                  </UnstyledButton>
                  <Badge variant="light" color="gray" size="xs" ml="auto">
                    {DOMAIN_LABELS[node.domain] ?? node.domain}
                  </Badge>
                </Group>

                {/* Realization context banner */}
                {node.domain_data?.type === 'realization' && node.domain_data?.scenario_title && (
                  <Paper
                    p="xs"
                    mb="sm"
                    component={Link}
                    href={`/scenario/${node.domain_data.scenario_node_id}`}
                    style={{
                      background: 'var(--mantine-color-dark-6, var(--mantine-color-gray-1))',
                      borderRadius: 'var(--mantine-radius-sm)',
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                    }}
                  >
                    <Group gap={6}>
                      <CheckCircle size={14} weight="light" color="var(--mantine-color-gray-5)" />
                      <Text fz="xs" c="dimmed">
                        {node.profiles?.display_name ?? '익명'}님이 &apos;{node.domain_data.scenario_title}&apos; 시나리오를 실현했어요
                      </Text>
                    </Group>
                  </Paper>
                )}

                {node.title && node.domain_data?.type !== 'realization' && (
                  <Text fz="sm" fw={600} mb={4}>{node.title}</Text>
                )}
                <Text fz="sm" mb="sm" lineClamp={4} style={{ lineHeight: 1.6 }}>
                  {node.raw}
                </Text>

                <Divider mb="xs" />

                <Group gap="lg">
                  <Group gap={4}>
                    <ActionIcon
                      variant="subtle"
                      color={likedIds.has(node.id) ? 'dark' : 'gray'}
                      onClick={() => handleLike(node.id)}
                    >
                      <Heart size={18} weight={likedIds.has(node.id) ? 'fill' : 'light'} />
                    </ActionIcon>
                    {(likeCounts[node.id] ?? 0) > 0 && (
                      <Text fz="xs" c="dimmed">{likeCounts[node.id]}</Text>
                    )}
                  </Group>
                  <Group gap={4}>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => setCommentOpenId(commentOpenId === node.id ? null : node.id)}
                    >
                      <ChatCircle size={18} weight="light" />
                    </ActionIcon>
                    {(node.comment_count ?? 0) > 0 && (
                      <Text fz="xs" c="dimmed">{node.comment_count}</Text>
                    )}
                  </Group>
                  <ActionIcon variant="subtle" color="gray">
                    <ArrowsClockwise size={18} weight="light" />
                  </ActionIcon>
                </Group>

                {commentOpenId === node.id && (
                  <Group mt="sm" gap="xs">
                    <Textarea
                      placeholder="댓글을 남겨보세요..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      flex={1}
                      minRows={1}
                      maxRows={3}
                      autosize
                      size="xs"
                    />
                    <ActionIcon
                      variant="light"
                      color="gray"
                      size="lg"
                      onClick={() => handleComment(node.id)}
                      style={!commentText.trim() ? { opacity: 0.4, pointerEvents: 'none' } : {}}
                    >
                      <PaperPlaneTilt size={16} />
                    </ActionIcon>
                  </Group>
                )}
              </Paper>

              {i % 5 === 4 && <AdBanner position="feed" plan="free" />}
            </Box>
          ))}
        </>
      )}
    </Stack>
  );
}

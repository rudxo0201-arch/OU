'use client';

import { useState } from 'react';
import {
  Box, Stack, Text, Paper, Group, Avatar, Button, Textarea,
  ActionIcon, Divider, CopyButton, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  CheckCircle, Heart, Copy, Check, ArrowLeft,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ScenarioNode {
  id: string;
  title?: string;
  raw?: string;
  created_at: string;
  user_id: string;
  domain_data?: Record<string, any>;
  profiles?: { display_name?: string; handle?: string } | null;
}

interface RealizationNode {
  id: string;
  title?: string;
  raw?: string;
  created_at: string;
  user_id: string;
  domain_data?: Record<string, any>;
  profiles?: { id?: string; display_name?: string; avatar_url?: string; handle?: string } | null;
}

interface ScenarioDetailClientProps {
  scenario: ScenarioNode;
  initialRealizations: RealizationNode[];
}

export function ScenarioDetailClient({
  scenario,
  initialRealizations,
}: ScenarioDetailClientProps) {
  const router = useRouter();
  const [realizations, setRealizations] = useState(initialRealizations);
  const [story, setStory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const handleSubmit = async () => {
    if (!story.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/social/realize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioNodeId: scenario.id,
          story: story.trim(),
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        // Add to top of list optimistically
        setRealizations(prev => [{
          id: data.node.id,
          title: data.node.title,
          raw: story.trim(),
          created_at: data.node.created_at ?? new Date().toISOString(),
          user_id: '',
          profiles: { display_name: '나', avatar_url: undefined },
        }, ...prev]);
        setStory('');
        notifications.show({
          message: '이야기가 공유되었어요!',
          color: 'gray',
        });
      } else {
        const data = await res.json();
        notifications.show({
          message: data.error || '공유에 실패했어요. 다시 시도해주세요.',
          color: 'gray',
        });
      }
    } catch {
      notifications.show({
        message: '공유에 실패했어요. 다시 시도해주세요.',
        color: 'gray',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (nodeId: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    await fetch('/api/social/like', {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/scenario/${scenario.id}`
    : `/scenario/${scenario.id}`;

  /* ── Shared styles ── */
  const cardStyle: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--ou-border-subtle)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'var(--ou-glow-sm)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: 'var(--ou-text-dimmed)',
    fontWeight: 500,
  };

  return (
    <Box maw={700} mx="auto" px="xl" py="xl" style={{ background: 'transparent' }}>
      {/* Back button — pill-block */}
      <Button
        variant="subtle"
        color="gray"
        size="xs"
        leftSection={<ArrowLeft size={14} />}
        component={Link}
        href="/universe"
        mb="lg"
        style={{ color: 'var(--ou-text-dimmed)' }}
      >
        돌아가기
      </Button>

      {/* Scenario Content — floating-block */}
      <Paper
        p="xl"
        style={{
          ...cardStyle,
          boxShadow: 'var(--ou-glow-md)',
        }}
        mb="lg"
      >
        <Text fw={700} fz="xl" mb="sm" style={{ color: 'var(--ou-text-strong)' }}>
          {scenario.title}
        </Text>
        <Text fz="md" style={{ lineHeight: 1.8, color: 'var(--ou-text-body)' }}>
          {scenario.raw}
        </Text>

        <Divider my="md" color="var(--ou-border-faint)" />

        <Group justify="space-between">
          <Group gap={6}>
            <CheckCircle size={16} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <Text fz="sm" fw={500} style={{ color: 'var(--ou-text-body)' }}>
              {realizations.length}명이 실현했어요
            </Text>
          </Group>
          {/* Share — pill-block */}
          <CopyButton value={shareUrl}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? '복사됨' : '링크 복사'}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={copy}
                  style={{
                    border: '0.5px solid var(--ou-border-subtle)',
                    borderRadius: 'var(--ou-radius-pill)',
                    background: 'transparent',
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} weight="light" />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      </Paper>

      {/* Write your story */}
      <Paper
        p="lg"
        style={cardStyle}
        mb="xl"
      >
        <Text fw={600} fz="sm" mb="sm" style={{ color: 'var(--ou-text-strong)' }}>
          나도 이랬어요!
        </Text>
        <Textarea
          placeholder="당신의 이야기를 들려주세요"
          value={story}
          onChange={e => setStory(e.target.value)}
          minRows={3}
          maxRows={6}
          autosize
          mb="sm"
          styles={{
            input: {
              border: '0.5px solid var(--ou-border-subtle)',
              background: 'transparent',
              color: 'var(--ou-text-body)',
            },
          }}
        />
        {/* CTA button — filled style */}
        <Button
          color="dark"
          fullWidth
          radius="xl"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!story.trim()}
          style={{ color: 'white' }}
        >
          공유하기
        </Button>
      </Paper>

      {/* Realizations Feed */}
      {realizations.length > 0 && (
        <Stack gap="sm">
          <Text style={sectionTitleStyle} mb="xs">
            실현 이야기
          </Text>
          {realizations.map(r => (
            <Paper
              key={r.id}
              p="md"
              style={cardStyle}
            >
              <Group mb="sm">
                {r.profiles?.handle ? (
                  <Link
                    href={`/profile/${r.profiles.handle}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}
                  >
                    <Avatar
                      src={r.profiles?.avatar_url ?? undefined}
                      size="sm"
                      radius="xl"
                      style={{ border: '0.5px solid var(--ou-border-subtle)' }}
                    />
                    <div>
                      <Text fz="sm" fw={500} style={{ color: 'var(--ou-text-strong)' }}>
                        {r.profiles?.display_name ?? '익명'}
                      </Text>
                      <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </Text>
                    </div>
                  </Link>
                ) : (
                  <Group gap={8}>
                    <Avatar
                      src={r.profiles?.avatar_url ?? undefined}
                      size="sm"
                      radius="xl"
                      style={{ border: '0.5px solid var(--ou-border-subtle)' }}
                    />
                    <div>
                      <Text fz="sm" fw={500} style={{ color: 'var(--ou-text-strong)' }}>
                        {r.profiles?.display_name ?? '익명'}
                      </Text>
                      <Text fz="xs" style={{ color: 'var(--ou-text-dimmed)' }}>
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </Text>
                    </div>
                  </Group>
                )}
              </Group>
              <Text fz="sm" style={{ lineHeight: 1.6, color: 'var(--ou-text-body)' }} mb="sm">
                {r.raw}
              </Text>
              <Group gap={4}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => handleLike(r.id)}
                  size="sm"
                >
                  <Heart
                    size={16}
                    weight={likedIds.has(r.id) ? 'fill' : 'light'}
                    style={{ color: likedIds.has(r.id) ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)' }}
                  />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

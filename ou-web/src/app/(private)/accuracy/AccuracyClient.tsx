'use client';

import { useState } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button,
  TextInput, Badge, Box, Progress, Center,
  Transition,
} from '@mantine/core';
import {
  CheckCircle, ChatTeardrop, User, MapPin, Clock, Cube, ArrowRight,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface UnresolvedEntity {
  id: string;
  raw_text: string;
  context_snippet: string | Array<{ role: string; text: string }> | null;
  entity_type?: string;
  candidates?: string[];
  placeholder_node_id?: string;
}

interface AccuracyClientProps {
  entities: UnresolvedEntity[];
}

const ENTITY_CONFIG: Record<string, {
  icon: React.ElementType;
  question: string;
  defaults: string[];
}> = {
  person: {
    icon: User,
    question: '이 사람이 누구예요?',
    defaults: ['친구', '직장 동료', '가족', '지인'],
  },
  location: {
    icon: MapPin,
    question: '이곳이 어디예요?',
    defaults: ['집', '회사', '학교', '카페'],
  },
  time: {
    icon: Clock,
    question: '정확한 날짜가 언제예요?',
    defaults: ['오늘', '어제', '지난주', '지난달'],
  },
  thing: {
    icon: Cube,
    question: '이게 무엇이에요?',
    defaults: ['물건', '문서', '음식', '앱'],
  },
  event: {
    icon: Clock,
    question: '이 일이 무엇이에요?',
    defaults: ['약속', '회의', '사건', '대화'],
  },
};

function getEntityConfig(entity: UnresolvedEntity) {
  const type = entity.entity_type ?? 'thing';
  return ENTITY_CONFIG[type] ?? ENTITY_CONFIG.thing;
}

function parseContext(snippet: UnresolvedEntity['context_snippet']): Array<{ role: string; text: string }> {
  if (!snippet) return [];
  if (Array.isArray(snippet)) return snippet;
  // If it's a plain string, wrap it
  if (typeof snippet === 'string') {
    try {
      const parsed = JSON.parse(snippet);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // plain text
    }
    return [{ role: 'user', text: snippet }];
  }
  return [];
}

export function AccuracyClient({ entities: initialEntities }: AccuracyClientProps) {
  const router = useRouter();
  const [entities] = useState(initialEntities);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [slideIn, setSlideIn] = useState(true);

  const current = entities[currentIdx];
  const progress = entities.length > 0
    ? Math.round((currentIdx / entities.length) * 100)
    : 100;

  const handleResolve = async (resolvedValue: string) => {
    if (!current || resolving) return;
    setResolving(true);

    try {
      await fetch('/api/accuracy/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: current.id,
          resolvedValue,
          nodeId: current.placeholder_node_id,
        }),
      });
    } catch {
      // Continue even on network error - local state advances
    }

    setResolving(false);
    setSlideIn(false);
    setTimeout(() => {
      setCurrentIdx(i => i + 1);
      setCustomInput('');
      setSlideIn(true);
    }, 200);
  };

  const handleSkip = async () => {
    if (!current) return;

    try {
      await fetch('/api/accuracy/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: current.id,
          skip: true,
        }),
      });
    } catch {
      // Continue
    }

    setSlideIn(false);
    setTimeout(() => {
      setCurrentIdx(i => i + 1);
      setCustomInput('');
      setSlideIn(true);
    }, 200);
  };

  // Empty state
  if (initialEntities.length === 0) {
    return (
      <Center h="60vh">
        <Stack align="center" gap="md">
          <CheckCircle size={48} weight="light" color="var(--mantine-color-gray-5)" />
          <Text fw={600} fz="lg">모든 기록이 정확해요!</Text>
          <Text c="dimmed" fz="sm" ta="center">
            대화를 더 나눠보세요!<br />
            OU가 잘 모르는 것들이 생기면 여기서 알려드릴게요.
          </Text>
          <Button
            variant="light"
            color="gray"
            leftSection={<ChatTeardrop size={18} />}
            onClick={() => router.push('/chat')}
          >
            대화하러 가기
          </Button>
        </Stack>
      </Center>
    );
  }

  // All done
  if (!current || currentIdx >= entities.length) {
    return (
      <Center h="60vh">
        <Stack align="center" gap="md">
          <CheckCircle size={48} weight="light" color="var(--mantine-color-gray-5)" />
          <Text fw={600} fz="lg">모두 확인했어요!</Text>
          <Text c="dimmed" ta="center" fz="sm">
            덕분에 OU가 더 정확해졌어요.
          </Text>
          <Button variant="light" color="gray" onClick={() => router.push('/my')}>
            내 우주로 돌아가기
          </Button>
        </Stack>
      </Center>
    );
  }

  const config = getEntityConfig(current);
  const EntityIcon = config.icon;
  const candidates = current.candidates ?? config.defaults;
  const contextMessages = parseContext(current.context_snippet);

  return (
    <Stack gap="xl" p="xl" maw={600} mx="auto">
      <Stack gap="xs">
        <Title order={2}>정확도 높이기</Title>
        <Text c="dimmed" fz="sm">
          OU가 아직 모르는 것들이에요. 알려주시면 더 정확해져요.
        </Text>
        <Progress value={progress} size="xs" mt="xs" color="gray" />
        <Text fz="xs" c="dimmed">{currentIdx + 1} / {entities.length}</Text>
      </Stack>

      <Transition mounted={slideIn} transition="slide-left" duration={200}>
        {(styles) => (
          <Paper p="lg" style={styles}>
            <Stack gap="lg">
              {/* Context */}
              {contextMessages.length > 0 && (
                <Stack gap="xs">
                  <Text fz="xs" c="dimmed">이 대화에서</Text>
                  <Box
                    p="sm"
                    style={{
                      background: 'var(--mantine-color-dark-6)',
                      borderRadius: 8,
                      borderLeft: '2px solid var(--mantine-color-default-border)',
                    }}
                  >
                    {contextMessages.map((msg, i) => (
                      <Text key={i} fz="sm" mb={4}>
                        <Text span c="dimmed" fz="xs">
                          {msg.role === 'user' ? '나' : 'OU'}:{' '}
                        </Text>
                        <Text
                          span
                          style={{
                            background: msg.text.includes(current.raw_text)
                              ? 'rgba(180,180,180,0.2)'
                              : 'transparent',
                            borderRadius: 2,
                            padding: msg.text.includes(current.raw_text) ? '0 2px' : 0,
                          }}
                        >
                          {msg.text}
                        </Text>
                      </Text>
                    ))}
                  </Box>
                </Stack>
              )}

              {/* Question */}
              <Group gap="xs" align="center">
                <EntityIcon size={20} weight="light" color="var(--mantine-color-gray-5)" />
                <Text fw={600}>
                  <Badge variant="outline" color="gray" mr="xs" size="lg">
                    {current.raw_text}
                  </Badge>
                  {config.question}
                </Text>
              </Group>

              {/* Candidate buttons */}
              <Stack gap="xs">
                {candidates.map(candidate => (
                  <Button
                    key={candidate}
                    variant="light"
                    color="gray"
                    justify="flex-start"
                    loading={resolving}
                    leftSection={<ArrowRight size={14} />}
                    onClick={() => handleResolve(candidate)}
                  >
                    {candidate}
                  </Button>
                ))}

                {/* Custom input */}
                <Group gap="xs" mt="xs">
                  <TextInput
                    placeholder="직접 입력..."
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    flex={1}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customInput.trim()) {
                        handleResolve(customInput.trim());
                      }
                    }}
                  />
                  <Button
                    variant="light"
                    color="gray"
                    onClick={() => customInput.trim() && handleResolve(customInput.trim())}
                    disabled={!customInput.trim()}
                    loading={resolving}
                  >
                    입력
                  </Button>
                </Group>
              </Stack>

              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={handleSkip}
              >
                건너뛰기
              </Button>
            </Stack>
          </Paper>
        )}
      </Transition>
    </Stack>
  );
}

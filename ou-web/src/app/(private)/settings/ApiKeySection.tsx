'use client';

import { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button, TextInput, Modal,
  ActionIcon, CopyButton, Tooltip, Code, Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Key, Trash, Copy, Check, Plus, PlugsConnected } from '@phosphor-icons/react';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export function ApiKeySection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/settings/api-keys');
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      setCreatedKey(data.plainKey);
      setNewKeyName('');
      fetchKeys();
    } catch {
      notifications.show({ title: '오류', message: '키 생성에 실패했습니다', color: 'red' });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });
      fetchKeys();
      notifications.show({ title: '완료', message: '키가 폐기되었습니다', color: 'gray' });
    } catch {
      notifications.show({ title: '오류', message: '키 폐기에 실패했습니다', color: 'red' });
    }
  };

  const mcpConfig = (key: string) => JSON.stringify({
    mcpServers: {
      ou: {
        url: `${typeof window !== 'undefined' ? window.location.origin : 'https://ouuniverse.com'}/api/mcp/sse`,
        headers: {
          Authorization: `Bearer ${key}`,
        },
      },
    },
  }, null, 2);

  return (
    <>
      <Paper p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="xs">
              <Key size={20} weight="bold" />
              <Title order={4}>API Keys</Title>
            </Group>
            <Group gap="xs">
              <Button
                variant="subtle"
                size="xs"
                leftSection={<PlugsConnected size={14} />}
                onClick={() => setGuideOpen(true)}
              >
                연결 가이드
              </Button>
              <Button
                size="xs"
                leftSection={<Plus size={14} />}
                onClick={() => { setCreateModalOpen(true); setCreatedKey(null); }}
              >
                새 키 생성
              </Button>
            </Group>
          </Group>

          <Text size="sm" c="dimmed">
            AI 클라이언트를 OU에 연결하면 모든 대화가 자동으로 기록됩니다.
          </Text>

          {loading ? (
            <Text size="sm" c="dimmed">불러오는 중...</Text>
          ) : keys.length === 0 ? (
            <Text size="sm" c="dimmed">생성된 키가 없습니다.</Text>
          ) : (
            <Stack gap="xs">
              {keys.map(k => (
                <Paper key={k.id} p="sm" radius="sm" bg="gray.0" style={{ border: '1px solid var(--mantine-color-gray-2)' }}>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Code>{k.key_prefix}</Code>
                      <Text size="sm" fw={500}>{k.name}</Text>
                    </Group>
                    <Group gap="xs">
                      {k.last_used_at && (
                        <Badge size="xs" variant="light" color="gray">
                          마지막 사용: {new Date(k.last_used_at).toLocaleDateString('ko-KR')}
                        </Badge>
                      )}
                      <Tooltip label="폐기">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleRevoke(k.id)}
                        >
                          <Trash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* 키 생성 모달 */}
      <Modal
        opened={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setCreatedKey(null); }}
        title="새 API Key 생성"
        size="md"
      >
        {createdKey ? (
          <Stack gap="md">
            <Text size="sm" fw={500} c="red.7">
              이 키는 다시 볼 수 없습니다. 지금 복사해 주세요.
            </Text>
            <Paper p="sm" radius="sm" bg="dark.9" style={{ wordBreak: 'break-all' }}>
              <Group justify="space-between" align="flex-start">
                <Code c="green.4" style={{ flex: 1, fontSize: 12 }}>
                  {createdKey}
                </Code>
                <CopyButton value={createdKey}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? '복사됨' : '복사'}>
                      <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Paper>

            <Text size="sm" c="dimmed">
              Claude Code 설정에 아래 내용을 추가하세요:
            </Text>
            <Paper p="sm" radius="sm" bg="gray.1">
              <Group justify="space-between" align="flex-start">
                <Code block style={{ flex: 1, fontSize: 11 }}>
                  {mcpConfig(createdKey)}
                </Code>
                <CopyButton value={mcpConfig(createdKey)}>
                  {({ copied, copy }) => (
                    <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy} mt={4}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </ActionIcon>
                  )}
                </CopyButton>
              </Group>
            </Paper>

            <Button fullWidth onClick={() => { setCreateModalOpen(false); setCreatedKey(null); }}>
              확인
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            <TextInput
              label="키 이름"
              placeholder="예: My Claude Code"
              value={newKeyName}
              onChange={e => setNewKeyName(e.currentTarget.value)}
            />
            <Button fullWidth onClick={handleCreate} loading={creating} disabled={!newKeyName.trim()}>
              생성
            </Button>
          </Stack>
        )}
      </Modal>

      {/* 연결 가이드 모달 */}
      <Modal
        opened={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="AI 클라이언트 연결 가이드"
        size="lg"
      >
        <Stack gap="lg">
          <div>
            <Text fw={600} mb="xs">Claude Code</Text>
            <Text size="sm" c="dimmed" mb="xs">
              설정 파일에 MCP 서버를 추가하세요:
            </Text>
            <Code block style={{ fontSize: 11 }}>
              {mcpConfig('ou_sk_your_key_here')}
            </Code>
          </div>

          <div>
            <Text fw={600} mb="xs">claude.ai</Text>
            <Text size="sm" c="dimmed">
              Settings → MCP Servers → Add Server에서 URL과 API Key를 입력하세요.
            </Text>
          </div>

          <div>
            <Text fw={600} mb="xs">기타 MCP 호환 클라이언트</Text>
            <Text size="sm" c="dimmed">
              MCP SSE 엔드포인트: <Code>/api/mcp/sse</Code>
              <br />
              인증: <Code>Authorization: Bearer ou_sk_...</Code>
            </Text>
          </div>

          <div>
            <Text fw={600} mb="xs">ChatGPT / Gemini 대화 가져오기</Text>
            <Text size="sm" c="dimmed">
              대화 내보내기 기능으로 JSON 파일을 다운로드한 뒤,
              OU의 Chat View에서 업로드하면 자동으로 구조화됩니다.
            </Text>
          </div>
        </Stack>
      </Modal>
    </>
  );
}

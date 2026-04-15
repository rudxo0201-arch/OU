'use client';

import { useCallback, useRef, useState } from 'react';
import { Stack, Text, Box, Group, ActionIcon, ScrollArea, Textarea, Loader, Badge } from '@mantine/core';
import { PaperPlaneRight, Lightning, User, File } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';
import { parseActions, stripActions } from '@/lib/dev/action-executor';
import { ActionBlock } from './dev/ActionBlock';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIDevView({ nodes }: ViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // DevWorkspace store에서 맥락 읽기
  const wsStore = useDevWorkspaceStore();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    const assistantMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);
    scrollToBottom();

    try {
      const chatMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // 터미널 출력에서 최근 5개
      const recentTerminal = wsStore.terminalOutput.slice(-5).map(t => ({
        command: t.command,
        stdout: t.stdout,
        stderr: t.stderr,
        exitCode: t.exitCode,
      }));

      const context: Record<string, any> = {
        activeFilePath: wsStore.activeFilePath,
        selectedText: wsStore.selectedText || undefined,
      };

      // Admin 모드에서만 터미널/Git 맥락 전송
      if (wsStore.isAdminMode) {
        if (recentTerminal.length > 0) context.recentTerminalOutput = recentTerminal;
        if (wsStore.currentErrors.length > 0) context.currentErrors = wsStore.currentErrors;
        if (wsStore.gitBranch) context.gitBranch = wsStore.gitBranch;
        if (wsStore.gitChanges.length > 0) context.gitChanges = wsStore.gitChanges;
        if (wsStore.gitLog.length > 0) context.gitLog = wsStore.gitLog.slice(0, 5);
      }

      // 프로젝트 모드: projectId 전달
      if (wsStore.projectId) {
        context.projectId = wsStore.projectId;
        context.projectName = wsStore.projectName;
      }

      const res = await fetch('/api/dev/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          context,
        }),
      });

      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
              setMessages(prev =>
                prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullText } : m)
              );
              scrollToBottom();
            }
          } catch { /* non-JSON SSE lines */ }
        }
      }
    } catch (e) {
      setMessages(prev =>
        prev.map(m => m.id === assistantMsg.id ? { ...m, content: '연결 오류가 발생했습니다.' } : m)
      );
    }

    setStreaming(false);
    scrollToBottom();
  }, [input, streaming, messages, scrollToBottom, wsStore]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
      {/* Header */}
      <Group gap="xs" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }} wrap="nowrap">
        <Lightning size={14} color="var(--mantine-color-yellow-5)" />
        <Text fz={12} fw={600}>AI Dev</Text>
        {wsStore.activeFilePath && (
          <Badge size="xs" variant="light" color="gray" leftSection={<File size={8} />}>
            {wsStore.activeFilePath.split('/').pop()}
          </Badge>
        )}
      </Group>

      {/* Messages */}
      <ScrollArea style={{ flex: 1 }} viewportRef={scrollRef} p="sm">
        {messages.length === 0 && (
          <Stack align="center" justify="center" h={200} gap="xs">
            <Lightning size={32} color="var(--mantine-color-dark-3)" />
            <Text fz="sm" c="dimmed">AI에게 개발 요청을 해보세요</Text>
            <Text fz={10} c="dimmed">&quot;이 함수 리팩토링해줘&quot;, &quot;에러 원인 분석해줘&quot;</Text>
          </Stack>
        )}

        <Stack gap="md">
          {messages.map(msg => (
            <Group key={msg.id} gap="sm" align="flex-start" wrap="nowrap">
              <Box
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: msg.role === 'user'
                    ? 'var(--mantine-color-blue-8)'
                    : 'var(--mantine-color-dark-4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {msg.role === 'user'
                  ? <User size={14} color="white" />
                  : <Lightning size={14} color="var(--mantine-color-yellow-5)" />
                }
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fz={10} c="dimmed" mb={2}>{msg.role === 'user' ? 'You' : 'AI'}</Text>
                {msg.role === 'assistant' && msg.content ? (() => {
                  const actions = parseActions(msg.content);
                  const textOnly = stripActions(msg.content);
                  return (
                    <>
                      {textOnly && (
                        <Text
                          fz={12}
                          style={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            lineHeight: 1.6,
                          }}
                        >
                          {textOnly}
                        </Text>
                      )}
                      {actions.map((action, i) => (
                        <ActionBlock key={`${msg.id}-action-${i}`} action={action} />
                      ))}
                    </>
                  );
                })() : (
                  <Text
                    fz={12}
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: msg.role === 'assistant' ? 'monospace' : 'inherit',
                      lineHeight: 1.6,
                    }}
                  >
                    {msg.content}
                    {streaming && msg.role === 'assistant' && !msg.content && (
                      <Loader size={12} color="yellow" type="dots" />
                    )}
                  </Text>
                )}
              </Box>
            </Group>
          ))}
        </Stack>
      </ScrollArea>

      {/* Input */}
      <Group
        gap="xs"
        p="sm"
        style={{ borderTop: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
        align="flex-end"
        wrap="nowrap"
      >
        <Textarea
          value={input}
          onChange={e => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="AI에게 요청..."
          variant="filled"
          size="sm"
          autosize
          minRows={1}
          maxRows={4}
          style={{ flex: 1 }}
          styles={{
            input: { fontSize: 12 },
          }}
          disabled={streaming}
        />
        <ActionIcon
          size="lg"
          variant="filled"
          color="blue"
          onClick={sendMessage}
          disabled={!input.trim() || streaming}
        >
          <PaperPlaneRight size={16} />
        </ActionIcon>
      </Group>
    </Box>
  );
}

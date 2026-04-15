'use client';

import { useCallback, useRef, useState } from 'react';
import { Text, Box, Group, Badge, ScrollArea, TextInput, Loader } from '@mantine/core';
import { Terminal, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';
import type { TerminalEntry } from '@/stores/devWorkspaceStore';
import { WebContainerTerminal } from './dev/WebContainerTerminal';

export function TerminalView({ nodes }: ViewProps) {
  const { isAdminMode, projectId } = useDevWorkspaceStore();

  // R2/WebContainer 모드 (일반 사용자): WebContainer 터미널
  if (!isAdminMode && projectId) {
    return <WebContainerTerminal />;
  }

  return <TerminalViewInner nodes={nodes} />;
}

function TerminalViewInner({ nodes }: { nodes: any[] }) {
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdIdx, setCmdIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // DevWorkspace store 연동
  const wsStore = useDevWorkspaceStore();

  const executeCommand = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd || running) return;

    setRunning(true);
    setInput('');
    setCmdHistory(prev => [cmd, ...prev]);
    setCmdIdx(-1);

    try {
      const res = await fetch('/api/dev/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();

      const ts = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      let entry: TerminalEntry;

      if (data.error) {
        entry = {
          id: Date.now().toString(),
          command: cmd,
          stdout: '',
          stderr: data.error + (data.hint ? `\n${data.hint}` : ''),
          exitCode: 1,
          timestamp: ts,
        };
      } else {
        entry = {
          id: Date.now().toString(),
          command: cmd,
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          exitCode: data.exitCode ?? 0,
          timestamp: ts,
        };
      }
      setHistory(prev => [...prev, entry]);
      wsStore.appendTerminalOutput(entry);
      if (entry.stderr && entry.exitCode !== 0) {
        wsStore.setCurrentErrors([entry.stderr]);
      }
    } catch (e) {
      const entry: TerminalEntry = {
        id: Date.now().toString(),
        command: cmd,
        stdout: '',
        stderr: 'Network error',
        exitCode: 1,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setHistory(prev => [...prev, entry]);
      wsStore.appendTerminalOutput(entry);
    }
    setRunning(false);

    // 자동 스크롤
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, [input, running]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIdx = Math.min(cmdIdx + 1, cmdHistory.length - 1);
        setCmdIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdIdx > 0) {
        const newIdx = cmdIdx - 1;
        setCmdIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      } else {
        setCmdIdx(-1);
        setInput('');
      }
    }
  }, [executeCommand, cmdHistory, cmdIdx]);

  return (
    <Box
      style={{
        background: 'var(--mantine-color-dark-9)',
        borderRadius: 8,
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 400,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <Group gap="xs" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-6)', flexShrink: 0 }}>
        <Terminal size={14} color="var(--mantine-color-green-5)" />
        <Text fz={11} c="green.5">OU Terminal</Text>
        <Badge size="xs" variant="light" color="gray">{history.length} commands</Badge>
      </Group>

      {/* Output */}
      <ScrollArea style={{ flex: 1 }} viewportRef={scrollRef} p="sm">
        {history.length === 0 && (
          <Text fz={11} c="dimmed">명령어를 입력하세요. (pnpm, git, node, npx 등)</Text>
        )}

        {history.map(entry => (
          <Box key={entry.id} mb="sm">
            {/* Command */}
            <Group gap={4} wrap="nowrap">
              <Text fz={11} c="green.6" span>$</Text>
              <Text fz={11} c="gray.3" span fw={500}>{entry.command}</Text>
              <Text fz={9} c="dimmed" span ml="auto">{entry.timestamp}</Text>
              {entry.exitCode === 0 ? (
                <CheckCircle size={10} color="var(--mantine-color-green-7)" />
              ) : (
                <WarningCircle size={10} color="var(--mantine-color-red-5)" />
              )}
            </Group>

            {/* Output */}
            {entry.stdout && (
              <Text fz={11} c="gray.4" mt={2} style={{ whiteSpace: 'pre-wrap', paddingLeft: 16 }}>
                {entry.stdout.slice(0, 5000)}
              </Text>
            )}
            {entry.stderr && (
              <Text fz={11} c="red.5" mt={2} style={{ whiteSpace: 'pre-wrap', paddingLeft: 16 }}>
                {entry.stderr.slice(0, 2000)}
              </Text>
            )}
          </Box>
        ))}

        {running && (
          <Group gap={4}>
            <Loader size={10} color="green" />
            <Text fz={11} c="dimmed">실행 중...</Text>
          </Group>
        )}
      </ScrollArea>

      {/* Input */}
      <Group
        gap={4}
        p="sm"
        style={{ borderTop: '1px solid var(--mantine-color-dark-6)', flexShrink: 0 }}
        wrap="nowrap"
      >
        <Text fz={12} c="green.6" fw={700}>$</Text>
        <TextInput
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="명령어 입력..."
          variant="unstyled"
          size="xs"
          style={{ flex: 1 }}
          styles={{
            input: {
              fontFamily: 'monospace',
              fontSize: 12,
              color: 'var(--mantine-color-gray-3)',
              background: 'transparent',
            },
          }}
          disabled={running}
          autoFocus
        />
      </Group>
    </Box>
  );
}

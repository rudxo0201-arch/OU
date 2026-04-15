'use client';

import { useState } from 'react';
import { Box, Group, Text, ActionIcon, Badge, Loader } from '@mantine/core';
import { Play, Check, X, File, Terminal, GitBranch, GitCommit, Plus, GitDiff } from '@phosphor-icons/react';
import type { DevAction, ActionResult } from '@/lib/dev/action-executor';
import { executeFileEdit, executeTerminal, executeGit } from '@/lib/dev/action-executor';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

interface ActionBlockProps {
  action: DevAction;
  onExecuted?: (result: ActionResult) => void;
}

/** Git 오퍼레이션 표시 텍스트 */
function gitLabel(action: DevAction & { type: 'git' }): string {
  switch (action.operation) {
    case 'add':
      return `git add ${action.paths?.join(', ') || '.'}`;
    case 'commit':
      return `git commit -m "${action.message || ''}"`;
    case 'diff':
      return `git diff ${action.paths?.join(', ') || ''}`;
    case 'create_branch':
      return `git checkout -b ${action.branch}`;
    case 'checkout_branch':
      return `git checkout ${action.branch}`;
    default:
      return `git ${action.operation}`;
  }
}

/** Git 오퍼레이션별 아이콘/색상 */
function gitStyle(op: string): { icon: React.ReactNode; color: string } {
  switch (op) {
    case 'commit':
      return { icon: <GitCommit size={12} />, color: 'var(--mantine-color-green-5)' };
    case 'add':
      return { icon: <Plus size={12} />, color: 'var(--mantine-color-blue-4)' };
    case 'diff':
      return { icon: <GitDiff size={12} />, color: 'var(--mantine-color-yellow-5)' };
    case 'create_branch':
    case 'checkout_branch':
      return { icon: <GitBranch size={12} />, color: 'var(--mantine-color-violet-4)' };
    default:
      return { icon: <GitBranch size={12} />, color: 'var(--mantine-color-gray-5)' };
  }
}

export function ActionBlock({ action, onExecuted }: ActionBlockProps) {
  const [status, setStatus] = useState<'pending' | 'running' | 'success' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [resultOutput, setResultOutput] = useState<string | null>(null);
  const wsStore = useDevWorkspaceStore();

  const handleExecute = async () => {
    setStatus('running');
    setError(null);

    const ctx = {
      isAdminMode: wsStore.isAdminMode,
      projectId: wsStore.projectId,
      webcontainerInstance: wsStore.webcontainerInstance,
    };

    let result: ActionResult;

    if (action.type === 'file_edit') {
      result = await executeFileEdit(action, ctx);
    } else if (action.type === 'terminal') {
      result = await executeTerminal(action, ctx);
      // 터미널 결과를 store에 반영
      if (result.data) {
        wsStore.appendTerminalOutput({
          id: Date.now().toString(),
          command: action.command,
          stdout: result.data.stdout || '',
          stderr: result.data.stderr || '',
          exitCode: result.data.exitCode ?? (result.success ? 0 : 1),
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } else {
      // git
      result = await executeGit(action, ctx);
      // git 후 상태 갱신
      if (result.success) {
        wsStore.refreshGitStatus();
        // diff 결과 표시
        if (action.operation === 'diff' && result.data?.diff) {
          setResultOutput(result.data.diff);
        }
      }
    }

    if (result.success) {
      setStatus('success');
    } else {
      setStatus('error');
      setError(result.error || 'Failed');
    }

    onExecuted?.(result);
  };

  // 렌더링 분기
  const isFileEdit = action.type === 'file_edit';
  const isTerminal = action.type === 'terminal';
  const isGit = action.type === 'git';

  const git = isGit ? gitStyle(action.operation) : null;

  return (
    <Box
      my="xs"
      p="xs"
      style={{
        borderRadius: 6,
        border: `1px solid ${isGit ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-dark-4)'}`,
        background: isGit ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-dark-7)',
      }}
    >
      {/* 헤더 */}
      <Group gap="xs" wrap="nowrap" justify="space-between">
        <Group gap={6} wrap="nowrap">
          {isFileEdit && <File size={12} color="var(--mantine-color-blue-4)" />}
          {isTerminal && <Terminal size={12} color="var(--mantine-color-green-5)" />}
          {isGit && git?.icon}
          <Text fz={11} fw={500} c="dimmed">
            {isFileEdit && action.path}
            {isTerminal && `$ ${action.command}`}
            {isGit && gitLabel(action as DevAction & { type: 'git' })}
          </Text>
        </Group>

        <Group gap={4}>
          {status === 'pending' && (
            <ActionIcon size="sm" variant="light" color={isGit ? 'green' : 'blue'} onClick={handleExecute}>
              <Play size={12} weight="fill" />
            </ActionIcon>
          )}
          {status === 'running' && <Loader size={14} color={isGit ? 'green' : 'blue'} />}
          {status === 'success' && (
            <Badge size="xs" color="green" variant="light" leftSection={<Check size={8} />}>
              완료
            </Badge>
          )}
          {status === 'error' && (
            <Badge size="xs" color="red" variant="light" leftSection={<X size={8} />}>
              실패
            </Badge>
          )}
        </Group>
      </Group>

      {/* 파일 수정: 미리보기 */}
      {isFileEdit && status === 'pending' && (
        <Box mt={6}>
          <Text fz={10} c="dimmed" mb={2}>변경 내용:</Text>
          <Box
            p={6}
            style={{
              borderRadius: 4,
              background: 'var(--mantine-color-dark-8)',
              maxHeight: 150,
              overflow: 'auto',
            }}
          >
            <Text fz={10} style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {action.content.slice(0, 1000)}
              {action.content.length > 1000 && '\n...'}
            </Text>
          </Box>
        </Box>
      )}

      {/* Git commit: 메시지 미리보기 */}
      {isGit && action.operation === 'commit' && action.message && status === 'pending' && (
        <Box mt={6}>
          <Text fz={10} c="dimmed" mb={2}>커밋 메시지:</Text>
          <Box
            p={6}
            style={{
              borderRadius: 4,
              background: 'var(--mantine-color-dark-8)',
            }}
          >
            <Text fz={10} style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {action.message}
            </Text>
          </Box>
        </Box>
      )}

      {/* Git diff 결과 */}
      {resultOutput && (
        <Box mt={6}>
          <Box
            p={6}
            style={{
              borderRadius: 4,
              background: 'var(--mantine-color-dark-8)',
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            <Text fz={10} style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {resultOutput.slice(0, 3000)}
              {resultOutput.length > 3000 && '\n...'}
            </Text>
          </Box>
        </Box>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Text fz={10} c="red" mt={4}>{error}</Text>
      )}
    </Box>
  );
}

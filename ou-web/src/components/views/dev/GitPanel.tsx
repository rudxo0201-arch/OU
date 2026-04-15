'use client';

import { useEffect, useCallback, useState } from 'react';
import { Box, Group, Text, Stack, ActionIcon, Badge, Tooltip, ScrollArea, Loader, TextInput } from '@mantine/core';
import { GitBranch, GitCommit, ArrowClockwise, Plus, Check, Eye } from '@phosphor-icons/react';
import { useDevWorkspaceStore, type GitChange } from '@/stores/devWorkspaceStore';

/** 변경 상태를 한글 라벨로 */
function statusLabel(staged: string, unstaged: string): { text: string; color: string } {
  if (staged === '?' && unstaged === '?') return { text: '새 파일', color: 'green' };
  if (staged === 'A') return { text: '추가됨', color: 'green' };
  if (staged === 'D' || unstaged === 'D') return { text: '삭제됨', color: 'red' };
  if (staged === 'R') return { text: '이름변경', color: 'yellow' };
  if (staged === 'M' || unstaged === 'M') {
    if (staged === 'M' && unstaged === ' ') return { text: '스테이지됨', color: 'blue' };
    if (staged === ' ' && unstaged === 'M') return { text: '수정됨', color: 'yellow' };
    return { text: '수정됨', color: 'yellow' };
  }
  return { text: '변경', color: 'gray' };
}

export function GitPanel() {
  const {
    gitBranch, gitChanges, gitLog, gitLoading, refreshGitStatus,
    isAdminMode, projectId, webcontainerInstance, webcontainerStatus,
  } = useDevWorkspaceStore();

  const isWC = !isAdminMode && projectId && webcontainerStatus === 'ready' && webcontainerInstance;

  const [commitMsg, setCommitMsg] = useState('');
  const [committing, setCommitting] = useState(false);
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState('');
  const [tab, setTab] = useState<'changes' | 'log'>('changes');

  useEffect(() => {
    // WebContainer 준비되면 git status 갱신
    if (isAdminMode || (webcontainerStatus === 'ready' && webcontainerInstance)) {
      refreshGitStatus();
    }
  }, [refreshGitStatus, isAdminMode, webcontainerStatus, webcontainerInstance]);

  const handleStageAll = useCallback(async () => {
    if (isWC) {
      const { wcGitAdd } = await import('@/lib/dev/webcontainer-git');
      await wcGitAdd(webcontainerInstance, ['.']);
    } else {
      await fetch('/api/dev/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'add', paths: ['.'] }),
      });
    }
    refreshGitStatus();
  }, [refreshGitStatus, isWC, webcontainerInstance]);

  const handleStageFile = useCallback(async (path: string) => {
    if (isWC) {
      const { wcGitAdd } = await import('@/lib/dev/webcontainer-git');
      await wcGitAdd(webcontainerInstance, [path]);
    } else {
      await fetch('/api/dev/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'add', paths: [path] }),
      });
    }
    refreshGitStatus();
  }, [refreshGitStatus, isWC, webcontainerInstance]);

  const handleCommit = useCallback(async () => {
    const msg = commitMsg.trim();
    if (!msg) return;
    setCommitting(true);
    try {
      if (isWC) {
        const { wcGitCommit } = await import('@/lib/dev/webcontainer-git');
        const result = await wcGitCommit(webcontainerInstance, msg);
        if (result.success) {
          setCommitMsg('');
          refreshGitStatus();
        }
      } else {
        const res = await fetch('/api/dev/git', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'commit', message: msg }),
        });
        const data = await res.json();
        if (data.success) {
          setCommitMsg('');
          refreshGitStatus();
        }
      }
    } finally {
      setCommitting(false);
    }
  }, [commitMsg, refreshGitStatus, isWC, webcontainerInstance]);

  const handleViewDiff = useCallback(async (path: string) => {
    if (diffPath === path) {
      setDiffPath(null);
      setDiffContent('');
      return;
    }
    if (isWC) {
      const { wcGitDiff } = await import('@/lib/dev/webcontainer-git');
      const diff = await wcGitDiff(webcontainerInstance, [path]);
      setDiffPath(path);
      setDiffContent(diff || '변경 없음 (이미 스테이지됨)');
    } else {
      const res = await fetch('/api/dev/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'diff', paths: [path] }),
      });
      const data = await res.json();
      setDiffPath(path);
      setDiffContent(data.diff || '변경 없음 (이미 스테이지됨)');
    }
  }, [diffPath, isWC, webcontainerInstance]);

  const stagedFiles = gitChanges.filter(c => c.staged !== ' ' && c.staged !== '?');
  const unstagedFiles = gitChanges.filter(c => c.unstaged !== ' ' || c.staged === '?');

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더: 브랜치 */}
      <Group gap="xs" p="xs" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }} wrap="nowrap" justify="space-between">
        <Group gap={6} wrap="nowrap">
          <GitBranch size={14} color="var(--mantine-color-green-5)" />
          <Text fz={12} fw={600}>{gitBranch || '...'}</Text>
        </Group>
        <ActionIcon size="xs" variant="subtle" onClick={refreshGitStatus} loading={gitLoading}>
          <ArrowClockwise size={12} />
        </ActionIcon>
      </Group>

      {/* 탭 전환 */}
      <Group gap={0} style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}>
        <Box
          px="sm"
          py={6}
          style={{
            cursor: 'pointer',
            borderBottom: tab === 'changes' ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent',
          }}
          onClick={() => setTab('changes')}
        >
          <Text fz={11} fw={tab === 'changes' ? 600 : 400} c={tab === 'changes' ? 'white' : 'dimmed'}>
            변경 {gitChanges.length > 0 && `(${gitChanges.length})`}
          </Text>
        </Box>
        <Box
          px="sm"
          py={6}
          style={{
            cursor: 'pointer',
            borderBottom: tab === 'log' ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent',
          }}
          onClick={() => setTab('log')}
        >
          <Text fz={11} fw={tab === 'log' ? 600 : 400} c={tab === 'log' ? 'white' : 'dimmed'}>
            로그
          </Text>
        </Box>
      </Group>

      {/* 컨텐츠 */}
      <ScrollArea style={{ flex: 1 }}>
        {tab === 'changes' ? (
          <Stack gap={0} p="xs">
            {gitLoading && gitChanges.length === 0 && (
              <Group justify="center" py="md">
                <Loader size={16} />
              </Group>
            )}

            {!gitLoading && gitChanges.length === 0 && (
              <Text fz={11} c="dimmed" ta="center" py="md">변경 사항 없음</Text>
            )}

            {/* Staged 섹션 */}
            {stagedFiles.length > 0 && (
              <>
                <Text fz={10} fw={600} c="dimmed" mb={4}>STAGED</Text>
                {stagedFiles.map(c => (
                  <ChangeRow key={`s-${c.path}`} change={c} onDiff={handleViewDiff} diffOpen={diffPath === c.path} />
                ))}
              </>
            )}

            {/* Unstaged 섹션 */}
            {unstagedFiles.length > 0 && (
              <>
                <Group justify="space-between" mt={stagedFiles.length > 0 ? 'sm' : 0}>
                  <Text fz={10} fw={600} c="dimmed">CHANGES</Text>
                  <Tooltip label="모두 스테이지">
                    <ActionIcon size="xs" variant="subtle" onClick={handleStageAll}>
                      <Plus size={10} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                {unstagedFiles.map(c => (
                  <ChangeRow
                    key={`u-${c.path}`}
                    change={c}
                    onStage={handleStageFile}
                    onDiff={handleViewDiff}
                    diffOpen={diffPath === c.path}
                  />
                ))}
              </>
            )}

            {/* Diff 미리보기 */}
            {diffPath && diffContent && (
              <Box
                mt="xs"
                p="xs"
                style={{
                  borderRadius: 4,
                  background: 'var(--mantine-color-dark-8)',
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Text fz={10} style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {diffContent.slice(0, 3000)}
                  {diffContent.length > 3000 && '\n...'}
                </Text>
              </Box>
            )}

            {/* 커밋 입력 */}
            {gitChanges.length > 0 && (
              <Group gap={4} mt="sm" wrap="nowrap">
                <TextInput
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.currentTarget.value)}
                  placeholder="커밋 메시지..."
                  size="xs"
                  style={{ flex: 1 }}
                  styles={{ input: { fontSize: 11 } }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCommit(); }}
                  disabled={committing}
                />
                <ActionIcon
                  size="sm"
                  variant="filled"
                  color="green"
                  onClick={handleCommit}
                  disabled={!commitMsg.trim() || committing}
                  loading={committing}
                >
                  <Check size={12} />
                </ActionIcon>
              </Group>
            )}
          </Stack>
        ) : (
          /* 로그 탭 */
          <Stack gap={2} p="xs">
            {gitLog.map(entry => (
              <Group key={entry.hash} gap={6} wrap="nowrap" py={2}>
                <GitCommit size={10} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                <Text fz={10} c="dimmed" style={{ fontFamily: 'monospace', flexShrink: 0 }}>{entry.hash}</Text>
                <Text fz={10} lineClamp={1} style={{ flex: 1 }}>{entry.message}</Text>
              </Group>
            ))}
            {gitLog.length === 0 && (
              <Text fz={11} c="dimmed" ta="center" py="md">커밋 이력 없음</Text>
            )}
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}

/** 변경 파일 행 */
function ChangeRow({
  change,
  onStage,
  onDiff,
  diffOpen,
}: {
  change: GitChange;
  onStage?: (path: string) => void;
  onDiff: (path: string) => void;
  diffOpen: boolean;
}) {
  const { text, color } = statusLabel(change.staged, change.unstaged);
  const fileName = change.path.split('/').pop() || change.path;

  return (
    <Group
      gap={4}
      wrap="nowrap"
      py={3}
      px={4}
      style={{
        borderRadius: 4,
        background: diffOpen ? 'var(--mantine-color-dark-6)' : 'transparent',
        cursor: 'pointer',
      }}
      onClick={() => onDiff(change.path)}
    >
      <Badge size="xs" variant="light" color={color} style={{ flexShrink: 0 }}>
        {text}
      </Badge>
      <Tooltip label={change.path} openDelay={500}>
        <Text fz={10} lineClamp={1} style={{ flex: 1 }}>{fileName}</Text>
      </Tooltip>
      <Group gap={2} style={{ flexShrink: 0 }}>
        {diffOpen && <Eye size={10} color="var(--mantine-color-blue-4)" />}
        {onStage && (
          <Tooltip label="스테이지">
            <ActionIcon
              size="xs"
              variant="subtle"
              onClick={e => { e.stopPropagation(); onStage(change.path); }}
            >
              <Plus size={10} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Group>
  );
}

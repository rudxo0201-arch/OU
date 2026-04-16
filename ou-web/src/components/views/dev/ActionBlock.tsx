'use client';

import { useState } from 'react';
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
    <div
      style={{
        margin: '4px 0',
        padding: 8,
        borderRadius: 6,
        border: `1px solid ${isGit ? 'var(--mantine-color-dark-3)' : 'var(--mantine-color-dark-4)'}`,
        background: isGit ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-dark-7)',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isFileEdit && <File size={12} color="var(--mantine-color-blue-4)" />}
          {isTerminal && <Terminal size={12} color="var(--mantine-color-green-5)" />}
          {isGit && git?.icon}
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--mantine-color-dimmed)' }}>
            {isFileEdit && action.path}
            {isTerminal && `$ ${action.command}`}
            {isGit && gitLabel(action as DevAction & { type: 'git' })}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
          {status === 'pending' && (
            <button onClick={handleExecute} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 4, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: isGit ? 'var(--mantine-color-green-5)' : 'var(--mantine-color-blue-4)' }}>
              <Play size={12} weight="fill" />
            </button>
          )}
          {status === 'running' && <span style={{ fontSize: 11, color: 'var(--mantine-color-dimmed)' }}>...</span>}
          {status === 'success' && (
            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(0,255,0,0.1)', color: 'var(--mantine-color-green-5)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Check size={8} /> 완료
            </span>
          )}
          {status === 'error' && (
            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,0,0,0.1)', color: 'var(--mantine-color-red-5)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <X size={8} /> 실패
            </span>
          )}
        </div>
      </div>

      {/* 파일 수정: 미리보기 */}
      {isFileEdit && status === 'pending' && (
        <div style={{ marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)', display: 'block', marginBottom: 2 }}>변경 내용:</span>
          <div
            style={{
              padding: 6,
              borderRadius: 4,
              background: 'var(--mantine-color-dark-8)',
              maxHeight: 150,
              overflow: 'auto',
            }}
          >
            <span style={{ fontSize: 10, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {action.content.slice(0, 1000)}
              {action.content.length > 1000 && '\n...'}
            </span>
          </div>
        </div>
      )}

      {/* Git commit: 메시지 미리보기 */}
      {isGit && action.operation === 'commit' && action.message && status === 'pending' && (
        <div style={{ marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)', display: 'block', marginBottom: 2 }}>커밋 메시지:</span>
          <div
            style={{
              padding: 6,
              borderRadius: 4,
              background: 'var(--mantine-color-dark-8)',
            }}
          >
            <span style={{ fontSize: 10, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {action.message}
            </span>
          </div>
        </div>
      )}

      {/* Git diff 결과 */}
      {resultOutput && (
        <div style={{ marginTop: 6 }}>
          <div
            style={{
              padding: 6,
              borderRadius: 4,
              background: 'var(--mantine-color-dark-8)',
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            <span style={{ fontSize: 10, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {resultOutput.slice(0, 3000)}
              {resultOutput.length > 3000 && '\n...'}
            </span>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <span style={{ fontSize: 10, color: 'var(--mantine-color-red-5)', display: 'block', marginTop: 4 }}>{error}</span>
      )}
    </div>
  );
}

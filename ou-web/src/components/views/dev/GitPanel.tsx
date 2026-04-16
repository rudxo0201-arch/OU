'use client';

import { useEffect, useCallback, useState } from 'react';
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 헤더: 브랜치 */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <GitBranch size={14} color="var(--mantine-color-green-5)" />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{gitBranch || '...'}</span>
        </div>
        <button onClick={refreshGitStatus} disabled={gitLoading} style={{ background: 'transparent', border: 'none', cursor: gitLoading ? 'not-allowed' : 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'inherit', opacity: gitLoading ? 0.5 : 1 }}>
          <ArrowClockwise size={12} />
        </button>
      </div>

      {/* 탭 전환 */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 0, borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}>
        <div
          onClick={() => setTab('changes')}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            borderBottom: tab === 'changes' ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: tab === 'changes' ? 600 : 400, color: tab === 'changes' ? 'white' : 'var(--mantine-color-dimmed)' }}>
            변경 {gitChanges.length > 0 && `(${gitChanges.length})`}
          </span>
        </div>
        <div
          onClick={() => setTab('log')}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            borderBottom: tab === 'log' ? '2px solid var(--mantine-color-blue-5)' : '2px solid transparent',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: tab === 'log' ? 600 : 400, color: tab === 'log' ? 'white' : 'var(--mantine-color-dimmed)' }}>
            로그
          </span>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'changes' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 8 }}>
            {gitLoading && gitChanges.length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                <span style={{ fontSize: 11, color: 'var(--mantine-color-dimmed)' }}>...</span>
              </div>
            )}

            {!gitLoading && gitChanges.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--mantine-color-dimmed)', textAlign: 'center', display: 'block', padding: 16 }}>변경 사항 없음</span>
            )}

            {/* Staged 섹션 */}
            {stagedFiles.length > 0 && (
              <>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--mantine-color-dimmed)', marginBottom: 4, display: 'block' }}>STAGED</span>
                {stagedFiles.map(c => (
                  <ChangeRow key={`s-${c.path}`} change={c} onDiff={handleViewDiff} diffOpen={diffPath === c.path} />
                ))}
              </>
            )}

            {/* Unstaged 섹션 */}
            {unstagedFiles.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: stagedFiles.length > 0 ? 8 : 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--mantine-color-dimmed)' }}>CHANGES</span>
                  <button title="모두 스테이지" onClick={handleStageAll} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'inherit' }}>
                    <Plus size={10} />
                  </button>
                </div>
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
              <div
                style={{
                  marginTop: 4,
                  padding: 8,
                  borderRadius: 4,
                  background: 'var(--mantine-color-dark-8)',
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <span style={{ fontSize: 10, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {diffContent.slice(0, 3000)}
                  {diffContent.length > 3000 && '\n...'}
                </span>
              </div>
            )}

            {/* 커밋 입력 */}
            {gitChanges.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'row', gap: 4, marginTop: 8 }}>
                <input
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder="커밋 메시지..."
                  style={{ flex: 1, padding: '4px 8px', fontSize: 11, border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCommit(); }}
                  disabled={committing}
                />
                <button
                  onClick={handleCommit}
                  disabled={!commitMsg.trim() || committing}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--mantine-color-green-7)',
                    border: 'none',
                    borderRadius: 4,
                    cursor: !commitMsg.trim() || committing ? 'not-allowed' : 'pointer',
                    opacity: !commitMsg.trim() || committing ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'white',
                  }}
                >
                  <Check size={12} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 로그 탭 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 8 }}>
            {gitLog.map(entry => (
              <div key={entry.hash} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                <GitCommit size={10} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)', fontFamily: 'monospace', flexShrink: 0 }}>{entry.hash}</span>
                <span style={{ fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.message}</span>
              </div>
            ))}
            {gitLog.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--mantine-color-dimmed)', textAlign: 'center', display: 'block', padding: 16 }}>커밋 이력 없음</span>
            )}
          </div>
        )}
      </div>
    </div>
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
    <div
      onClick={() => onDiff(change.path)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: '3px 4px',
        borderRadius: 4,
        background: diffOpen ? 'var(--mantine-color-dark-6)' : 'transparent',
        cursor: 'pointer',
      }}
    >
      <span style={{
        fontSize: 10,
        padding: '1px 6px',
        borderRadius: 4,
        background: 'rgba(255,255,255,0.08)',
        color: `var(--mantine-color-${color}-5)`,
        flexShrink: 0,
      }}>
        {text}
      </span>
      <span title={change.path} style={{ fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 2, flexShrink: 0 }}>
        {diffOpen && <Eye size={10} color="var(--mantine-color-blue-4)" />}
        {onStage && (
          <button
            title="스테이지"
            onClick={e => { e.stopPropagation(); onStage(change.path); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'inherit' }}
          >
            <Plus size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

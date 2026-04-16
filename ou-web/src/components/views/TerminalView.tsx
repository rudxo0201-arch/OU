'use client';

import { useCallback, useRef, useState } from 'react';
import { Terminal, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';
import type { TerminalEntry } from '@/stores/devWorkspaceStore';
import { WebContainerTerminal } from './dev/WebContainerTerminal';

export function TerminalView({ nodes }: ViewProps) {
  const { isAdminMode, projectId } = useDevWorkspaceStore();

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
    <div
      style={{
        background: 'var(--ou-bg-deep, #0a0a0a)',
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12, borderBottom: '1px solid var(--ou-border-muted, #222)', flexShrink: 0 }}>
        <Terminal size={14} color="var(--ou-green, #4caf50)" />
        <span style={{ fontSize: 11, color: 'var(--ou-green, #4caf50)' }}>OU Terminal</span>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: 'var(--ou-bg-subtle, rgba(255,255,255,0.06))', color: 'var(--ou-text-dimmed, #888)' }}>
          {history.length} commands
        </span>
      </div>

      {/* Output */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {history.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>명령어를 입력하세요. (pnpm, git, node, npx 등)</span>
        )}

        {history.map(entry => (
          <div key={entry.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--ou-green, #4caf50)' }}>$</span>
              <span style={{ fontSize: 11, color: 'var(--ou-text-secondary, #ccc)', fontWeight: 500 }}>{entry.command}</span>
              <span style={{ fontSize: 9, color: 'var(--ou-text-dimmed, #888)', marginLeft: 'auto' }}>{entry.timestamp}</span>
              {entry.exitCode === 0 ? (
                <CheckCircle size={10} color="var(--ou-green, #4caf50)" />
              ) : (
                <WarningCircle size={10} color="var(--ou-red, #f44336)" />
              )}
            </div>

            {entry.stdout && (
              <p style={{ fontSize: 11, color: 'var(--ou-text-secondary, #aaa)', margin: '2px 0 0', whiteSpace: 'pre-wrap', paddingLeft: 16 }}>
                {entry.stdout.slice(0, 5000)}
              </p>
            )}
            {entry.stderr && (
              <p style={{ fontSize: 11, color: 'var(--ou-red, #f44336)', margin: '2px 0 0', whiteSpace: 'pre-wrap', paddingLeft: 16 }}>
                {entry.stderr.slice(0, 2000)}
              </p>
            )}
          </div>
        ))}

        {running && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>실행 중...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{ display: 'flex', gap: 4, alignItems: 'center', padding: 12, borderTop: '1px solid var(--ou-border-muted, #222)', flexShrink: 0, flexWrap: 'nowrap' }}
      >
        <span style={{ fontSize: 12, color: 'var(--ou-green, #4caf50)', fontWeight: 700 }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="명령어 입력..."
          disabled={running}
          autoFocus
          style={{
            flex: 1,
            fontFamily: 'monospace',
            fontSize: 12,
            color: 'var(--ou-text-secondary, #ccc)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon } from '@phosphor-icons/react';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

/**
 * WebContainer 기반 xterm.js 터미널
 * 실제 jsh 쉘 프로세스에 연결
 */
export function WebContainerTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const shellRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { webcontainerStatus, webcontainerError, webcontainerInstance } = useDevWorkspaceStore();

  useEffect(() => {
    if (webcontainerStatus !== 'ready' || !webcontainerInstance || !terminalRef.current) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    const abortController = new AbortController();

    async function init() {
      try {
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        if (disposed || !terminalRef.current) return;

        // xterm 인스턴스 생성
        const term = new Terminal({
          theme: {
            background: '#1a1b26',
            foreground: '#c0caf5',
            cursor: '#c0caf5',
            selectionBackground: '#33467c',
          },
          fontSize: 13,
          fontFamily: 'monospace',
          cursorBlink: true,
          convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;

        // 쉘 프로세스 시작
        const { spawnShell } = await import('@/lib/dev/webcontainer');
        const shell = await spawnShell();
        shellRef.current = shell;

        // 쉘 출력 → xterm (abort signal로 안전하게 정리)
        shell.output.pipeTo(
          new WritableStream({
            write(chunk) {
              if (!disposed) term.write(chunk);
            },
          }),
          { signal: abortController.signal },
        ).catch(() => {}); // abort 시 에러 무시

        // xterm 입력 → 쉘
        const writer = shell.input.getWriter();
        term.onData(data => {
          if (!disposed) writer.write(data);
        });

        // 리사이즈
        resizeObserver = new ResizeObserver(() => {
          try {
            fitAddon.fit();
            shell.resize({ cols: term.cols, rows: term.rows });
          } catch { /* resize 중 에러 무시 */ }
        });
        resizeObserver.observe(terminalRef.current!);
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      }
    }

    init();

    return () => {
      disposed = true;
      abortController.abort(); // WritableStream 정리
      resizeObserver?.disconnect();
      xtermRef.current?.dispose();
      xtermRef.current = null;
      // shell kill은 약간의 지연 후 (stream flush 대기)
      const shell = shellRef.current;
      shellRef.current = null;
      if (shell) setTimeout(() => shell.kill(), 100);
    };
  }, [webcontainerStatus, webcontainerInstance]);

  // 로딩 상태
  if (webcontainerStatus === 'booting' || webcontainerStatus === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
        <span style={{ color: 'green', fontSize: 'var(--mantine-font-size-sm)' }}>...</span>
        <span style={{ fontSize: 11, color: 'var(--mantine-color-dimmed)' }}>
          {webcontainerStatus === 'booting' ? '런타임 시작 중...' : '프로젝트 로드 중...'}
        </span>
      </div>
    );
  }

  // 에러 상태
  if (webcontainerStatus === 'error' || error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
        <TerminalIcon size={28} color="var(--mantine-color-red-5)" />
        <span style={{ fontSize: 11, color: 'var(--mantine-color-red-5)' }}>터미널 초기화 실패</span>
        <span style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)', maxWidth: 300, textAlign: 'center' }}>
          {error || webcontainerError || '브라우저가 WebContainer를 지원하지 않을 수 있습니다'}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={terminalRef}
      style={{
        height: '100%',
        width: '100%',
        background: '#1a1b26',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    />
  );
}

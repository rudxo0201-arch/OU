'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Text, Loader, Stack } from '@mantine/core';
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

        // 쉘 출력 → xterm
        shell.output.pipeTo(
          new WritableStream({
            write(chunk) {
              if (!disposed) term.write(chunk);
            },
          }),
        );

        // xterm 입력 → 쉘
        const writer = shell.input.getWriter();
        term.onData(data => {
          writer.write(data);
        });

        // 리사이즈
        const resizeObserver = new ResizeObserver(() => {
          fitAddon.fit();
          shell.resize({ cols: term.cols, rows: term.rows });
        });
        resizeObserver.observe(terminalRef.current!);

        return () => {
          resizeObserver.disconnect();
        };
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      }
    }

    const cleanupPromise = init();

    return () => {
      disposed = true;
      xtermRef.current?.dispose();
      xtermRef.current = null;
      shellRef.current?.kill();
      shellRef.current = null;
      cleanupPromise?.then(cleanup => cleanup?.());
    };
  }, [webcontainerStatus, webcontainerInstance]);

  // 로딩 상태
  if (webcontainerStatus === 'booting' || webcontainerStatus === 'loading') {
    return (
      <Stack align="center" justify="center" h="100%" gap="xs">
        <Loader size={20} color="green" />
        <Text fz={11} c="dimmed">
          {webcontainerStatus === 'booting' ? '런타임 시작 중...' : '프로젝트 로드 중...'}
        </Text>
      </Stack>
    );
  }

  // 에러 상태
  if (webcontainerStatus === 'error' || error) {
    return (
      <Stack align="center" justify="center" h="100%" gap="xs">
        <TerminalIcon size={28} color="var(--mantine-color-red-5)" />
        <Text fz={11} c="red.5">터미널 초기화 실패</Text>
        <Text fz={10} c="dimmed" maw={300} ta="center">
          {error || webcontainerError || '브라우저가 WebContainer를 지원하지 않을 수 있습니다'}
        </Text>
      </Stack>
    );
  }

  return (
    <Box
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

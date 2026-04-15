'use client';

import { useCallback, useRef, useState } from 'react';
import { Box } from '@mantine/core';
import type { ViewProps } from './registry';
import { CodeView } from './CodeView';
import { TerminalView } from './TerminalView';
import { AIDevView } from './AIDevView';
import { GitPanel } from './dev/GitPanel';
import { ProjectSelector } from './dev/ProjectSelector';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

const MIN_PANEL = 200;

export function DevWorkspaceView({ nodes, filters, onSave, layoutConfig }: ViewProps) {
  const { projectId, isAdminMode } = useDevWorkspaceStore();

  // 프로젝트 미선택 + 비 admin → ProjectSelector 표시
  if (!projectId && !isAdminMode) {
    return <ProjectSelector />;
  }

  return <DevWorkspaceLayout nodes={nodes} filters={filters} onSave={onSave} layoutConfig={layoutConfig} />;
}

function DevWorkspaceLayout({ nodes, filters, onSave, layoutConfig }: ViewProps) {
  // 패널 비율 (%) — 좌측 영역 너비, 좌측 내 에디터 높이
  const [leftWidth, setLeftWidth] = useState(65);
  const [editorHeight, setEditorHeight] = useState(65);
  const [rightSplit, setRightSplit] = useState(65); // AI Dev(상) : Git Panel(하)
  const containerRef = useRef<HTMLDivElement>(null);

  // 좌/우 수평 리사이즈
  const handleHorizontalDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const startX = e.clientX;
    const startWidth = leftWidth;
    const rect = container.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const pct = startWidth + (dx / rect.width) * 100;
      setLeftWidth(Math.max(20, Math.min(80, pct)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidth]);

  // 에디터/터미널 수직 리사이즈
  const handleVerticalDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const startY = e.clientY;
    const startHeight = editorHeight;
    const rect = container.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - startY;
      const pct = startHeight + (dy / rect.height) * 100;
      setEditorHeight(Math.max(20, Math.min(80, pct)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [editorHeight]);

  // 우측 AI/Git 수직 리사이즈
  const handleRightVerticalDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const startY = e.clientY;
    const startSplit = rightSplit;
    const rect = container.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - startY;
      const pct = startSplit + (dy / rect.height) * 100;
      setRightSplit(Math.max(30, Math.min(85, pct)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightSplit]);

  const viewProps: ViewProps = { nodes, filters, onSave, layoutConfig };

  return (
    <Box
      ref={containerRef}
      style={{
        display: 'flex',
        height: '100%',
        minHeight: 600,
        background: 'var(--mantine-color-dark-8)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* 좌측: 코드 + 터미널 */}
      <Box style={{ width: `${leftWidth}%`, display: 'flex', flexDirection: 'column', minWidth: MIN_PANEL }}>
        {/* 코드 에디터 */}
        <Box style={{ height: `${editorHeight}%`, minHeight: MIN_PANEL, overflow: 'hidden' }}>
          <CodeView {...viewProps} />
        </Box>

        {/* 수직 드래그 핸들 */}
        <Box
          onMouseDown={handleVerticalDrag}
          style={{
            height: 4,
            cursor: 'row-resize',
            background: 'var(--mantine-color-dark-5)',
            flexShrink: 0,
          }}
        />

        {/* 터미널 */}
        <Box style={{ flex: 1, minHeight: 120, overflow: 'hidden' }}>
          <TerminalView {...viewProps} />
        </Box>
      </Box>

      {/* 수평 드래그 핸들 */}
      <Box
        onMouseDown={handleHorizontalDrag}
        style={{
          width: 4,
          cursor: 'col-resize',
          background: 'var(--mantine-color-dark-5)',
          flexShrink: 0,
        }}
      />

      {/* 우측: AI Dev + Git Panel */}
      <Box style={{ flex: 1, minWidth: MIN_PANEL, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* AI Dev */}
        <Box style={{ height: `${rightSplit}%`, overflow: 'hidden' }}>
          <AIDevView {...viewProps} />
        </Box>

        {/* 수직 드래그 핸들 */}
        <Box
          onMouseDown={handleRightVerticalDrag}
          style={{
            height: 4,
            cursor: 'row-resize',
            background: 'var(--mantine-color-dark-5)',
            flexShrink: 0,
          }}
        />

        {/* Git Panel */}
        <Box style={{ flex: 1, minHeight: 100, overflow: 'hidden' }}>
          <GitPanel />
        </Box>
      </Box>
    </Box>
  );
}

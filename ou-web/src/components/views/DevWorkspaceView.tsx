'use client';

import { useCallback, useRef, useState } from 'react';
import { Terminal, Globe } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { CodeView } from './CodeView';
import { TerminalView } from './TerminalView';
import { AIDevView } from './AIDevView';
import { GitPanel } from './dev/GitPanel';
import { PreviewPanel } from './dev/PreviewPanel';
import { ProjectSelector } from './dev/ProjectSelector';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';
import { useWebContainer } from '@/hooks/useWebContainer';

const MIN_PANEL = 200;

export function DevWorkspaceView({ nodes, filters, onSave, layoutConfig }: ViewProps) {
  const { projectId, isAdminMode } = useDevWorkspaceStore();

  if (!projectId && !isAdminMode) {
    return <ProjectSelector />;
  }

  return <DevWorkspaceLayout nodes={nodes} filters={filters} onSave={onSave} layoutConfig={layoutConfig} />;
}

function DevWorkspaceLayout({ nodes, filters, onSave, layoutConfig }: ViewProps) {
  useWebContainer();

  const [leftWidth, setLeftWidth] = useState(65);
  const [editorHeight, setEditorHeight] = useState(65);
  const [rightSplit, setRightSplit] = useState(65);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        height: '100%',
        minHeight: 600,
        background: 'var(--ou-bg-deep, #0a0a0a)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Left: code + terminal */}
      <div style={{ width: `${leftWidth}%`, display: 'flex', flexDirection: 'column', minWidth: MIN_PANEL }}>
        <div style={{ height: `${editorHeight}%`, minHeight: MIN_PANEL, overflow: 'hidden' }}>
          <CodeView {...viewProps} />
        </div>

        <div
          onMouseDown={handleVerticalDrag}
          style={{
            height: 4,
            cursor: 'row-resize',
            background: 'var(--ou-border-muted, #222)',
            flexShrink: 0,
          }}
        />

        <BottomPanel viewProps={viewProps} />
      </div>

      {/* Horizontal drag handle */}
      <div
        onMouseDown={handleHorizontalDrag}
        style={{
          width: 4,
          cursor: 'col-resize',
          background: 'var(--ou-border-muted, #222)',
          flexShrink: 0,
        }}
      />

      {/* Right: AI Dev + Git Panel */}
      <div style={{ flex: 1, minWidth: MIN_PANEL, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: `${rightSplit}%`, overflow: 'hidden' }}>
          <AIDevView {...viewProps} />
        </div>

        <div
          onMouseDown={handleRightVerticalDrag}
          style={{
            height: 4,
            cursor: 'row-resize',
            background: 'var(--ou-border-muted, #222)',
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minHeight: 100, overflow: 'hidden' }}>
          <GitPanel />
        </div>
      </div>
    </div>
  );
}

function BottomPanel({ viewProps }: { viewProps: ViewProps }) {
  const [tab, setTab] = useState<'terminal' | 'preview'>('terminal');
  const { previewUrl } = useDevWorkspaceStore();

  return (
    <div style={{ flex: 1, minHeight: 120, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Tab header */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--ou-border-muted, #222)', flexShrink: 0 }}>
        <div
          onClick={() => setTab('terminal')}
          style={{
            display: 'flex', gap: 4, alignItems: 'center',
            padding: '4px 12px',
            cursor: 'pointer',
            borderBottom: tab === 'terminal' ? '2px solid var(--ou-green, #4caf50)' : '2px solid transparent',
          }}
        >
          <Terminal size={11} color={tab === 'terminal' ? 'var(--ou-green, #4caf50)' : undefined} />
          <span style={{ fontSize: 10, fontWeight: tab === 'terminal' ? 600 : 400, color: tab === 'terminal' ? undefined : 'var(--ou-text-dimmed, #888)' }}>
            터미널
          </span>
        </div>
        <div
          onClick={() => setTab('preview')}
          style={{
            display: 'flex', gap: 4, alignItems: 'center',
            padding: '4px 12px',
            cursor: 'pointer',
            borderBottom: tab === 'preview' ? '2px solid var(--ou-blue, #2196f3)' : '2px solid transparent',
          }}
        >
          <Globe size={11} color={tab === 'preview' ? 'var(--ou-blue, #2196f3)' : undefined} />
          <span style={{ fontSize: 10, fontWeight: tab === 'preview' ? 600 : 400, color: tab === 'preview' ? undefined : 'var(--ou-text-dimmed, #888)' }}>
            프리뷰
          </span>
          {previewUrl && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ou-green, #4caf50)' }} />}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: tab === 'terminal' ? 'block' : 'none' }}>
        <TerminalView {...viewProps} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: tab === 'preview' ? 'block' : 'none' }}>
        <PreviewPanel />
      </div>
    </div>
  );
}

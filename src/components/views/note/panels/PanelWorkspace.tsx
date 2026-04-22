'use client';

import { useRef, useCallback } from 'react';
import { usePanels } from './usePanels';
import type { PanelTree, PanelContent } from './types';
import { PanelLeaf } from './PanelLeaf';

// ── 재귀 렌더러 ───────────────────────────────────────────────

interface RendererProps {
  node: PanelTree;
  focusedId: string;
  onFocus: (id: string) => void;
  onSplit: (id: string, dir: 'h' | 'v', content?: PanelContent) => void;
  onClose: (id: string) => void;
  onContent: (id: string, content: PanelContent) => void;
  onResize: (id: string, sizes: [number, number]) => void;
  canClose: boolean;
}

function PanelRenderer({
  node, focusedId, onFocus, onSplit, onClose, onContent, onResize, canClose,
}: RendererProps) {
  if (node.type === 'leaf') {
    return (
      <PanelLeaf
        panel={node}
        focused={node.id === focusedId}
        canClose={canClose}
        onFocus={() => onFocus(node.id)}
        onSplit={(dir) => onSplit(node.id, dir)}
        onClose={() => onClose(node.id)}
        onContent={(c) => onContent(node.id, c)}
      />
    );
  }

  const isH = node.direction === 'h';
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizerDrag = (deltaPixels: number) => {
    const el = containerRef.current;
    if (!el) return;
    const total = isH ? el.offsetWidth : el.offsetHeight;
    if (!total) return;
    const delta = (deltaPixels / total) * 100;
    const newA = Math.max(10, Math.min(90, node.sizes[0] + delta));
    onResize(node.id, [newA, 100 - newA]);
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: isH ? 'row' : 'column',
        width: '100%', height: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{
        [isH ? 'width' : 'height']: `${node.sizes[0]}%`,
        minWidth: isH ? 120 : undefined,
        minHeight: !isH ? 80 : undefined,
        overflow: 'hidden', flexShrink: 0,
      }}>
        <PanelRenderer
          node={node.children[0]}
          focusedId={focusedId}
          onFocus={onFocus}
          onSplit={onSplit}
          onClose={onClose}
          onContent={onContent}
          onResize={onResize}
          canClose={true}
        />
      </div>

      <Resizer direction={node.direction} onDrag={handleResizerDrag} />

      <div style={{
        flex: 1, overflow: 'hidden',
        minWidth: isH ? 120 : undefined,
        minHeight: !isH ? 80 : undefined,
      }}>
        <PanelRenderer
          node={node.children[1]}
          focusedId={focusedId}
          onFocus={onFocus}
          onSplit={onSplit}
          onClose={onClose}
          onContent={onContent}
          onResize={onResize}
          canClose={true}
        />
      </div>
    </div>
  );
}

// ── 드래그 리사이저 ───────────────────────────────────────────

function Resizer({ direction, onDrag }: { direction: 'h' | 'v'; onDrag: (delta: number) => void }) {
  const isH = direction === 'h';
  const lastPos = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    lastPos.current = isH ? e.clientX : e.clientY;

    const onMove = (ev: MouseEvent) => {
      const pos = isH ? ev.clientX : ev.clientY;
      onDrag(pos - lastPos.current);
      lastPos.current = pos;
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isH, onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        [isH ? 'width' : 'height']: 3,
        [isH ? 'height' : 'width']: '100%',
        flexShrink: 0,
        background: 'var(--ou-glass-border)',
        cursor: isH ? 'col-resize' : 'row-resize',
        zIndex: 10,
        transition: 'background 150ms',
        position: 'relative',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4DA6FF88'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ou-glass-border)'; }}
    />
  );
}

// ── PanelWorkspace ────────────────────────────────────────────

export function PanelWorkspace({ noteId }: { noteId?: string }) {
  const { root, focusedId, setFocusedId, splitPanel, closePanel, setContent, resize } = usePanels(noteId);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <PanelRenderer
        node={root}
        focusedId={focusedId}
        onFocus={setFocusedId}
        onSplit={splitPanel}
        onClose={closePanel}
        onContent={setContent}
        onResize={resize}
        canClose={root.type === 'split'}
      />
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { useStudioStore } from '../studioStore';

export function useKeyboard(onSpaceChange: (held: boolean) => void) {
  const spaceRef = useRef(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // 입력 필드 안에서는 무시
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const store = useStudioStore.getState();

      // Space → pan mode
      if (e.code === 'Space' && !spaceRef.current) {
        spaceRef.current = true;
        onSpaceChange(true);
        e.preventDefault();
        return;
      }

      const meta = e.metaKey || e.ctrlKey;

      // ⌘Z → undo
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); return; }
      // ⌘⇧Z → redo
      if (meta && e.key === 'z' && e.shiftKey) { e.preventDefault(); store.redo(); return; }
      // ⌘A → select all
      if (meta && e.key === 'a') { e.preventDefault(); store.selectAll(); return; }
      // ⌘D → duplicate
      if (meta && e.key === 'd') { e.preventDefault(); store.duplicateSelected(); return; }
      // ⌘0 → reset viewport
      if (meta && e.key === '0') { e.preventDefault(); store.resetViewport(); return; }
      // ⌘+ → zoom in
      if (meta && (e.key === '=' || e.key === '+')) { e.preventDefault(); store.zoom(1.2, window.innerWidth / 2, window.innerHeight / 2); return; }
      // ⌘- → zoom out
      if (meta && e.key === '-') { e.preventDefault(); store.zoom(0.8, window.innerWidth / 2, window.innerHeight / 2); return; }

      // Delete / Backspace → remove
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = store.selectedIds;
        if (ids.length > 0) { store.removeElements(ids); }
        return;
      }

      // Escape → deselect
      if (e.key === 'Escape') { store.clearSelection(); return; }

      // G → toggle snap
      if (e.key === 'g' || e.key === 'G') { store.toggleSnap(); return; }

      // [ → send backward, ] → bring forward
      if (e.key === '[') { const id = store.selectedIds[0]; if (id) store.sendBackward(id); return; }
      if (e.key === ']') { const id = store.selectedIds[0]; if (id) store.bringForward(id); return; }

      // Arrow keys → nudge
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const nudge = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -nudge : e.key === 'ArrowRight' ? nudge : 0;
        const dy = e.key === 'ArrowUp' ? -nudge : e.key === 'ArrowDown' ? nudge : 0;
        const ids = store.selectedIds;
        const elements = store.elements;
        const updates = ids.map(id => {
          const el = elements.find(e => e.id === id);
          if (!el) return null;
          return { id, x: el.x + dx, y: el.y + dy, width: el.width, height: el.height };
        }).filter(Boolean) as Array<{ id: string; x: number; y: number; width: number; height: number }>;
        if (updates.length > 0) store.commitPositions(updates);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spaceRef.current = false;
        onSpaceChange(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onSpaceChange]);
}

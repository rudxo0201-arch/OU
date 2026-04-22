import { useState, useCallback, useEffect } from 'react';
import type { PanelTree, LeafPanel, PanelContent } from './types';

let _id = 0;
function genId() { return `p${++_id}`; }

// ── 트리 조작 헬퍼 ────────────────────────────────────────────

function mapLeaf(
  tree: PanelTree,
  id: string,
  fn: (leaf: LeafPanel) => PanelTree,
): PanelTree {
  if (tree.type === 'leaf') return tree.id === id ? fn(tree) : tree;
  const [a, b] = tree.children;
  return {
    ...tree,
    children: [mapLeaf(a, id, fn), mapLeaf(b, id, fn)],
  } as PanelTree;
}

function removeLeaf(tree: PanelTree, id: string): PanelTree | null {
  if (tree.type === 'leaf') return tree.id === id ? null : tree;
  const a = removeLeaf(tree.children[0], id);
  const b = removeLeaf(tree.children[1], id);
  if (a === null) return b;
  if (b === null) return a;
  return { ...tree, children: [a, b] };
}

function mapSplit(
  tree: PanelTree,
  id: string,
  fn: (node: PanelTree & { type: 'split' }) => PanelTree,
): PanelTree {
  if (tree.type === 'leaf') return tree;
  if (tree.id === id) return fn(tree);
  const [a, b] = tree.children;
  return {
    ...tree,
    children: [mapSplit(a, id, fn), mapSplit(b, id, fn)],
  } as PanelTree;
}

// ── Hook ──────────────────────────────────────────────────────

export function usePanels(initialNoteId?: string) {
  const makeInitial = (): PanelTree => ({
    id: genId(),
    type: 'leaf',
    content: initialNoteId
      ? { kind: 'note', noteId: initialNoteId }
      : { kind: 'empty' },
  });

  const [root, setRoot] = useState<PanelTree>(makeInitial);
  const [focusedId, setFocusedId] = useState<string>(() =>
    (root as LeafPanel).id,
  );

  // URL noteId 변경 시 focused 패널 업데이트
  useEffect(() => {
    if (!initialNoteId) return;
    setRoot(prev =>
      mapLeaf(prev, focusedId, leaf => ({
        ...leaf,
        content: { kind: 'note', noteId: initialNoteId },
      })),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNoteId]);

  const splitPanel = useCallback(
    (id: string, direction: 'h' | 'v', content: PanelContent = { kind: 'empty' }) => {
      const newId = genId();
      setRoot(prev =>
        mapLeaf(prev, id, leaf => ({
          id: genId(),
          type: 'split',
          direction,
          sizes: [50, 50],
          children: [leaf, { id: newId, type: 'leaf', content }],
        })),
      );
      setFocusedId(newId);
    },
    [],
  );

  const closePanel = useCallback((id: string) => {
    setRoot(prev => removeLeaf(prev, id) ?? prev);
  }, []);

  const setContent = useCallback((id: string, content: PanelContent) => {
    setRoot(prev => mapLeaf(prev, id, leaf => ({ ...leaf, content })));
  }, []);

  const resize = useCallback((id: string, sizes: [number, number]) => {
    setRoot(prev =>
      mapSplit(prev, id, node => ({ ...node, sizes })),
    );
  }, []);

  return { root, focusedId, setFocusedId, splitPanel, closePanel, setContent, resize };
}

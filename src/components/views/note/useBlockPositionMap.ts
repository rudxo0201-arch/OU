'use client';

import { useCallback, useRef } from 'react';

export type BlockRect = {
  blockId: string;       // Tiptap node pos (stringified) or ouViewBlock nodeId
  nodeId?: string;       // DataNode id (OuViewBlock인 경우)
  domain?: string;       // DataNode domain
  rect: DOMRect;
};

/**
 * useBlockPositionMap
 * 에디터 DOM을 스캔해서 블록 좌표 맵을 빌드한다.
 * 필기 저장 시 stroke 좌표와 교차 연산에 사용.
 */
export function useBlockPositionMap(editorContainerRef: React.RefObject<HTMLElement>) {
  const mapRef = useRef<BlockRect[]>([]);

  const build = useCallback(() => {
    if (!editorContainerRef.current) return [];

    const blocks: BlockRect[] = [];
    const container = editorContainerRef.current;

    // 일반 블록 — ProseMirror의 각 top-level 자식
    const proseMirrorEl = container.querySelector('.ProseMirror');
    if (proseMirrorEl) {
      Array.from(proseMirrorEl.children).forEach((child, i) => {
        const el = child as HTMLElement;
        blocks.push({
          blockId: `block-${i}`,
          rect: el.getBoundingClientRect(),
        });
      });
    }

    // OuViewBlock — data-type="ou-view-block" 속성으로 식별
    const viewBlocks = container.querySelectorAll('[data-type="ou-view-block"]');
    viewBlocks.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const nodeId = htmlEl.dataset.nodeId;
      const domain = htmlEl.dataset.domain;
      blocks.push({
        blockId: `ou-view-${nodeId ?? Math.random()}`,
        nodeId,
        domain,
        rect: htmlEl.getBoundingClientRect(),
      });
    });

    mapRef.current = blocks;
    return blocks;
  }, [editorContainerRef]);

  /**
   * 특정 좌표(x, y)에 해당하는 블록을 찾는다.
   * 필기 stroke의 각 점에 대해 호출.
   */
  const findBlockAt = useCallback((x: number, y: number): BlockRect | null => {
    const blocks = mapRef.current;
    // y 기준으로 가장 가까운 블록 반환
    let best: BlockRect | null = null;
    let bestDist = Infinity;

    for (const block of blocks) {
      const r = block.rect;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return block; // 완전 포함
      }
      // 포함되지 않으면 y 거리로 nearest
      const dist = Math.min(Math.abs(y - r.top), Math.abs(y - r.bottom));
      if (dist < bestDist) {
        bestDist = dist;
        best = block;
      }
    }
    return best;
  }, []);

  return { build, findBlockAt, getMap: () => mapRef.current };
}

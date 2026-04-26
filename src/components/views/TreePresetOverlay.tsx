'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Maximize2 } from 'lucide-react';
import { OuFolderTree } from '@/components/ds';
import { useTreeData } from '@/lib/data-finder/useTreeData';
import type { TreeNode } from '@/types';

export function TreePresetOverlay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetId = searchParams.get('preset');
  const ox = Number(searchParams.get('ox') ?? 60);
  const oy = Number(searchParams.get('oy') ?? 300);

  const { treeData, preset, loading } = useTreeData();
  const overlayRef = useRef<HTMLDivElement>(null);

  // esc → 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  function handleOutsideClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) router.back();
  }

  function handleNodeClick(node: TreeNode) {
    if (!node.itemId) return;
    router.push(`/home?view=tree-full&preset=${presetId}&item=${node.itemId}`);
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOutsideClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      {/* 우측 상단 컨트롤 */}
      <div style={{
        position: 'absolute',
        top: 68, right: 72,
        display: 'flex',
        gap: 8,
        zIndex: 51,
      }}>
        <button
          title="넓게 펼치기"
          onClick={() => router.push(`/home?view=tree-full&preset=${presetId}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.8)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Maximize2 size={13} strokeWidth={1.5} />
          {preset?.label ?? '넓게 펼치기'}
        </button>
      </div>

      {/* 트리 캔버스 — OrbRail 아이콘 위치에서 우측으로 펼침 */}
      <div style={{
        position: 'absolute',
        left: 68,
        top: 56,
        right: 68,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ width: '100%', height: '70%', pointerEvents: 'auto' }}>
          {loading && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: 24 }}>
              트리 로딩 중...
            </div>
          )}
          {!loading && treeData && (
            <OuFolderTree
              data={treeData}
              originPoint={{ x: ox, y: oy }}
              onNodeClick={handleNodeClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Minimize2, Network } from 'lucide-react';
import { OuFolderTree } from '@/components/ds';
import { DataCardPanel } from './DataCardPanel';
import { useTreeData } from '@/lib/data-finder/useTreeData';
import type { TreeNode } from '@/types';

export function TreeFullLayer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetId = searchParams.get('preset');
  const itemId = searchParams.get('item');

  const { treeData, preset, loading } = useTreeData();

  // esc → 작게 보기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (itemId) {
          router.back(); // 데이터 카드 닫기
        } else {
          router.push(`/home?view=tree-preview&preset=${presetId}`);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, presetId, itemId]);

  function handleNodeClick(node: TreeNode) {
    if (!node.itemId) return;
    router.push(`/home?view=tree-full&preset=${presetId}&item=${node.itemId}`);
  }

  return (
    <div style={{
      position: 'fixed',
      top: 56, left: 60, right: 60, bottom: 0,
      zIndex: 10,
    }}>
      {/* 우측 상단 컨트롤 */}
      <div style={{
        position: 'absolute',
        top: 12, right: 12,
        display: 'flex',
        gap: 8,
        zIndex: 11,
      }}>
        {/* 그래프 토글 */}
        <button
          title="그래프뷰로 전환"
          onClick={() => router.push(`/home?view=graph&preset=${presetId}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Network size={13} strokeWidth={1.5} />
          그래프
        </button>

        {/* 작게 보기 */}
        <button
          title="작게 보기"
          onClick={() => router.push(`/home?view=tree-preview&preset=${presetId}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Minimize2 size={13} strokeWidth={1.5} />
          작게 보기
        </button>
      </div>

      {/* 트리 캔버스 */}
      {loading ? (
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)', fontSize: 13,
        }}>
          트리 로딩 중...
        </div>
      ) : treeData ? (
        <OuFolderTree
          data={treeData}
          selectedId={itemId ? `item:${itemId}` : undefined}
          onNodeClick={handleNodeClick}
        />
      ) : (
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)', fontSize: 13,
        }}>
          데이터 없음
        </div>
      )}

      {/* 우측 데이터 카드 패널 */}
      {itemId && <DataCardPanel itemId={itemId} />}
    </div>
  );
}

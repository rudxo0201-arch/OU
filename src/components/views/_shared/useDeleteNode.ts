'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ds';

/**
 * 노드 archived 처리 (소프트 삭제).
 * confirm → DELETE /api/quick?nodeId → 성공 시 toast + ou-node-deleted 이벤트.
 */
export function useDeleteNode() {
  const { show } = useToast();

  return useCallback(async (nodeId: string, label: string): Promise<boolean> => {
    if (!confirm(`"${label}"을(를) 삭제할까요?`)) return false;

    try {
      const res = await fetch(`/api/quick?nodeId=${nodeId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      show('삭제됨', 'success');
      window.dispatchEvent(new CustomEvent('ou-node-deleted', { detail: { nodeId } }));
      return true;
    } catch {
      show('삭제 실패', 'error');
      return false;
    }
  }, [show]);
}

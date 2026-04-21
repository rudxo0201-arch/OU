'use client';

import { useEffect, useState } from 'react';
import { ViewRenderer } from '@/components/views/ViewRenderer';

interface OrbViewProps {
  domain?: string;
  viewType: string;
  orbSlug: string;
}

/**
 * 각 Orb의 메인 뷰.
 * /api/nodes에서 해당 도메인 데이터를 가져와 ViewRenderer로 렌더링.
 * note Orb는 viewType='note' → NoteView(Tiptap 에디터)를 사용.
 */
export function OrbView({ domain, viewType, orbSlug }: OrbViewProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 도메인 없는 Orb (time 등)는 데이터 불필요
    if (!domain) {
      setNodes(['__no_domain__'] as any); // ViewRenderer가 nodes 체크하므로 dummy
      setLoading(false);
      return;
    }
    fetch(`/api/nodes?domain=${domain}&limit=100`)
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((json) => {
        setNodes(json.data ?? json ?? []);
      })
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, [domain]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 52px)',
        color: 'var(--ou-text-muted)',
        fontSize: 'var(--ou-text-sm)',
      }}>
        <span className="ou-spinner" style={{ width: 20, height: 20 }} />
      </div>
    );
  }

  if (nodes.length === 0 && domain) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 52px)',
        gap: 12,
        color: 'var(--ou-text-muted)',
      }}>
        <span style={{ fontSize: 40, opacity: 0.3 }}>◎</span>
        <span style={{ fontSize: 'var(--ou-text-sm)' }}>아직 데이터가 없습니다</span>
        <span style={{ fontSize: 'var(--ou-text-xs)', color: 'var(--ou-text-disabled)' }}>
          홈 화면의 QS 입력바로 기록을 시작해보세요
        </span>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 52px)',
      overflow: 'auto',
    }}>
      <ViewRenderer viewType={viewType} nodes={nodes} />
    </div>
  );
}

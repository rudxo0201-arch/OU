'use client';

import { useState, useEffect } from 'react';
import { VIEW_REGISTRY, VIEW_LABELS } from '@/components/views/registry';

/**
 * 범용 뷰 위젯 — 아무 뷰든 위젯으로 /my 홈에 표시
 * widgetId에서 뷰 타입을 추출: "view-boncho" → boncho
 */
export function ViewWidget({ widgetId, widgetType }: { widgetId: string; widgetType?: string }) {
  const viewType = (widgetType ?? widgetId).replace('view-', '');
  const ViewComponent = VIEW_REGISTRY[viewType];
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 뷰 타입에 맞는 노드 로드
    const params = new URLSearchParams();
    if (viewType === 'boncho') {
      params.set('domain', 'knowledge');
      params.set('type', 'boncho');
    } else if (viewType === 'dictionary') {
      params.set('domain', 'knowledge');
      params.set('type', 'hanja');
    } else if (viewType === 'map') {
      params.set('domain', 'location');
      params.set('limit', '100');
    } else {
      params.set('limit', '100');
    }

    fetch(`/api/nodes?${params}`)
      .then(r => r.json())
      .then(data => { setNodes(data.nodes || data.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [viewType]);

  if (!ViewComponent) {
    return (
      <div style={{ padding: 16, color: 'var(--ou-text-dimmed)', fontSize: 12 }}>
        뷰를 찾을 수 없습니다: {viewType}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ou-text-dimmed)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <ViewComponent nodes={nodes} />
    </div>
  );
}

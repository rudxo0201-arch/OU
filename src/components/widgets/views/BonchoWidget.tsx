'use client';

import { useState, useEffect } from 'react';
import { BonchoView } from '@/components/views/BonchoView';

/**
 * 본초학 전용 위젯 — /api/boncho에서 herb + formula 노드 로드
 */
export function BonchoWidget() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/boncho')
      .then(r => r.json())
      .then(data => setNodes(data.nodes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ou-text-dimmed)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  return <BonchoView nodes={nodes} />;
}

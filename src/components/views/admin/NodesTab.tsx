'use client';

import { useState, useEffect, useCallback } from 'react';
import { OuButton, OuInput } from '@/components/ds';

const DOMAIN_OPTIONS = [
  '', 'schedule', 'task', 'finance', 'habit', 'idea', 'note',
  'knowledge', 'relation', 'media', 'location', 'health', 'emotion',
];

export function NodesTab() {
  const [nodes, setNodes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const fetchNodes = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (d) params.set('domain', d);
      const res = await fetch(`/api/nodes?${params}`);
      const data = await res.json();
      setNodes(data.nodes || []);
      setTotal(data.total || (data.nodes || []).length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNodes(domain); }, [domain, fetchNodes]);

  const filtered = search
    ? nodes.filter(n => {
        const raw = String(n.raw || '').toLowerCase();
        return raw.includes(search.toLowerCase());
      })
    : nodes;

  return (
    <div style={{ padding: 24 }}>
      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid var(--ou-glass-border)',
            background: 'var(--ou-glass)', fontFamily: 'inherit', fontSize: 12,
            color: 'var(--ou-text-body)',
          }}
        >
          <option value="">전체 도메인</option>
          {DOMAIN_OPTIONS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <OuInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="내용 검색..."
          containerStyle={{ flex: '1 1 200px' }}
          style={{ fontSize: 12 }}
        />

        <OuButton variant="accent" size="sm" onClick={() => fetchNodes(domain)}>
          새로고침
        </OuButton>
      </div>

      {/* 요약 */}
      <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 12 }}>
        {loading ? '로딩 중...' : `${filtered.length}개 표시 (전체 ${total}개)`}
      </div>

      {/* 노드 목록 */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((node, i) => (
            <div key={String(node.id) || i} style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid var(--ou-glass-border)',
              background: 'var(--ou-glass)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  background: 'var(--ou-space-subtle)',
                  color: 'var(--ou-text-secondary)', fontWeight: 600,
                }}>
                  {String(node.domain || 'unknown')}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)' }}>
                  {node.created_at ? new Date(String(node.created_at)).toLocaleDateString('ko-KR') : ''}
                </span>
              </div>
              <div style={{
                fontSize: 12, color: 'var(--ou-text-body)', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }}>
                {String(node.raw || '(내용 없음)')}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ou-text-muted)', fontSize: 13 }}>
              노드가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';

/**
 * 테이블 뷰
 * 참고: Notion 테이블, Airtable, Google Sheets
 * - 정렬 (클릭)
 * - 검색 + 도메인 필터
 * - 페이지네이션
 * - 도메인 한국어 라벨
 */

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정', finance: '지출', task: '할 일',
  emotion: '감정', idea: '아이디어', habit: '습관',
  knowledge: '지식', relation: '인물', media: '미디어',
  product: '제품', education: '교육', location: '장소',
};

type SortDir = 'asc' | 'desc';

export function TableView({ nodes }: ViewProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [domainFilter, setDomainFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    for (const n of nodes) if (n.domain) set.add(n.domain);
    return Array.from(set);
  }, [nodes]);

  const displayNodes = useMemo(() => {
    let filtered = nodes;
    if (domainFilter) filtered = filtered.filter(n => n.domain === domainFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(n =>
        n.raw?.toLowerCase().includes(q) ||
        n.domain_data?.title?.toLowerCase().includes(q) ||
        JSON.stringify(n.domain_data ?? {}).toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? a.domain_data?.[sortKey] ?? '';
      const bVal = b[sortKey] ?? b.domain_data?.[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [nodes, search, sortKey, sortDir, domainFilter]);

  const totalPages = Math.ceil(displayNodes.length / PAGE_SIZE);
  const pageNodes = displayNodes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (nodes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-dimmed)', fontSize: 13 }}>
        테이블에 표시할 데이터가 없습니다
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>🔍</span>
          <input
            placeholder="검색..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            style={{
              width: '100%', padding: '7px 10px 7px 30px',
              fontSize: 12, border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, background: 'rgba(255,255,255,0.03)',
              color: 'inherit', outline: 'none',
            }}
          />
        </div>
        {availableDomains.length > 1 && (
          <select
            value={domainFilter}
            onChange={e => { setDomainFilter(e.target.value); setPage(0); }}
            style={{
              padding: '7px 10px', fontSize: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, background: 'rgba(255,255,255,0.03)',
              color: 'inherit',
            }}
          >
            <option value="">전체 도메인</option>
            {availableDomains.map(d => (
              <option key={d} value={d}>{DOMAIN_LABELS[d] || d}</option>
            ))}
          </select>
        )}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{displayNodes.length}개</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {[
                { col: 'domain', label: '도메인', w: 80 },
                { col: 'raw', label: '내용', w: undefined },
                { col: 'confidence', label: '신뢰도', w: 70 },
                { col: 'created_at', label: '생성일', w: 90 },
              ].map(({ col, label, w }) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  style={{
                    padding: '10px 10px', textAlign: 'left', cursor: 'pointer',
                    whiteSpace: 'nowrap', fontWeight: 500, fontSize: 11,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: sortKey === col ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
                    width: w,
                  }}
                >
                  {label} {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageNodes.map(node => (
              <tr key={node.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 4,
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    color: 'var(--ou-text-dimmed)',
                  }}>
                    {DOMAIN_LABELS[node.domain] || node.domain || '-'}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ou-text-secondary)' }}>
                  {node.domain_data?.title || (node.raw ?? '').slice(0, 80) || '-'}
                </td>
                <td style={{ padding: '8px 10px', color: 'var(--ou-text-dimmed)' }}>{node.confidence ?? '-'}</td>
                <td style={{ padding: '8px 10px', color: 'var(--ou-text-dimmed)' }}>
                  {node.created_at ? new Date(node.created_at).toLocaleDateString('ko-KR') : '-'}
                </td>
              </tr>
            ))}
            {pageNodes.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ou-text-dimmed)' }}>검색 결과 없음</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding: '4px 12px', borderRadius: 999, border: '0.5px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'var(--ou-text-dimmed)', cursor: 'pointer', opacity: page === 0 ? 0.3 : 1 }}>이전</button>
          <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ padding: '4px 12px', borderRadius: 999, border: '0.5px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'var(--ou-text-dimmed)', cursor: 'pointer', opacity: page >= totalPages - 1 ? 0.3 : 1 }}>다음</button>
        </div>
      )}
    </div>
  );
}

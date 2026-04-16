'use client';

import { useState, useMemo } from 'react';
import { MagnifyingGlass, CaretUp, CaretDown } from '@phosphor-icons/react';

interface TableViewProps {
  nodes: any[];
  filters?: Record<string, any>;
}

type SortDir = 'asc' | 'desc';

export function TableView({ nodes }: TableViewProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [domainFilter, setDomainFilter] = useState<string>('');

  const availableDomains = useMemo(() => {
    const domains = new Set<string>();
    for (const n of nodes) {
      if (n.domain) domains.add(n.domain);
    }
    return Array.from(domains);
  }, [nodes]);

  const displayNodes = useMemo(() => {
    let filtered = nodes;

    if (domainFilter) {
      filtered = filtered.filter(n => n.domain === domainFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(n => {
        const rawMatch = n.raw?.toLowerCase().includes(q);
        const domainDataMatch = n.domain_data
          ? JSON.stringify(n.domain_data).toLowerCase().includes(q)
          : false;
        return rawMatch || domainDataMatch;
      });
    }

    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? a.domain_data?.[sortKey] ?? '';
      const bVal = b[sortKey] ?? b.domain_data?.[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [nodes, search, sortKey, sortDir, domainFilter]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? <CaretUp size={12} /> : <CaretDown size={12} />;
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, maxWidth: 300, position: 'relative' }}>
          <MagnifyingGlass size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ou-text-dimmed, #888)' }} />
          <input
            placeholder="검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 28px',
              fontSize: 12,
              border: '0.5px solid var(--ou-border, #333)',
              borderRadius: 6,
              background: 'transparent',
              color: 'inherit',
              outline: 'none',
            }}
          />
        </div>
        {availableDomains.length > 1 && (
          <select
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            style={{
              padding: '6px 8px',
              fontSize: 12,
              border: '0.5px solid var(--ou-border, #333)',
              borderRadius: 6,
              background: 'transparent',
              color: 'inherit',
              width: 140,
            }}
          >
            <option value="">전체 도메인</option>
            {availableDomains.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{displayNodes.length}개</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--ou-border, #333)' }} onClick={() => handleSort('domain')}>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>도메인 <SortIcon col="domain" /></span>
              </th>
              <th style={{ cursor: 'pointer', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--ou-border, #333)' }} onClick={() => handleSort('raw')}>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>내용 <SortIcon col="raw" /></span>
              </th>
              <th style={{ cursor: 'pointer', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--ou-border, #333)' }} onClick={() => handleSort('confidence')}>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>신뢰도 <SortIcon col="confidence" /></span>
              </th>
              <th style={{ cursor: 'pointer', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--ou-border, #333)' }} onClick={() => handleSort('created_at')}>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>생성일 <SortIcon col="created_at" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayNodes.map(node => (
              <tr key={node.id} style={{ borderBottom: '0.5px solid var(--ou-border, #333)' }}>
                <td style={{ padding: '6px 12px' }}>
                  <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>{node.domain ?? '-'}</span>
                </td>
                <td style={{ padding: '6px 12px', maxWidth: 400 }}>
                  <span style={{ fontSize: 11, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{node.raw ?? JSON.stringify(node.domain_data ?? {}).slice(0, 80)}</span>
                </td>
                <td style={{ padding: '6px 12px' }}>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{node.confidence ?? '-'}</span>
                </td>
                <td style={{ padding: '6px 12px' }}>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>
                    {node.created_at ? new Date(node.created_at).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </td>
              </tr>
            ))}
            {displayNodes.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '32px 12px', textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>데이터가 없습니다</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

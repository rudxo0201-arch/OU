'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassButton, GlassInput } from '@/components/ds';
import { Section } from './_shared';

export function AdminTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <DbViewer />
      <Section title="데이터 시딩">
        <SeedButton type="boncho" label="본초 시딩 (91종)" />
        <SeedButton type="boncho-all" label="본초 전체 (504종)" />
        <SeedButton type="bangje" label="방제 시딩" />
        <SeedButton type="hanja-radicals" label="한자 부수 (214자)" />
        <SeedButton type="hanja" label="한자 급수 (~1,400자)" />
        <SeedButton type="hanja-all" label="한자 전체 (~98,000자)" />
        <SeedButton type="shanghanlun" label="상한론 (60조문)" />
      </Section>
    </div>
  );
}

function DbViewer() {
  const tables = [
    'profiles', 'data_nodes', 'messages', 'sections', 'sentences', 'triples',
    'node_relations', 'groups', 'group_members', 'saved_views', 'subscriptions',
    'token_usage', 'api_cost_log', 'chat_rooms', 'chat_messages',
    'market_items', 'market_purchases', 'unresolved_entities',
    'verification_requests', 'personas',
  ];
  const [selectedTable, setSelectedTable] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (tbl: string, pg: number, q: string) => {
    if (!tbl) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), pageSize: '20', search: q });
    const res = await fetch(`/api/admin/tables/${tbl}?${params}`);
    const data = await res.json();
    setRows(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => { if (selectedTable) fetchData(selectedTable, page, search); }, [selectedTable, page, fetchData]);

  const doSearch = () => { setPage(1); fetchData(selectedTable, 1, search); };
  const totalPages = Math.ceil(total / 20);
  const columnKeys = rows.length > 0
    ? Object.keys(rows[0]).filter(k => k !== 'domain_data')
    : [];

  return (
    <Section title="DB 뷰어">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select
          value={selectedTable}
          onChange={e => { setSelectedTable(e.target.value); setPage(1); setSearch(''); }}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 'var(--ou-radius-md)',
            border: '1px solid var(--ou-glass-border)', background: 'var(--ou-glass)',
            fontFamily: 'inherit', fontSize: 13, color: 'var(--ou-text-body)',
          }}
        >
          <option value="">테이블 선택...</option>
          {tables.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {selectedTable && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <GlassInput value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="검색..." containerStyle={{ flex: 1 }} style={{ fontSize: 12 }} />
            <GlassButton variant="accent" size="sm" onClick={doSearch}>검색</GlassButton>
          </div>
          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>로딩 중...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {columnKeys.map(k => (
                      <th key={k} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--ou-glass-border)', color: 'var(--ou-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--ou-glass-border)' }}>
                      {columnKeys.map(k => (
                        <td key={k} style={{ padding: '6px 10px', color: 'var(--ou-text-body)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {typeof row[k] === 'object' ? JSON.stringify(row[k])?.slice(0, 50) : String(row[k] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <GlassButton variant="accent" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}>이전</GlassButton>
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{page} / {totalPages} ({total}건)</span>
              <GlassButton variant="accent" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>다음</GlassButton>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function SeedButton({ type, label }: { type: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState('');

  const run = async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/admin/seed?type=${type}`, { method: 'POST' });
      const data = await res.json();
      setStatus(data.success ? 'done' : 'error');
      setResult(data.message || data.error || '');
    } catch { setStatus('error'); setResult('네트워크 오류'); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--ou-border-subtle)' }}>
      <span style={{ fontSize: 14, color: 'var(--ou-text-body)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {result && <span style={{ fontSize: 11, color: status === 'error' ? 'var(--ou-accent)' : 'var(--ou-text-muted)' }}>{result}</span>}
        <GlassButton variant="accent" size="sm" onClick={run}>{status === 'loading' ? '...' : '실행'}</GlassButton>
      </div>
    </div>
  );
}

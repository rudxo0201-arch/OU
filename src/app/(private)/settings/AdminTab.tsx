'use client';

import { useState, useEffect, useCallback } from 'react';
import { NeuButton, NeuInput, NeuSelect, NeuTable, type NeuTableColumn } from '@/components/ds';
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
  const columns: NeuTableColumn[] = rows.length > 0
    ? Object.keys(rows[0]).filter(k => k !== 'domain_data').map(k => ({
        key: k,
        label: k,
        render: (value: unknown) => {
          const str = typeof value === 'object' ? JSON.stringify(value)?.slice(0, 50) : String(value ?? '');
          return <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{str}</span>;
        },
      }))
    : [];

  return (
    <Section title="DB 뷰어">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <NeuSelect
          value={selectedTable}
          onChange={v => { setSelectedTable(v); setPage(1); setSearch(''); }}
          options={[{ value: '', label: '테이블 선택...' }, ...tables.map(t => ({ value: t, label: t }))]}
          style={{ flex: 1 }}
        />
      </div>
      {selectedTable && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <NeuInput value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="검색..." style={{ flex: 1 }} />
            <NeuButton variant="default" size="sm" onClick={doSearch}>검색</NeuButton>
          </div>
          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>로딩 중...</p>
          ) : (
            <NeuTable columns={columns} rows={rows} />
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <NeuButton variant="default" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}>이전</NeuButton>
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{page} / {totalPages} ({total}건)</span>
              <NeuButton variant="default" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>다음</NeuButton>
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
        <NeuButton variant="default" size="sm" onClick={run}>{status === 'loading' ? '...' : '실행'}</NeuButton>
      </div>
    </div>
  );
}

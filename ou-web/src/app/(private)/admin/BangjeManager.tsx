'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flask, MagnifyingGlass, ArrowClockwise, Graph } from '@phosphor-icons/react';

interface BangjeStats {
  total: number;
  starred: number;
  enriched: number;
  pending: number;
  partial: number;
}

interface BangjeNode {
  id: string;
  title: string;
  domain_data: {
    formula_id: string;
    name_korean: string;
    name_hanja: string | null;
    category_minor: string | null;
    starred: boolean;
    enrichment_status: string;
    composition?: { herb_name: string; role: string | null }[];
    efficacy?: string[] | null;
    indications?: string[] | null;
    source?: string | null;
  };
}

export function BangjeManager() {
  const [stats, setStats] = useState<BangjeStats | null>(null);
  const [formulas, setFormulas] = useState<BangjeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bangje/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setFormulas(data.formulas ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch bangje data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (action: string, params?: Record<string, string>) => {
    setActionLoading(action);
    setMessage(null);
    try {
      let url: string;
      if (action === 'seed' || action === 'seed-all') {
        url = `/api/admin/seed?type=${action === 'seed-all' ? 'bangje-all' : 'bangje'}`;
      } else if (action === 'triples') {
        url = '/api/admin/bangje/triples';
      } else {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        url = `/api/admin/bangje/enrich${query}`;
      }

      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      setMessage(data.message ?? (data.error ? `오류: ${data.error}` : '완료'));
      fetchData();
    } catch (e: any) {
      setMessage(`오류: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredFormulas = formulas.filter(f => {
    const matchSearch = !search ||
      f.domain_data.name_korean?.includes(search) ||
      f.domain_data.name_hanja?.includes(search) ||
      f.domain_data.formula_id?.includes(search);
    const matchStatus = !statusFilter || f.domain_data.enrichment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const enrichedPercent = stats ? Math.round((stats.enriched / Math.max(stats.total, 1)) * 100) : 0;

  const statusColor = (s: string) => s === 'enriched' ? '#40c057' : s === 'partial' ? '#fab005' : '#868e96';
  const statusLabel = (s: string) => s === 'enriched' ? '완료' : s === 'partial' ? '부분' : '대기';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {[
            { label: '전체', value: stats.total, color: undefined },
            { label: '주요(★)', value: stats.starred, color: undefined },
            { label: '보강 완료', value: stats.enriched, color: '#40c057' },
            { label: '대기', value: stats.pending, color: '#fab005' },
            { label: '부분', value: stats.partial, color: '#868e96' },
          ].map(s => (
            <div key={s.label} style={{ padding: 8, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <span style={{ fontSize: 12, color: '#868e96', display: 'block' }}>{s.label}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      {stats && stats.total > 0 && (
        <div style={{ padding: 8, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>보강 진행률</span>
            <span style={{ fontSize: 13, color: '#868e96' }}>{enrichedPercent}%</span>
          </div>
          <div style={{ width: '100%', height: 12, background: '#e9ecef', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${enrichedPercent}%`, height: '100%', background: '#228be6', borderRadius: 6, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 16px 0' }}>작업</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'seed', label: '★ Seed', icon: <Flask size={14} /> },
            { key: 'seed-all', label: '전체 Seed', icon: <Flask size={14} /> },
            { key: 'enrich-starred', label: '★ 보강', icon: <ArrowClockwise size={14} />, params: { scope: 'starred' } },
            { key: 'enrich-all', label: '전체 보강', icon: <ArrowClockwise size={14} />, params: { scope: 'all' } },
            { key: 'triples', label: '트리플 생성', icon: <Graph size={14} /> },
          ].map(btn => (
            <button
              key={btn.key}
              disabled={actionLoading === btn.key}
              onClick={() => handleAction(btn.key, (btn as any).params)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
            >
              {actionLoading === btn.key ? '...' : btn.icon} {btn.label}
            </button>
          ))}
        </div>
        {message && (
          <p style={{ fontSize: 13, marginTop: 8, marginBottom: 0, color: message.startsWith('오류') ? 'red' : '#40c057' }}>
            {message}
          </p>
        )}
      </div>

      {/* Formula List */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>방제 목록 ({filteredFormulas.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlass size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#868e96' }} />
              <input
                placeholder="검색..."
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ width: 160, padding: '4px 8px 4px 26px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 100, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
            >
              <option value="">상태</option>
              <option value="pending">대기</option>
              <option value="partial">부분</option>
              <option value="enriched">완료</option>
            </select>
          </div>
        </div>

        {formulas.length === 0 ? (
          <p style={{ fontSize: 13, color: '#868e96', textAlign: 'center', padding: '24px 0' }}>
            {loading ? '불러오는 중...' : '아직 방제 데이터가 없습니다. Seed를 먼저 실행하세요.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['번호', '처방명', '한자', '분류', '구성약물', '효능', '출전', '상태'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFormulas.slice(0, 100).map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <td style={{ padding: '6px 8px' }}>{f.domain_data.formula_id}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {f.domain_data.starred && <span style={{ color: 'var(--mantine-color-yellow-5, #fab005)' }}>★</span>}
                        <span style={{ fontWeight: 500 }}>{f.domain_data.name_korean}</span>
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', color: '#868e96' }}>{f.domain_data.name_hanja ?? '-'}</td>
                    <td style={{ padding: '6px 8px', color: '#868e96' }}>{f.domain_data.category_minor ?? '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{f.domain_data.composition?.length ?? 0}종</td>
                    <td style={{ padding: '6px 8px' }}>{f.domain_data.efficacy?.join(', ') ?? '-'}</td>
                    <td style={{ padding: '6px 8px', color: '#868e96' }}>{f.domain_data.source ?? '-'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ background: `${statusColor(f.domain_data.enrichment_status)}20`, color: statusColor(f.domain_data.enrichment_status), padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>
                        {statusLabel(f.domain_data.enrichment_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredFormulas.length > 100 && (
              <p style={{ fontSize: 12, color: '#868e96', textAlign: 'center', marginTop: 8 }}>
                {filteredFormulas.length - 100}개 더 있음
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

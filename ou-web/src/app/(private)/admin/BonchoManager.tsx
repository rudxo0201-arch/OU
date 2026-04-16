'use client';

import { useState, useEffect, useCallback } from 'react';
import { Leaf, MagnifyingGlass, ArrowClockwise } from '@phosphor-icons/react';

interface BonchoStats {
  total: number;
  starred: number;
  enriched: number;
  pending: number;
  partial: number;
}

interface BonchoNode {
  id: string;
  title: string;
  domain_data: {
    herb_id: string;
    name_korean: string;
    name_hanja: string | null;
    category_minor: string | null;
    starred: boolean;
    enrichment_status: string;
    nature?: string[] | null;
    flavor?: string[] | null;
    channel_tropism?: string[] | null;
    efficacy?: string[] | null;
    indications?: string[] | null;
  };
}

export function BonchoManager() {
  const [stats, setStats] = useState<BonchoStats | null>(null);
  const [herbs, setHerbs] = useState<BonchoNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/boncho/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setHerbs(data.herbs ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch boncho data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (action: string, params?: Record<string, string>) => {
    setActionLoading(action);
    setMessage(null);
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      const url = action === 'seed' || action === 'seed-all'
        ? `/api/admin/seed?type=${action === 'seed-all' ? 'boncho-all' : 'boncho'}`
        : `/api/admin/boncho/enrich${query}`;

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

  const filteredHerbs = herbs.filter(h => {
    const matchSearch = !search ||
      h.domain_data.name_korean?.includes(search) ||
      h.domain_data.name_hanja?.includes(search) ||
      h.domain_data.herb_id?.includes(search);
    const matchStatus = !statusFilter || h.domain_data.enrichment_status === statusFilter;
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
            { key: 'seed', label: '★ Seed (91개)', icon: <Leaf size={14} /> },
            { key: 'seed-all', label: '전체 Seed (504개)', icon: <Leaf size={14} /> },
            { key: 'enrich-starred', label: '★ 보강', icon: <ArrowClockwise size={14} />, params: { scope: 'starred' } },
            { key: 'enrich-all', label: '전체 보강', icon: <ArrowClockwise size={14} />, params: { scope: 'all' } },
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

      {/* Herb List */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>본초 목록 ({filteredHerbs.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlass size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#868e96' }} />
              <input
                placeholder="검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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

        {herbs.length === 0 ? (
          <p style={{ fontSize: 13, color: '#868e96', textAlign: 'center', padding: '24px 0' }}>
            {loading ? '불러오는 중...' : '아직 본초 데이터가 없습니다. Seed를 먼저 실행하세요.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['번호', '본초명', '한자', '분류', '성', '미', '귀경', '상태'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHerbs.slice(0, 100).map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <td style={{ padding: '6px 8px' }}>{h.domain_data.herb_id}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {h.domain_data.starred && <span style={{ color: 'var(--mantine-color-yellow-5, #fab005)' }}>★</span>}
                        <span style={{ fontWeight: 500 }}>{h.domain_data.name_korean}</span>
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', color: '#868e96' }}>{h.domain_data.name_hanja ?? '-'}</td>
                    <td style={{ padding: '6px 8px', color: '#868e96' }}>{h.domain_data.category_minor ?? '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{h.domain_data.nature?.join(', ') ?? '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{h.domain_data.flavor?.join(', ') ?? '-'}</td>
                    <td style={{ padding: '6px 8px' }}>{h.domain_data.channel_tropism?.join(', ') ?? '-'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ background: `${statusColor(h.domain_data.enrichment_status)}20`, color: statusColor(h.domain_data.enrichment_status), padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>
                        {statusLabel(h.domain_data.enrichment_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredHerbs.length > 100 && (
              <p style={{ fontSize: 12, color: '#868e96', textAlign: 'center', marginTop: 8 }}>
                {filteredHerbs.length - 100}개 더 있음
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { useSelection } from '@/hooks/useSelection';

interface VerifyRequest {
  id: string;
  reason: string;
  suggested_correction: string | null;
  vote_approve: number;
  vote_reject: number;
  created_at: string;
  data_nodes: {
    raw: string | null;
    domain: string;
  } | null;
}

export function VerifyQueue() {
  const supabase = createClient();
  const [requests, setRequests] = useState<VerifyRequest[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 20;

  const pageIds = useMemo(() => requests.map(r => r.id), [requests]);
  const selection = useSelection<string>(pageIds);

  const fetchRequests = useCallback(async () => {
    const { data, count } = await supabase
      .from('verification_requests')
      .select('id, reason, suggested_correction, vote_approve, vote_reject, created_at, data_nodes(raw, domain)', { count: 'exact' })
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    setRequests((data as VerifyRequest[] | null) ?? []);
    setTotal(count ?? 0);
    selection.clearAll();
  }, [page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    await supabase
      .from('verification_requests')
      .update({
        status: action === 'approve' ? 'resolved' : 'escalated',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);
    fetchRequests();
  };

  const handleBatch = async (action: 'approve' | 'reject') => {
    if (selection.count === 0) return;
    setLoading(true);
    const ids = Array.from(selection.selected);
    await supabase
      .from('verification_requests')
      .update({
        status: action === 'approve' ? 'resolved' : 'escalated',
        resolved_at: new Date().toISOString(),
      })
      .in('id', ids);
    setLoading(false);
    fetchRequests();
  };

  const handleHeaderCheckbox = () => {
    if (selection.headerCheckbox.checked) {
      selection.deselectPage(pageIds);
    } else {
      selection.selectPage(pageIds);
    }
  };

  if (total === 0 && requests.length === 0) {
    return <p style={{ color: '#868e96', textAlign: 'center', padding: '24px 0' }}>검토 대기 항목이 없어요.</p>;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Batch actions */}
      <div style={{ padding: 8, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#868e96', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selection.headerCheckbox.checked}
                ref={el => { if (el) el.indeterminate = selection.headerCheckbox.indeterminate; }}
                onChange={handleHeaderCheckbox}
              />
              전체 선택 ({selection.selected.size}/{requests.length})
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={selection.count === 0 || loading}
              onClick={() => handleBatch('approve')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: selection.count === 0 ? 'default' : 'pointer', fontSize: 12, opacity: selection.count === 0 ? 0.5 : 1 }}
            >
              <CheckCircle size={14} /> 일괄 승인
            </button>
            <button
              disabled={selection.count === 0 || loading}
              onClick={() => handleBatch('reject')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: selection.count === 0 ? 'default' : 'pointer', fontSize: 12, opacity: selection.count === 0 ? 0.5 : 1 }}
            >
              <XCircle size={14} /> 일괄 거부
            </button>
          </div>
        </div>
      </div>

      <span style={{ fontSize: 12, color: '#868e96' }}>총 {total}건 대기 중</span>

      {requests.map(req => (
        <div key={req.id} style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={selection.isSelected(req.id)}
                onChange={() => selection.toggle(req.id)}
                style={{ marginTop: 4 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{req.data_nodes?.domain ?? '-'}</span>
                  <span style={{ border: '1px solid #dee2e6', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>{req.reason}</span>
                </div>
                <span style={{ fontSize: 12, color: '#868e96' }}>
                  {new Date(req.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
            <span style={{ fontSize: 12, color: '#868e96' }}>
              승인 {req.vote_approve} / 거부 {req.vote_reject}
            </span>
          </div>

          <p style={{ fontSize: 13, marginBottom: 8, whiteSpace: 'pre-wrap', marginTop: 0 }}>
            {req.data_nodes?.raw ?? '-'}
          </p>

          {req.suggested_correction && (
            <div style={{ padding: 8, background: '#f8f9fa', borderRadius: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#868e96', fontWeight: 600, display: 'block', marginBottom: 2 }}>수정 제안:</span>
              <span style={{ fontSize: 13 }}>{req.suggested_correction}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleResolve(req.id, 'approve')}
              style={{ padding: '4px 12px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
            >
              승인
            </button>
            <button
              onClick={() => handleResolve(req.id, 'reject')}
              style={{ padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
            >
              거부
            </button>
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: '4px 10px', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                background: p === page ? '#333' : '#fff',
                color: p === page ? '#fff' : '#333',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

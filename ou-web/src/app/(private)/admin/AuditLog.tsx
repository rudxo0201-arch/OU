'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  profiles?: {
    email: string | null;
    display_name: string | null;
  } | null;
}

export function AuditLog() {
  const supabase = createClient();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [actions, setActions] = useState<string[]>([]);
  const PAGE_SIZE = 20;

  // Fetch unique action types
  useEffect(() => {
    supabase
      .from('api_audit_log')
      .select('action')
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map(d => d.action).filter(Boolean)));
          setActions(unique);
        }
      });
  }, []);

  const fetchEntries = useCallback(async () => {
    let query = supabase
      .from('api_audit_log')
      .select('id, admin_id, action, target_type, target_id, metadata, ip_address, created_at, profiles(email, display_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (actionFilter) query = query.eq('action', actionFilter);

    const { data, count } = await query;
    setEntries((data as AuditEntry[] | null) ?? []);
    setTotal(count ?? 0);
  }, [page, actionFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => { setPage(1); }, [actionFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 12, color: '#868e96' }}>총 {total.toLocaleString()}건</span>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{ width: 200, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
        >
          <option value="">작업 유형 필터</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>시각</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>관리자</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>작업</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>대상</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>IP</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
              <td style={{ padding: '8px' }}>
                <span style={{ fontSize: 12, color: '#868e96', whiteSpace: 'nowrap' }}>
                  {new Date(entry.created_at).toLocaleString('ko-KR')}
                </span>
              </td>
              <td style={{ padding: '8px' }}>
                <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.profiles?.display_name ?? entry.profiles?.email ?? entry.admin_id?.slice(0, 8)}
                </span>
              </td>
              <td style={{ padding: '8px' }}>
                <span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{entry.action}</span>
              </td>
              <td style={{ padding: '8px' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {entry.target_type && (
                    <span style={{ border: '1px solid #dee2e6', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>{entry.target_type}</span>
                  )}
                  {entry.target_id && (
                    <span style={{ fontSize: 12, color: '#868e96', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.target_id.slice(0, 12)}...
                    </span>
                  )}
                  {!entry.target_type && !entry.target_id && (
                    <span style={{ fontSize: 12, color: '#868e96' }}>-</span>
                  )}
                </div>
              </td>
              <td style={{ padding: '8px' }}>
                <span style={{ fontSize: 12, color: '#868e96', fontFamily: 'monospace' }}>{entry.ip_address ?? '-'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {entries.length === 0 && (
        <p style={{ color: '#868e96', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>감사 로그가 없어요.</p>
      )}

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

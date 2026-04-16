'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlass, PencilSimple, Archive, CaretDown, CaretUp } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

interface DataNode {
  id: string;
  domain: string;
  confidence: string;
  resolution: string | null;
  raw: string | null;
  created_at: string;
  user_id: string | null;
  is_archived?: boolean;
}

export function DataNodeManager() {
  const supabase = createClient();
  const [nodes, setNodes] = useState<DataNode[]>([]);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState<string>('');
  const [confidence, setConfidence] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNode, setEditNode] = useState<DataNode | null>(null);
  const [editRaw, setEditRaw] = useState('');
  const [editDomain, setEditDomain] = useState<string>('');
  const [editConfidence, setEditConfidence] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const PAGE_SIZE = 20;

  useEffect(() => {
    supabase
      .from('data_nodes')
      .select('domain')
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map(d => d.domain).filter(Boolean)));
          setDomains(unique as string[]);
        }
      });
  }, []);

  const fetchNodes = useCallback(async () => {
    let query = supabase
      .from('data_nodes')
      .select('id, domain, confidence, resolution, raw, created_at, user_id, is_archived', { count: 'exact' })
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (search) query = query.ilike('raw', `%${search}%`);
    if (domain) query = query.eq('domain', domain);
    if (confidence) query = query.eq('confidence', confidence);

    const { data, count } = await query;
    setNodes(data ?? []);
    setTotal(count ?? 0);
  }, [search, domain, confidence, page]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);
  useEffect(() => { setPage(1); }, [search, domain, confidence]);

  const handleEdit = (node: DataNode) => {
    setEditNode(node);
    setEditRaw(node.raw ?? '');
    setEditDomain(node.domain);
    setEditConfidence(node.confidence);
    setEditOpened(true);
  };

  const handleSave = async () => {
    if (!editNode) return;
    setSaving(true);
    await supabase
      .from('data_nodes')
      .update({
        raw: editRaw,
        domain: editDomain || null,
        confidence: editConfidence || null,
      })
      .eq('id', editNode.id);
    setSaving(false);
    setEditOpened(false);
    fetchNodes();
  };

  const handleArchive = async (id: string) => {
    await supabase
      .from('data_nodes')
      .update({ is_archived: true })
      .eq('id', id);
    fetchNodes();
  };

  const confidenceColor: Record<string, string> = { high: '#40c057', medium: '#fab005', low: '#fa5252' };
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <MagnifyingGlass size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#868e96' }} />
          <input
            placeholder="내용 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '6px 10px 6px 28px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
          />
        </div>
        <select
          value={domain}
          onChange={e => setDomain(e.target.value)}
          style={{ width: 160, padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
        >
          <option value="">분류</option>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={confidence}
          onChange={e => setConfidence(e.target.value)}
          style={{ width: 120, padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
        >
          <option value="">신뢰도</option>
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </select>
      </div>

      <span style={{ fontSize: 12, color: '#868e96' }}>총 {total.toLocaleString()}건</span>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ width: 30, padding: '8px', borderBottom: '2px solid #e0e0e0' }} />
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12 }}>내용</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12, width: 100 }}>분류</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12, width: 80 }}>신뢰도</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #e0e0e0', fontSize: 12, width: 100 }}>생성일</th>
            <th style={{ width: 80, padding: '8px', borderBottom: '2px solid #e0e0e0' }} />
          </tr>
        </thead>
        <tbody>
          {nodes.map(node => (
            <React.Fragment key={node.id}>
              <tr
                style={{ cursor: 'pointer', borderBottom: '1px solid #f1f3f5' }}
                onClick={() => setExpandedId(expandedId === node.id ? null : node.id)}
              >
                <td style={{ padding: '8px' }}>
                  {expandedId === node.id
                    ? <CaretUp size={14} weight="bold" />
                    : <CaretDown size={14} weight="bold" />
                  }
                </td>
                <td style={{ padding: '8px' }}>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 400 }}>{node.raw ?? '-'}</span>
                </td>
                <td style={{ padding: '8px' }}>
                  <span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{node.domain}</span>
                </td>
                <td style={{ padding: '8px' }}>
                  <span style={{ background: `${confidenceColor[node.confidence] ?? '#868e96'}20`, color: confidenceColor[node.confidence] ?? '#868e96', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                    {node.confidence}
                  </span>
                </td>
                <td style={{ padding: '8px', fontSize: 12, color: '#868e96' }}>
                  {new Date(node.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEdit(node)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => handleArchive(node.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#fa5252' }}>
                      <Archive size={14} />
                    </button>
                  </div>
                </td>
              </tr>
              {expandedId === node.id && (
                <tr key={`${node.id}-detail`}>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <div style={{ padding: 12, background: '#f8f9fa', margin: '0 8px 8px 8px', borderRadius: 4 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#868e96', fontWeight: 600 }}>ID:</span>
                          <span style={{ fontSize: 12, color: '#868e96', fontFamily: 'monospace' }}>{node.id}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#868e96', fontWeight: 600 }}>사용자:</span>
                          <span style={{ fontSize: 12, color: '#868e96', fontFamily: 'monospace' }}>{node.user_id ?? '관리자'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#868e96', fontWeight: 600 }}>해결:</span>
                          <span style={{ fontSize: 12 }}>{node.resolution ?? '없음'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 12, color: '#868e96', fontWeight: 600, display: 'block', marginBottom: 4 }}>전체 내용:</span>
                          <span style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{node.raw ?? '-'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {nodes.length === 0 && (
        <p style={{ color: '#868e96', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>검색 결과가 없어요.</p>
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

      {/* Edit Modal */}
      {editOpened && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditOpened(false)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '90%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>데이터 수정</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>내용</label>
                <textarea
                  value={editRaw}
                  onChange={e => setEditRaw(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13, resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>분류</label>
                <select value={editDomain} onChange={e => setEditDomain(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}>
                  <option value="">선택</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>신뢰도</label>
                <select value={editConfidence} onChange={e => setEditConfidence(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}>
                  <option value="">선택</option>
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setEditOpened(false)} style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>취소</button>
                <button disabled={saving} onClick={handleSave} style={{ padding: '6px 14px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                  {saving ? '...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

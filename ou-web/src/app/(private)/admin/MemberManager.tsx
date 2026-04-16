'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MagnifyingGlass, DotsThree, UserMinus, Prohibit, UserPlus, Shield } from '@phosphor-icons/react';
import { useSelection } from '@/hooks/useSelection';

interface Member {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  node_count: number;
  verified: boolean;
}

export function MemberManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [actionModal, setActionModal] = useState<{ member: Member; action: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const pageIds = useMemo(() => members.map(m => m.id), [members]);
  const selection = useSelection<string>(pageIds);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search,
        ...(roleFilter ? { role: roleFilter } : {}),
      });
      const res = await fetch(`/api/admin/members?${params}`);
      const json = await res.json();
      setMembers(json.data ?? []);
      setTotal(json.total ?? 0);
      selection.clearAll();
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const handleAction = async (userId: string, action: string, role?: string) => {
    setProcessing(true);
    try {
      await fetch(`/api/admin/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, role }),
      });
      setActionModal(null);
      setMenuOpen(null);
      fetchMembers();
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchAction = async (action: string) => {
    setProcessing(true);
    try {
      const ids = Array.from(selection.selected);
      await Promise.all(ids.map(id =>
        fetch(`/api/admin/members/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
      ));
      fetchMembers();
    } finally {
      setProcessing(false);
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#343a40';
      case 'banned': return '#fa5252';
      case 'deactivated': return '#868e96';
      default: return '#868e96';
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <MagnifyingGlass size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#868e96' }} />
          <input
            placeholder="이름, 이메일 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240, padding: '4px 8px 4px 28px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ width: 140, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
        >
          <option value="">역할</option>
          {['admin', 'member', 'banned', 'deactivated'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#868e96' }}>총 {total.toLocaleString()}명</span>
      </div>

      {/* Batch actions */}
      {selection.selected.size > 0 && (
        <div style={{ padding: 8, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#868e96' }}>{selection.selected.size}명 선택</span>
            <button disabled={processing} onClick={() => handleBatchAction('deactivate')} style={{ padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              {processing ? '...' : '일괄 비활성화'}
            </button>
            <button disabled={processing} onClick={() => handleBatchAction('ban')} style={{ padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              {processing ? '...' : '일괄 차단'}
            </button>
            <button onClick={() => selection.clearAll()} style={{ padding: '4px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ width: 36, padding: '6px 8px', borderBottom: '2px solid #e0e0e0' }}>
              <input
                type="checkbox"
                checked={selection.headerCheckbox.checked}
                ref={el => { if (el) el.indeterminate = selection.headerCheckbox.indeterminate; }}
                onChange={() => {
                  if (selection.headerCheckbox.checked) selection.deselectPage(pageIds);
                  else selection.selectPage(pageIds);
                }}
              />
            </th>
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0' }}>회원</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0', width: 100 }}>역할</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0', width: 80 }}>데이터</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0', width: 110 }}>가입일</th>
            <th style={{ width: 50, padding: '6px 8px', borderBottom: '2px solid #e0e0e0' }} />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>...</td></tr>
          ) : members.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#868e96' }}>회원이 없어요.</td></tr>
          ) : members.map(m => (
            <tr key={m.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
              <td style={{ padding: '6px 8px' }}>
                <input type="checkbox" checked={selection.isSelected(m.id)} onChange={() => selection.toggle(m.id)} />
              </td>
              <td style={{ padding: '6px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, overflow: 'hidden' }}>
                    {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.display_name ?? '?')[0]}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.display_name ?? '이름 없음'}</span>
                    <span style={{ fontSize: 12, color: '#868e96', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>
                  </div>
                </div>
              </td>
              <td style={{ padding: '6px 8px' }}>
                <span style={{ background: `${roleColor(m.role)}20`, color: roleColor(m.role), padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>{m.role ?? 'member'}</span>
              </td>
              <td style={{ padding: '6px 8px', fontSize: 12, color: '#868e96' }}>{m.node_count.toLocaleString()}</td>
              <td style={{ padding: '6px 8px', fontSize: 12, color: '#868e96' }}>{new Date(m.created_at).toLocaleDateString('ko-KR')}</td>
              <td style={{ padding: '6px 8px', position: 'relative' }}>
                <button onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <DotsThree size={16} weight="bold" />
                </button>
                {menuOpen === m.id && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 140 }}>
                    <button onClick={() => { setActionModal({ member: m, action: 'change_role' }); setSelectedRole(m.role); setMenuOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }}>
                      <Shield size={14} /> 역할 변경
                    </button>
                    {m.role !== 'deactivated' && (
                      <button onClick={() => { setActionModal({ member: m, action: 'deactivate' }); setMenuOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }}>
                        <UserMinus size={14} /> 비활성화
                      </button>
                    )}
                    {m.role === 'deactivated' && (
                      <button onClick={() => { handleAction(m.id, 'activate'); setMenuOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }}>
                        <UserPlus size={14} /> 활성화
                      </button>
                    )}
                    {m.role !== 'banned' ? (
                      <button onClick={() => { setActionModal({ member: m, action: 'ban' }); setMenuOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#fa5252' }}>
                        <Prohibit size={14} /> 차단
                      </button>
                    ) : (
                      <button onClick={() => { handleAction(m.id, 'unban'); setMenuOpen(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12 }}>
                        <UserPlus size={14} /> 차단 해제
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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

      {/* Action Confirm Modal */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setActionModal(null)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>{getActionTitle(actionModal.action)}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                  {(actionModal.member.display_name ?? '?')[0]}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{actionModal.member.display_name ?? actionModal.member.email}</span>
              </div>

              {actionModal.action === 'change_role' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>변경할 역할</label>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}>
                    {['admin', 'member', 'moderator', 'banned', 'deactivated'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              {actionModal.action === 'ban' && (
                <p style={{ fontSize: 13, color: '#fa5252', margin: 0 }}>이 회원을 차단하면 서비스를 이용할 수 없게 됩니다.</p>
              )}
              {actionModal.action === 'deactivate' && (
                <p style={{ fontSize: 13, color: '#868e96', margin: 0 }}>이 회원의 계정을 비활성화합니다.</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setActionModal(null)} style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>취소</button>
                <button
                  disabled={processing}
                  onClick={() => handleAction(
                    actionModal.member.id,
                    actionModal.action,
                    actionModal.action === 'change_role' ? selectedRole || undefined : undefined
                  )}
                  style={{ padding: '6px 14px', background: actionModal.action === 'ban' ? '#fa5252' : '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                >
                  {processing ? '...' : '확인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getActionTitle(action?: string): string {
  switch (action) {
    case 'change_role': return '역할 변경';
    case 'ban': return '회원 차단';
    case 'deactivate': return '계정 비활성화';
    default: return '회원 조치';
  }
}

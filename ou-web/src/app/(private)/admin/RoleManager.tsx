'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, PencilSimple } from '@phosphor-icons/react';
import { SYSTEM_PERMISSIONS } from '@/types/admin';
import type { RoleDefinition } from '@/types/admin';

export function RoleManager() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [createOpened, setCreateOpened] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      setEditName(selectedRole.name);
      setEditLabel(selectedRole.label);
      setEditPermissions([...selectedRole.permissions]);
    }
  }, [selectedRoleId]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const json = await res.json();
      setRoles(json.roles ?? []);
      if (json.roles?.length > 0 && !selectedRoleId) {
        setSelectedRoleId(json.roles[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveRoles = async (updatedRoles: RoleDefinition[]) => {
    setSaving(true);
    try {
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: updatedRoles }),
      });
      setRoles(updatedRoles);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = (perm: string) => {
    setEditPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;
    const updated = roles.map(r =>
      r.id === selectedRoleId
        ? { ...r, name: editName, label: editLabel, permissions: editPermissions }
        : r
    );
    await saveRoles(updated);
  };

  const handleCreateRole = async () => {
    if (!newName || !newLabel) return;
    const newRole: RoleDefinition = {
      id: newName.toLowerCase().replace(/\s+/g, '_'),
      name: newName.toLowerCase().replace(/\s+/g, '_'),
      label: newLabel,
      permissions: [],
      is_system: false,
      created_at: new Date().toISOString(),
    };
    const updated = [...roles, newRole];
    await saveRoles(updated);
    setSelectedRoleId(newRole.id);
    setNewName('');
    setNewLabel('');
    setCreateOpened(false);
  };

  const handleDeleteRole = async (id: string) => {
    const role = roles.find(r => r.id === id);
    if (role?.is_system) return;
    const updated = roles.filter(r => r.id !== id);
    await saveRoles(updated);
    if (selectedRoleId === id) setSelectedRoleId(updated[0]?.id ?? null);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>...</div>;
  }

  const permissionGroups: Record<string, string[]> = {
    '관리자': SYSTEM_PERMISSIONS.filter(p => p.startsWith('admin.')),
    '채팅': SYSTEM_PERMISSIONS.filter(p => p.startsWith('chat.')),
    '데이터': SYSTEM_PERMISSIONS.filter(p => p.startsWith('data.')),
    '뷰': SYSTEM_PERMISSIONS.filter(p => p.startsWith('views.')),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: Role list */}
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>역할 목록</span>
            <button onClick={() => setCreateOpened(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              <Plus size={14} /> 새 역할
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roles.map(role => (
              <div
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                style={{
                  padding: 8, borderRadius: 4, cursor: 'pointer',
                  border: selectedRoleId === role.id ? '2px solid #343a40' : '1px solid #e0e0e0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{role.label}</span>
                    {role.is_system && <span style={{ background: '#f1f3f5', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>시스템</span>}
                  </div>
                  {!role.is_system && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteRole(role.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#fa5252' }}
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
                <span style={{ fontSize: 12, color: '#868e96' }}>
                  {role.permissions.length}개 권한
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Permission editor */}
        <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          {selectedRole ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PencilSimple size={16} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedRole.label} 권한 설정</span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>역할 ID</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    disabled={selectedRole.is_system}
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>표시 이름</label>
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
                  />
                </div>
              </div>

              {Object.entries(permissionGroups).map(([group, perms]) => (
                <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#868e96' }}>{group}</span>
                  {perms.map(perm => (
                    <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.includes(perm)}
                        onChange={() => handleTogglePermission(perm)}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button disabled={saving} onClick={handleSaveRole} style={{ padding: '4px 14px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                  {saving ? '...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#868e96', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>역할을 선택하세요.</p>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {createOpened && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setCreateOpened(false)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>새 역할</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>역할 ID</label>
                <input placeholder="예: moderator" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>표시 이름</label>
                <input placeholder="예: 운영자" value={newLabel} onChange={e => setNewLabel(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setCreateOpened(false)} style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>취소</button>
                <button onClick={handleCreateRole} style={{ padding: '6px 14px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>생성</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

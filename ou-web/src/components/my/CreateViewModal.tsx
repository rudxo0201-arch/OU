'use client';

import { useState } from 'react';
import {
  CalendarBlank, Kanban, ChartLine, Graph, Table, ListBullets,
} from '@phosphor-icons/react';

const VIEW_TYPES = [
  { value: 'calendar', label: '캘린더', icon: CalendarBlank },
  { value: 'kanban', label: '보드', icon: Kanban },
  { value: 'chart', label: '차트', icon: ChartLine },
  { value: 'graph', label: '그래프', icon: Graph },
  { value: 'table', label: '표', icon: Table },
  { value: 'list', label: '목록', icon: ListBullets },
];

interface CreateViewModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (view: { id: string; name: string; viewType: string }) => void;
}

export function CreateViewModal({ opened, onClose, onCreated }: CreateViewModalProps) {
  const [name, setName] = useState('');
  const [viewType, setViewType] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!opened) return null;

  const handleSave = async () => {
    if (!name.trim() || !viewType) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          viewType,
          filterConfig: domain ? { domain } : null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || '저장에 실패했어요.');
        setSaving(false);
        return;
      }

      onCreated({
        id: json.view.id,
        name: json.view.name,
        viewType: json.view.view_type,
      });

      // Reset
      setName('');
      setViewType(null);
      setDomain(null);
      onClose();
    } catch {
      setError('네트워크 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 'var(--mantine-font-size-sm)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'transparent', color: 'inherit' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: 'var(--mantine-color-body)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, zIndex: 1 }}>
        <span style={{ fontWeight: 600, display: 'block', marginBottom: 16 }}>새로운 뷰 만들기</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, marginBottom: 4 }}>이름</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 이번 달 일정" onKeyDown={e => { if (e.key === 'Enter' && name.trim() && viewType) handleSave(); }} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, marginBottom: 4 }}>보기 방식</label>
            <select value={viewType ?? ''} onChange={e => setViewType(e.target.value || null)} style={inputStyle}>
              <option value="">선택해주세요</option>
              {VIEW_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
            </select>
          </div>

          {viewType && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {VIEW_TYPES.filter(vt => vt.value === viewType).map(vt => {
                const Icon = vt.icon;
                return (
                  <div key={vt.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={16} weight="light" color="var(--mantine-color-gray-5)" />
                    <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>{vt.label} 형태로 데이터를 보여드려요</span>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, marginBottom: 2 }}>분류 필터</label>
            <span style={{ display: 'block', fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)', marginBottom: 4 }}>특정 종류의 데이터만 볼 수 있어요</span>
            <select value={domain ?? ''} onChange={e => setDomain(e.target.value || null)} style={inputStyle}>
              <option value="">전체 (선택 안 함)</option>
              <option value="schedule">일정</option>
              <option value="task">할 일</option>
              <option value="knowledge">지식</option>
              <option value="finance">가계</option>
              <option value="emotion">감정</option>
              <option value="idea">아이디어</option>
              <option value="habit">습관</option>
            </select>
          </div>

          {error && <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-red-5)' }}>{error}</span>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: '6px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mantine-color-dimmed)' }}>취소</button>
            <button onClick={handleSave} disabled={!name.trim() || !viewType || saving} style={{ padding: '6px 16px', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: (!name.trim() || !viewType || saving) ? 'not-allowed' : 'pointer', opacity: (!name.trim() || !viewType || saving) ? 0.5 : 1, color: 'inherit' }}>
              {saving ? '만드는 중...' : '만들기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

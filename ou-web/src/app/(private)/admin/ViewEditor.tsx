'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MagnifyingGlass, PencilSimple, Trash, Eye, PaintBrush, Code } from '@phosphor-icons/react';
import { useSelection } from '@/hooks/useSelection';
import type { SavedViewRow } from '@/types/admin';
import { LayoutDesignPanel } from '@/components/views/admin/LayoutDesignPanel';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import type { LayoutConfig } from '@/types/layout-config';

export function ViewEditor() {
  const [views, setViews] = useState<SavedViewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editView, setEditView] = useState<SavedViewRow | null>(null);
  const [editOpened, setEditOpened] = useState(false);
  const [filterJson, setFilterJson] = useState('');
  const [layoutJson, setLayoutJson] = useState('');
  const [editName, setEditName] = useState('');
  const [editVisibility, setEditVisibility] = useState<string>('private');
  const [saving, setSaving] = useState(false);
  const [layoutTab, setLayoutTab] = useState<'visual' | 'json'>('visual');
  const PAGE_SIZE = 20;

  const pageIds = useMemo(() => views.map(v => v.id), [views]);
  const selection = useSelection<string>(pageIds);

  const fetchViews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search,
        ...(viewType ? { viewType } : {}),
      });
      const res = await fetch(`/api/admin/views?${params}`);
      const json = await res.json();
      setViews(json.data ?? []);
      setTotal(json.total ?? 0);
      selection.clearAll();
    } finally {
      setLoading(false);
    }
  }, [page, search, viewType]);

  useEffect(() => { fetchViews(); }, [fetchViews]);
  useEffect(() => { setPage(1); }, [search, viewType]);

  const setLayoutField = useViewEditorStore(s => s.setLayoutField);
  const resetLayoutConfig = useViewEditorStore(s => s.resetLayoutConfig);
  const adminLayoutConfig = useViewEditorStore(s => s.layoutConfig);

  const handleEdit = (view: SavedViewRow) => {
    setEditView(view);
    setEditName(view.name);
    setFilterJson(JSON.stringify(view.filter_config, null, 2));
    setLayoutJson(JSON.stringify(view.layout_config, null, 2));
    setEditVisibility(view.visibility ?? 'private');
    const lc = (view.layout_config as LayoutConfig) ?? {};
    useViewEditorStore.setState({ layoutConfig: lc, viewType: view.view_type });
    setEditOpened(true);
  };

  const handleSave = async () => {
    if (!editView) return;
    setSaving(true);
    try {
      let filterConfig, layoutConfig;
      try { filterConfig = JSON.parse(filterJson); } catch { filterConfig = editView.filter_config; }
      const storeLayout = adminLayoutConfig;
      if (Object.keys(storeLayout).length > 0) {
        layoutConfig = storeLayout;
      } else {
        try { layoutConfig = JSON.parse(layoutJson); } catch { layoutConfig = editView.layout_config; }
      }

      await fetch('/api/admin/views', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editView.id,
          updates: {
            name: editName,
            filter_config: filterConfig,
            layout_config: layoutConfig,
            visibility: editVisibility,
          },
        }),
      });
      setEditOpened(false);
      fetchViews();
    } finally {
      setSaving(false);
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selection.selected);
    if (ids.length === 0) return;
    await fetch('/api/admin/views', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    fetchViews();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const viewTypeOptions = ['calendar', 'task', 'knowledge_graph', 'chart', 'mindmap', 'heatmap', 'journal', 'timeline', 'flashcard', 'document', 'export', 'dictionary'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <MagnifyingGlass size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#868e96' }} />
          <input
            placeholder="뷰 이름 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240, padding: '4px 8px 4px 28px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
          />
        </div>
        <select
          value={viewType}
          onChange={e => setViewType(e.target.value)}
          style={{ width: 180, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
        >
          <option value="">뷰 타입</option>
          {viewTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#868e96' }}>총 {total.toLocaleString()}개</span>
      </div>

      {/* Batch actions */}
      {selection.selected.size > 0 && (
        <div style={{ padding: 8, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#868e96' }}>{selection.selected.size}개 선택</span>
            <button onClick={handleBatchDelete} style={{ padding: '4px 12px', background: '#ffe3e3', color: '#c92a2a', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              선택 삭제
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
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0' }}>이름</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0', width: 100 }}>타입</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0', width: 80 }}>공개</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0', width: 110 }}>생성일</th>
            <th style={{ width: 50, padding: '6px 8px', borderBottom: '2px solid #e0e0e0' }} />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>
                <span>...</span>
              </td>
            </tr>
          ) : views.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#868e96' }}>뷰가 없어요.</td>
            </tr>
          ) : views.map(v => (
            <tr key={v.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
              <td style={{ padding: '6px 8px' }}>
                <input
                  type="checkbox"
                  checked={selection.isSelected(v.id)}
                  onChange={() => selection.toggle(v.id)}
                />
              </td>
              <td style={{ padding: '6px 8px' }}>
                <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
              </td>
              <td style={{ padding: '6px 8px' }}>
                <span style={{ background: '#f1f3f5', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>{v.view_type}</span>
              </td>
              <td style={{ padding: '6px 8px' }}>
                <span style={{ background: v.visibility === 'public' ? '#343a40' : '#f1f3f5', color: v.visibility === 'public' ? '#fff' : '#495057', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>
                  {v.visibility ?? 'private'}
                </span>
              </td>
              <td style={{ padding: '6px 8px', fontSize: 12, color: '#868e96' }}>
                {new Date(v.created_at).toLocaleDateString('ko-KR')}
              </td>
              <td style={{ padding: '6px 8px' }}>
                <button onClick={() => handleEdit(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <PencilSimple size={14} />
                </button>
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

      {/* Edit Modal */}
      {editOpened && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditOpened(false)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '90%', maxWidth: 640, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>뷰 편집</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>이름</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>공개 범위</label>
                <select value={editVisibility} onChange={e => setEditVisibility(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}>
                  <option value="private">private</option>
                  <option value="link">link</option>
                  <option value="public">public</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>필터 설정 (JSON)</label>
                <textarea
                  value={filterJson}
                  onChange={e => setFilterJson(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }}
                />
              </div>

              {/* Layout tabs */}
              <div>
                <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', marginBottom: 8 }}>
                  <button onClick={() => setLayoutTab('visual')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: 'none', borderBottom: layoutTab === 'visual' ? '2px solid #333' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: layoutTab === 'visual' ? 600 : 400 }}>
                    <PaintBrush size={14} /> 디자인
                  </button>
                  <button onClick={() => setLayoutTab('json')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: 'none', borderBottom: layoutTab === 'json' ? '2px solid #333' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: layoutTab === 'json' ? 600 : 400 }}>
                    <Code size={14} /> JSON
                  </button>
                </div>
                {layoutTab === 'visual' ? (
                  <LayoutDesignPanel viewType={editView?.view_type} />
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>레이아웃 설정 (JSON)</label>
                    <textarea
                      value={layoutJson}
                      onChange={e => setLayoutJson(e.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }}
                    />
                  </div>
                )}
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

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MagnifyingGlass, PencilSimple, Trash, Plus, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { getTableSchema } from '@/lib/admin/table-schemas';
import { useSelection } from '@/hooks/useSelection';
import type { ColumnSchema, TableSchema } from '@/types/admin';

interface DBTableViewProps {
  tableName: string;
}

export function DBTableView({ tableName }: DBTableViewProps) {
  const schema = getTableSchema(tableName);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(schema?.defaultSort ?? 'created_at');
  const [sortAsc, setSortAsc] = useState(schema?.defaultSortAsc ?? false);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const pageIds = useMemo(() => rows.map(r => String(r.id ?? '')), [rows]);
  const selection = useSelection<string>(pageIds);
  const visibleColumns = useMemo(
    () => schema?.columns.filter(c => !c.hidden) ?? [],
    [schema]
  );

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortBy,
        sortAsc: String(sortAsc),
        search,
      });
      const res = await fetch(`/api/admin/tables/${tableName}?${params}`);
      const json = await res.json();
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      selection.clearAll();
    } finally {
      setLoading(false);
    }
  }, [tableName, page, sortBy, sortAsc, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { setPage(1); }, [search]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };

  const handleOpenCreate = () => {
    setIsCreating(true);
    setEditRow(null);
    const defaults: Record<string, unknown> = {};
    visibleColumns.filter(c => c.editable).forEach(c => {
      if (c.type === 'boolean') defaults[c.name] = false;
      else if (c.type === 'integer' || c.type === 'float') defaults[c.name] = 0;
      else defaults[c.name] = '';
    });
    setEditValues(defaults);
    setEditOpened(true);
  };

  const handleOpenEdit = (row: Record<string, unknown>) => {
    setIsCreating(false);
    setEditRow(row);
    const vals: Record<string, unknown> = {};
    visibleColumns.filter(c => c.editable).forEach(c => {
      vals[c.name] = row[c.name] ?? '';
    });
    setEditValues(vals);
    setEditOpened(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isCreating) {
        await fetch(`/api/admin/tables/${tableName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editValues),
        });
      } else {
        const hasId = editRow && 'id' in editRow;
        const body = hasId
          ? { id: editRow!.id, updates: editValues }
          : { compositeKey: getCompositeKey(editRow!, schema!), updates: editValues };
        await fetch(`/api/admin/tables/${tableName}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      setEditOpened(false);
      fetchRows();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    const hasId = 'id' in row;
    const body = hasId
      ? { id: row.id }
      : { compositeKey: getCompositeKey(row, schema!) };
    await fetch(`/api/admin/tables/${tableName}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setDeleteConfirm(null);
    fetchRows();
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selection.selected);
    await fetch(`/api/admin/tables/${tableName}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    fetchRows();
  };

  if (!schema) return <span style={{ color: '#868e96' }}>스키마를 찾을 수 없어요.</span>;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <MagnifyingGlass size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#868e96' }} />
            <input
              placeholder="검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 240, padding: '4px 8px 4px 28px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12 }}
            />
          </div>
          <span style={{ fontSize: 12, color: '#868e96' }}>총 {total.toLocaleString()}건</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selection.selected.size > 0 && (
            <button onClick={handleBatchDelete} style={{ padding: '4px 12px', background: '#ffe3e3', color: '#c92a2a', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
              {selection.selected.size}건 삭제
            </button>
          )}
          <button onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            <Plus size={14} /> 새 행
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto' }}>
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
              {visibleColumns.map(col => (
                <th
                  key={col.name}
                  style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e0e0e0', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => handleSort(col.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{col.label}</span>
                    {sortBy === col.name && (
                      sortAsc
                        ? <ArrowUp size={12} weight="bold" />
                        : <ArrowDown size={12} weight="bold" />
                    )}
                  </div>
                </th>
              ))}
              <th style={{ width: 70, padding: '6px 8px', borderBottom: '2px solid #e0e0e0' }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} style={{ textAlign: 'center', padding: '16px' }}>...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} style={{ textAlign: 'center', padding: '16px', color: '#868e96' }}>데이터가 없어요.</td>
              </tr>
            ) : rows.map((row, idx) => (
              <tr key={String(row.id ?? idx)} style={{ borderBottom: '1px solid #f1f3f5' }}>
                <td style={{ padding: '6px 8px' }}>
                  <input
                    type="checkbox"
                    checked={selection.isSelected(String(row.id ?? ''))}
                    onChange={() => selection.toggle(String(row.id ?? ''))}
                  />
                </td>
                {visibleColumns.map(col => (
                  <td key={col.name} style={{ padding: '6px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <CellRenderer value={row[col.name]} col={col} />
                  </td>
                ))}
                <td style={{ padding: '6px 8px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleOpenEdit(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <PencilSimple size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirm(String(row.id ?? idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#fa5252' }}>
                      <Trash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {/* Edit/Create Modal */}
      {editOpened && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditOpened(false)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '90%', maxWidth: 640, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>{isCreating ? '새 행 생성' : '행 수정'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleColumns.filter(c => c.editable).map(col => (
                <FieldEditor
                  key={col.name}
                  col={col}
                  value={editValues[col.name]}
                  onChange={val => setEditValues(prev => ({ ...prev, [col.name]: val }))}
                />
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button onClick={() => setEditOpened(false)} style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>취소</button>
                <button disabled={saving} onClick={handleSave} style={{ padding: '6px 14px', background: '#343a40', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                  {saving ? '...' : isCreating ? '생성' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>삭제 확인</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 13 }}>이 행을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ padding: '6px 14px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>취소</button>
                <button
                  onClick={() => {
                    const row = rows.find(r => String(r.id ?? '') === deleteConfirm);
                    if (row) handleDelete(row);
                  }}
                  style={{ padding: '6px 14px', background: '#fa5252', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 셀 렌더러 */
function CellRenderer({ value, col }: { value: unknown; col: ColumnSchema }) {
  if (value === null || value === undefined) return <span style={{ fontSize: 12, color: '#868e96' }}>--</span>;

  switch (col.type) {
    case 'boolean':
      return <span style={{ background: value ? '#343a40' : '#f1f3f5', color: value ? '#fff' : '#868e96', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>{value ? 'Y' : 'N'}</span>;
    case 'timestamp':
      return <span style={{ fontSize: 12, color: '#868e96' }}>{new Date(String(value)).toLocaleString('ko-KR')}</span>;
    case 'json':
      return <span style={{ fontSize: 12, color: '#868e96', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{JSON.stringify(value)}</span>;
    case 'uuid':
      return <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#868e96', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{String(value).slice(0, 8)}...</span>;
    case 'enum':
      return <span style={{ background: '#f1f3f5', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>{String(value)}</span>;
    default:
      return <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{String(value)}</span>;
  }
}

/** 필드 에디터 */
function FieldEditor({ col, value, onChange }: { col: ColumnSchema; value: unknown; onChange: (v: unknown) => void }) {
  switch (col.type) {
    case 'boolean':
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.currentTarget.checked)} />
          {col.label}
        </label>
      );
    case 'enum':
      return (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{col.label}</label>
          <select
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value || null)}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
          >
            {!col.required && <option value="">--</option>}
            {(col.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    case 'integer':
    case 'float':
      return (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{col.label}</label>
          <input
            type="number"
            value={typeof value === 'number' ? value : 0}
            onChange={e => onChange(col.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value))}
            step={col.type === 'float' ? 0.000001 : 1}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
          />
        </div>
      );
    case 'json':
      return (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{col.label}</label>
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={e => {
              try { onChange(JSON.parse(e.target.value)); }
              catch { onChange(e.target.value); }
            }}
            rows={3}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }}
          />
        </div>
      );
    case 'text':
    case 'uuid':
    default:
      return (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{col.label}</label>
          <input
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value)}
            required={col.required}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #dee2e6', borderRadius: 4, fontSize: 13 }}
          />
        </div>
      );
  }
}

/** 복합키 테이블에서 키 추출 */
function getCompositeKey(row: Record<string, unknown>, schema: TableSchema): Record<string, unknown> {
  const hasId = schema.columns.some(c => c.name === 'id');
  if (hasId) return { id: row.id };

  const key: Record<string, unknown> = {};
  schema.columns
    .filter(c => c.type === 'uuid' || c.fkTable)
    .forEach(c => { key[c.name] = row[c.name]; });
  return key;
}

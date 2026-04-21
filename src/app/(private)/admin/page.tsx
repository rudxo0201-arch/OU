'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NeuButton, NeuInput, NeuSelect, NeuModal } from '@/components/ds';
import { AdminTable, type AdminTableColumn } from '@/components/admin/AdminTable';
import { RowDetailPanel } from '@/components/admin/RowDetailPanel';
import { RowEditForm } from '@/components/admin/RowEditForm';
import { RowCreateForm } from '@/components/admin/RowCreateForm';
import { BatchActionBar } from '@/components/admin/BatchActionBar';
import { TableFilters, buildFilterParams, type FilterValues } from '@/components/admin/TableFilters';
import { TABLE_SCHEMAS, getTableSchema } from '@/lib/admin/table-schemas';
import { TABLE_CATEGORIES } from '@/lib/admin/table-categories';
import { renderCell, getColumnWidth } from '@/lib/admin/cell-renderers';
import { resolveForeignKeys, type FkMap } from '@/lib/admin/fk-resolver';
import { useSelection } from '@/hooks/useSelection';
import { AdminOrb } from '@/components/admin/AdminOrb';
import type { TableSchema } from '@/types/admin';

const PAGE_SIZES = [10, 20, 50, 100];

function getRowKey(schema: TableSchema, row: Record<string, unknown>) {
  const hasId = schema.columns.some(c => c.name === 'id');
  if (hasId) return { id: String(row.id) };
  const compositeKey: Record<string, unknown> = {};
  schema.columns.filter(c => c.type === 'uuid').forEach(c => { compositeKey[c.name] = row[c.name]; });
  return { compositeKey };
}

const TABLE_OPTIONS = [
  { value: '', label: '테이블 선택…' },
  ...TABLE_CATEGORIES.flatMap(cat => [
    { value: `__cat__${cat.label}`, label: `── ${cat.label} ──` },
    ...cat.tables
      .map(name => TABLE_SCHEMAS.find(s => s.name === name))
      .filter((s): s is TableSchema => !!s)
      .map(s => ({ value: s.name, label: `${s.label}  (${s.name})` })),
  ]),
];

export default function AdminPage() {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();

  const [selectedTable, setSelectedTable] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const [loading, setLoading] = useState(false);
  const [fkMap, setFkMap] = useState<FkMap>(new Map());

  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, unknown> | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const schema = (selectedTable ? getTableSchema(selectedTable) : null) ?? null;
  const totalPages = Math.ceil(total / pageSize);
  const pageIds = rows.map(r => String(r.id ?? JSON.stringify(r)));
  const selection = useSelection(pageIds);

  // ─── 데이터 패치 ────────────────────────────────────────────
  const fetchData = useCallback(async (
    tbl: string, pg: number, q: string, sk: string, sa: boolean,
    ps: number, fv: FilterValues
  ) => {
    if (!tbl) return;
    setLoading(true);
    try {
      const filterParams = buildFilterParams(fv);
      const params = new URLSearchParams({
        page: String(pg), pageSize: String(ps), search: q,
        ...(sk ? { sortBy: sk, sortAsc: String(sa) } : {}),
        ...filterParams,
      });
      const res = await fetch(`/api/admin/tables/${tbl}?${params}`);
      const data = await res.json();
      const fetched: Record<string, unknown>[] = data.data || [];
      setRows(fetched);
      setTotal(data.total || 0);

      // FK 해석 (비동기, 실패해도 무시)
      const s = getTableSchema(tbl);
      if (s) {
        resolveForeignKeys(fetched, s).then(setFkMap).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTable) fetchData(selectedTable, page, search, sortKey, sortAsc, pageSize, filters);
  }, [selectedTable, page, sortKey, sortAsc, pageSize, fetchData]);

  // 필터 변경 시 즉시 적용
  const applyFilters = (f: FilterValues) => {
    setFilters(f);
    setPage(1);
    fetchData(selectedTable, 1, search, sortKey, sortAsc, pageSize, f);
  };

  const handleSelectTable = (name: string) => {
    if (name.startsWith('__cat__')) return;
    const s = getTableSchema(name);
    setSelectedTable(name);
    setPage(1);
    setSearch('');
    setSortKey(s?.defaultSort ?? 'created_at');
    setSortAsc(s?.defaultSortAsc ?? false);
    setFilters({});
    setFkMap(new Map());
    selection.clearAll();
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
    setPage(1);
  };

  const doSearch = () => {
    setPage(1);
    fetchData(selectedTable, 1, search, sortKey, sortAsc, pageSize, filters);
  };

  // ─── CRUD ────────────────────────────────────────────────────
  const handleSaveEdit = async (updates: Record<string, unknown>) => {
    if (!schema || !detailRow) return;
    const key = getRowKey(schema, detailRow);
    const res = await fetch(`/api/admin/tables/${selectedTable}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...key, updates }),
    });
    if (!res.ok) throw new Error('저장 실패');
    setEditMode(false);
    setDetailRow(null);
    fetchData(selectedTable, page, search, sortKey, sortAsc, pageSize, filters);
  };

  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/tables/${selectedTable}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('생성 실패');
    setPage(1);
    fetchData(selectedTable, 1, search, sortKey, sortAsc, pageSize, filters);
  };

  const handleDeleteRow = async (row: Record<string, unknown>) => {
    if (!schema) return;
    const key = getRowKey(schema, row);
    const res = await fetch(`/api/admin/tables/${selectedTable}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(key),
    });
    if (!res.ok) throw new Error('삭제 실패');
    setDeleteConfirm(null);
    setDetailRow(null);
    fetchData(selectedTable, page, search, sortKey, sortAsc, pageSize, filters);
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selection.selected);
    if (!ids.length) return;
    setBatchDeleting(true);
    try {
      await fetch(`/api/admin/tables/${selectedTable}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      selection.clearAll();
      fetchData(selectedTable, page, search, sortKey, sortAsc, pageSize, filters);
    } finally {
      setBatchDeleting(false);
    }
  };

  // ─── 컬럼 생성 (FK display_name 반영) ────────────────────────
  const columns: AdminTableColumn[] = schema
    ? schema.columns
        .filter(c => !c.hidden)
        .map(col => ({
          key: col.name,
          label: col.label,
          width: getColumnWidth(col.type),
          sortable: ['text', 'timestamp', 'integer', 'float', 'enum', 'boolean'].includes(col.type),
          render: (value, row) => {
            // FK 컬럼: display_name으로 대체
            if (col.fkDisplay && fkMap.has(col.name)) {
              const displayName = fkMap.get(col.name)?.get(String(value));
              if (displayName) {
                return (
                  <span title={String(value)} style={{ fontSize: 12, color: 'var(--ou-text-body)' }}>
                    {displayName}
                  </span>
                );
              }
            }
            return renderCell(col, value);
          },
        }))
    : [];

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }
  if (!isAdmin) { router.replace('/home'); return null; }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div style={{ height: '100dvh', paddingTop: 52, background: 'var(--ou-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px 0', flexShrink: 0 }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'transparent', border: '1px solid var(--ou-border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--ou-text-secondary)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ou-text-bright)', letterSpacing: '-0.01em' }}>
          관리자
        </h1>
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginLeft: 2 }}>DB 뷰어</span>
      </div>

      {/* 컨트롤 바 */}
      <div style={{ padding: '10px 24px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <NeuSelect
          value={selectedTable}
          onChange={handleSelectTable}
          options={TABLE_OPTIONS}
          style={{ width: 280 }}
        />
        {selectedTable && (
          <>
            <NeuInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="텍스트 검색…"
              style={{ flex: 1, maxWidth: 280 }}
            />
            <NeuButton variant="default" size="sm" onClick={doSearch}>검색</NeuButton>
            <NeuButton variant="default" size="sm" onClick={() => setCreateOpen(true)} style={{ marginLeft: 'auto' }}>
              + 새 행
            </NeuButton>
          </>
        )}
      </div>

      {/* 컬럼 필터 */}
      {schema && (
        <div style={{ paddingTop: 8, flexShrink: 0 }}>
          <TableFilters schema={schema} filters={filters} onChange={applyFilters} />
        </div>
      )}

      {/* 정보바 */}
      {schema && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 24px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-body)' }}>{schema.label}</span>
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>{schema.name}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {!loading && total > 0 && (
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
                {from.toLocaleString()}–{to.toLocaleString()} / {total.toLocaleString()}건
              </span>
            )}
            {!loading && sortKey && (
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
                {schema.columns.find(c => c.name === sortKey)?.label ?? sortKey} {sortAsc ? '↑' : '↓'}
              </span>
            )}
            {/* 페이지 크기 */}
            <NeuSelect
              value={String(pageSize)}
              onChange={v => { setPageSize(Number(v)); setPage(1); }}
              options={PAGE_SIZES.map(n => ({ value: String(n), label: `${n}행` }))}
              style={{ width: 80 }}
            />
          </div>
        </div>
      )}

      {/* 메인 영역: 좌측 테이블 + 우측 Orb */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* 좌측: DB 뷰어 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 0 0 24px' }}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingBottom: 24, paddingRight: 16 }}>
            {!selectedTable ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
                테이블을 선택하세요
              </div>
            ) : (
              <>
                <AdminTable
                  columns={columns}
                  rows={rows}
                  sortKey={sortKey}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  onRowClick={row => { setDetailRow(row); setEditMode(false); }}
                  loading={loading}
                  selectedIds={selection.selected}
                  onSelectRow={id => selection.toggle(id)}
                  onSelectAll={() => {
                    if (selection.headerCheckbox.checked) selection.deselectPage(pageIds);
                    else selection.selectPage(pageIds);
                  }}
                />
                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                    <NeuButton variant="ghost" size="sm" onClick={() => setPage(1)} disabled={page <= 1}>«</NeuButton>
                    <NeuButton variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </NeuButton>
                    <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', minWidth: 90, textAlign: 'center' }}>
                      {page} / {totalPages}
                    </span>
                    <NeuButton variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </NeuButton>
                    <NeuButton variant="ghost" size="sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</NeuButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ width: 1, background: 'var(--ou-border-subtle)', flexShrink: 0 }} />

        {/* 우측: 관리자 Orb */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Orb
            </span>
          </div>
          <AdminOrb currentTable={selectedTable || undefined} />
        </div>
      </div>

      {/* 행 상세 */}
      <RowDetailPanel
        open={!!detailRow && !editMode}
        onClose={() => setDetailRow(null)}
        schema={schema}
        row={detailRow}
        onEdit={() => setEditMode(true)}
        onDelete={() => setDeleteConfirm(detailRow)}
      />

      {/* 편집 */}
      {detailRow && editMode && schema && (
        <NeuModal open={editMode} onClose={() => setEditMode(false)} title={`${schema.label} 편집`} maxWidth={560}>
          <RowEditForm schema={schema} row={detailRow} onSave={handleSaveEdit} onCancel={() => setEditMode(false)} />
        </NeuModal>
      )}

      {/* 생성 */}
      {schema && (
        <RowCreateForm open={createOpen} onClose={() => setCreateOpen(false)} schema={schema} onCreate={handleCreate} />
      )}

      {/* 삭제 확인 */}
      {deleteConfirm && (
        <NeuModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="삭제 확인" maxWidth={400}>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.6 }}>
            이 행을 삭제하시겠습니까?<br />
            <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>이 작업은 되돌릴 수 없습니다.</span>
          </p>
          <div style={{
            padding: '8px 10px', marginBottom: 20,
            borderRadius: 'var(--ou-radius-sm)',
            background: 'var(--ou-surface-faint)',
            boxShadow: 'var(--ou-neu-pressed-sm)',
            fontSize: 11, fontFamily: 'monospace', color: 'var(--ou-text-muted)',
          }}>
            {String(deleteConfirm.id ?? JSON.stringify(deleteConfirm)).slice(0, 60)}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <NeuButton variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>취소</NeuButton>
            <NeuButton variant="default" size="sm" onClick={() => handleDeleteRow(deleteConfirm)}>삭제</NeuButton>
          </div>
        </NeuModal>
      )}

      {/* 배치 삭제 */}
      <BatchActionBar count={selection.count} onClear={selection.clearAll} onDelete={handleBatchDelete} deleting={batchDeleting} />
    </div>
  );
}

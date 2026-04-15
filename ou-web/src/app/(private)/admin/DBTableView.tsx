'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Stack, Table, Group, Text, TextInput, Pagination, Button, ActionIcon,
  Modal, Checkbox, Select, Switch, Textarea, NumberInput, Paper, Badge, Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
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
    openEdit();
  };

  const handleOpenEdit = (row: Record<string, unknown>) => {
    setIsCreating(false);
    setEditRow(row);
    const vals: Record<string, unknown> = {};
    visibleColumns.filter(c => c.editable).forEach(c => {
      vals[c.name] = row[c.name] ?? '';
    });
    setEditValues(vals);
    openEdit();
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
      closeEdit();
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

  if (!schema) return <Text c="dimmed">스키마를 찾을 수 없어요.</Text>;

  return (
    <Stack gap="md">
      {/* Toolbar */}
      <Group justify="space-between">
        <Group gap="sm">
          <TextInput
            placeholder="검색..."
            leftSection={<MagnifyingGlass size={16} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            w={240}
            size="xs"
          />
          <Text fz="xs" c="dimmed">총 {total.toLocaleString()}건</Text>
        </Group>
        <Group gap="xs">
          {selection.selected.size > 0 && (
            <Button size="xs" variant="light" color="red" onClick={handleBatchDelete}>
              {selection.selected.size}건 삭제
            </Button>
          )}
          <Button size="xs" variant="light" color="dark" leftSection={<Plus size={14} />} onClick={handleOpenCreate}>
            새 행
          </Button>
        </Group>
      </Group>

      {/* Table */}
      <Paper style={{ overflow: 'auto' }}>
        <Table highlightOnHover fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={36}>
                <Checkbox
                  size="xs"
                  checked={selection.headerCheckbox.checked}
                  indeterminate={selection.headerCheckbox.indeterminate}
                  onChange={() => {
                    if (selection.headerCheckbox.checked) selection.deselectPage(pageIds);
                    else selection.selectPage(pageIds);
                  }}
                />
              </Table.Th>
              {visibleColumns.map(col => (
                <Table.Th
                  key={col.name}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => handleSort(col.name)}
                >
                  <Group gap={4} wrap="nowrap">
                    <Text fz="xs" fw={600}>{col.label}</Text>
                    {sortBy === col.name && (
                      sortAsc
                        ? <ArrowUp size={12} weight="bold" />
                        : <ArrowDown size={12} weight="bold" />
                    )}
                  </Group>
                </Table.Th>
              ))}
              <Table.Th w={70} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={visibleColumns.length + 2}>
                  <Group justify="center" py="md"><Loader size="sm" /></Group>
                </Table.Td>
              </Table.Tr>
            ) : rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={visibleColumns.length + 2}>
                  <Text c="dimmed" ta="center" py="md">데이터가 없어요.</Text>
                </Table.Td>
              </Table.Tr>
            ) : rows.map((row, idx) => (
              <Table.Tr key={String(row.id ?? idx)}>
                <Table.Td>
                  <Checkbox
                    size="xs"
                    checked={selection.isSelected(String(row.id ?? ''))}
                    onChange={() => selection.toggle(String(row.id ?? ''))}
                  />
                </Table.Td>
                {visibleColumns.map(col => (
                  <Table.Td key={col.name} maw={200} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <CellRenderer value={row[col.name]} col={col} />
                  </Table.Td>
                ))}
                <Table.Td>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon variant="subtle" size="xs" onClick={() => handleOpenEdit(row)}>
                      <PencilSimple size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="xs" color="red" onClick={() => setDeleteConfirm(String(row.id ?? idx))}>
                      <Trash size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Group justify="center">
        <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} size="sm" />
      </Group>

      {/* Edit/Create Modal */}
      <Modal
        opened={editOpened}
        onClose={closeEdit}
        title={isCreating ? '새 행 생성' : '행 수정'}
        centered
        size="lg"
      >
        <Stack gap="sm">
          {visibleColumns.filter(c => c.editable).map(col => (
            <FieldEditor
              key={col.name}
              col={col}
              value={editValues[col.name]}
              onChange={val => setEditValues(prev => ({ ...prev, [col.name]: val }))}
            />
          ))}
          <Group justify="flex-end" gap="xs" mt="md">
            <Button variant="light" color="gray" onClick={closeEdit}>취소</Button>
            <Button color="dark" loading={saving} onClick={handleSave}>
              {isCreating ? '생성' : '저장'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        opened={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="삭제 확인"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text fz="sm">이 행을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="light" color="gray" onClick={() => setDeleteConfirm(null)}>취소</Button>
            <Button
              color="red"
              onClick={() => {
                const row = rows.find(r => String(r.id ?? '') === deleteConfirm);
                if (row) handleDelete(row);
              }}
            >
              삭제
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/** 셀 렌더러 */
function CellRenderer({ value, col }: { value: unknown; col: ColumnSchema }) {
  if (value === null || value === undefined) return <Text fz="xs" c="dimmed">—</Text>;

  switch (col.type) {
    case 'boolean':
      return <Badge variant="light" color={value ? 'dark' : 'gray'} size="xs">{value ? 'Y' : 'N'}</Badge>;
    case 'timestamp':
      return <Text fz="xs" c="dimmed">{new Date(String(value)).toLocaleString('ko-KR')}</Text>;
    case 'json':
      return <Text fz="xs" c="dimmed" lineClamp={1}>{JSON.stringify(value)}</Text>;
    case 'uuid':
      return <Text fz="xs" ff="monospace" c="dimmed" lineClamp={1}>{String(value).slice(0, 8)}…</Text>;
    case 'enum':
      return <Badge variant="light" color="gray" size="xs">{String(value)}</Badge>;
    default:
      return <Text fz="xs" lineClamp={1}>{String(value)}</Text>;
  }
}

/** 필드 에디터 */
function FieldEditor({ col, value, onChange }: { col: ColumnSchema; value: unknown; onChange: (v: unknown) => void }) {
  switch (col.type) {
    case 'boolean':
      return <Switch label={col.label} checked={!!value} onChange={e => onChange(e.currentTarget.checked)} />;
    case 'enum':
      return (
        <Select
          label={col.label}
          data={col.options ?? []}
          value={String(value ?? '')}
          onChange={v => onChange(v)}
          clearable={!col.required}
        />
      );
    case 'integer':
    case 'float':
      return (
        <NumberInput
          label={col.label}
          value={typeof value === 'number' ? value : 0}
          onChange={v => onChange(v)}
          decimalScale={col.type === 'float' ? 6 : 0}
        />
      );
    case 'json':
      return (
        <Textarea
          label={col.label}
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={e => {
            try { onChange(JSON.parse(e.target.value)); }
            catch { onChange(e.target.value); }
          }}
          minRows={3}
          autosize
          ff="monospace"
          fz="xs"
        />
      );
    case 'text':
    case 'uuid':
    default:
      return (
        <TextInput
          label={col.label}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          required={col.required}
        />
      );
  }
}

/** 복합키 테이블에서 키 추출 */
function getCompositeKey(row: Record<string, unknown>, schema: TableSchema): Record<string, unknown> {
  const hasId = schema.columns.some(c => c.name === 'id');
  if (hasId) return { id: row.id };

  // id 컬럼이 없으면 모든 uuid/fk 컬럼을 키로 사용
  const key: Record<string, unknown> = {};
  schema.columns
    .filter(c => c.type === 'uuid' || c.fkTable)
    .forEach(c => { key[c.name] = row[c.name]; });
  return key;
}

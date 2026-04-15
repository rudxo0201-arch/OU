'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Stack, Group, TextInput, Select, Table, Text, Badge, ActionIcon,
  Pagination, Modal, Textarea, Button, Checkbox, Paper, Loader, Tabs,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
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
  const [viewType, setViewType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editView, setEditView] = useState<SavedViewRow | null>(null);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [filterJson, setFilterJson] = useState('');
  const [layoutJson, setLayoutJson] = useState('');
  const [editName, setEditName] = useState('');
  const [editVisibility, setEditVisibility] = useState<string | null>('private');
  const [saving, setSaving] = useState(false);
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
    // 스토어에도 layoutConfig 로드 (비주얼 에디터용)
    const lc = (view.layout_config as LayoutConfig) ?? {};
    useViewEditorStore.setState({ layoutConfig: lc, viewType: view.view_type });
    openEdit();
  };

  const handleSave = async () => {
    if (!editView) return;
    setSaving(true);
    try {
      let filterConfig, layoutConfig;
      try { filterConfig = JSON.parse(filterJson); } catch { filterConfig = editView.filter_config; }
      // 비주얼 에디터에서 변경했으면 스토어 값 사용, 아니면 JSON textarea 값 사용
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
      closeEdit();
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

  return (
    <Stack gap="md">
      {/* Filters */}
      <Group gap="sm">
        <TextInput
          placeholder="뷰 이름 검색..."
          leftSection={<MagnifyingGlass size={16} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          w={240}
          size="xs"
        />
        <Select
          placeholder="뷰 타입"
          data={['calendar', 'task', 'knowledge_graph', 'chart', 'mindmap', 'heatmap', 'journal', 'timeline', 'flashcard', 'document', 'export', 'dictionary']}
          value={viewType}
          onChange={setViewType}
          clearable
          w={180}
          size="xs"
        />
        <Text fz="xs" c="dimmed">총 {total.toLocaleString()}개</Text>
      </Group>

      {/* Batch actions */}
      {selection.selected.size > 0 && (
        <Paper p="xs">
          <Group gap="xs">
            <Text fz="xs" c="dimmed">{selection.selected.size}개 선택</Text>
            <Button size="xs" variant="light" color="red" onClick={handleBatchDelete}>
              선택 삭제
            </Button>
            <Button size="xs" variant="light" color="gray" onClick={() => selection.clearAll()}>
              선택 해제
            </Button>
          </Group>
        </Paper>
      )}

      {/* Table */}
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
            <Table.Th>이름</Table.Th>
            <Table.Th w={100}>타입</Table.Th>
            <Table.Th w={80}>공개</Table.Th>
            <Table.Th w={110}>생성일</Table.Th>
            <Table.Th w={50} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Group justify="center" py="md"><Loader size="sm" /></Group>
              </Table.Td>
            </Table.Tr>
          ) : views.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">뷰가 없어요.</Text>
              </Table.Td>
            </Table.Tr>
          ) : views.map(v => (
            <Table.Tr key={v.id}>
              <Table.Td>
                <Checkbox
                  size="xs"
                  checked={selection.isSelected(v.id)}
                  onChange={() => selection.toggle(v.id)}
                />
              </Table.Td>
              <Table.Td>
                <Text fz="xs" fw={500} lineClamp={1}>{v.name}</Text>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color="gray" size="xs">{v.view_type}</Badge>
              </Table.Td>
              <Table.Td>
                <Badge variant="light" color={v.visibility === 'public' ? 'dark' : 'gray'} size="xs">
                  {v.visibility ?? 'private'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text fz="xs" c="dimmed">{new Date(v.created_at).toLocaleDateString('ko-KR')}</Text>
              </Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" size="xs" onClick={() => handleEdit(v)}>
                  <PencilSimple size={14} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="center">
        <Pagination total={Math.ceil(total / PAGE_SIZE)} value={page} onChange={setPage} size="sm" />
      </Group>

      {/* Edit Modal */}
      <Modal opened={editOpened} onClose={closeEdit} title="뷰 편집" centered size="lg">
        <Stack gap="md">
          <TextInput label="이름" value={editName} onChange={e => setEditName(e.target.value)} />
          <Select
            label="공개 범위"
            data={['private', 'link', 'public']}
            value={editVisibility}
            onChange={setEditVisibility}
          />
          <Textarea
            label="필터 설정 (JSON)"
            value={filterJson}
            onChange={e => setFilterJson(e.target.value)}
            minRows={4}
            autosize
            ff="monospace"
            fz="xs"
          />

          {/* 레이아웃: 비주얼 에디터 / JSON 탭 전환 */}
          <Tabs defaultValue="visual" variant="outline">
            <Tabs.List>
              <Tabs.Tab value="visual" leftSection={<PaintBrush size={14} />}>
                디자인
              </Tabs.Tab>
              <Tabs.Tab value="json" leftSection={<Code size={14} />}>
                JSON
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="visual" pt="sm">
              <LayoutDesignPanel viewType={editView?.view_type} />
            </Tabs.Panel>
            <Tabs.Panel value="json" pt="sm">
              <Textarea
                label="레이아웃 설정 (JSON)"
                value={layoutJson}
                onChange={e => setLayoutJson(e.target.value)}
                minRows={4}
                autosize
                ff="monospace"
                fz="xs"
              />
            </Tabs.Panel>
          </Tabs>

          <Group justify="flex-end" gap="xs">
            <Button variant="light" color="gray" onClick={closeEdit}>취소</Button>
            <Button color="dark" loading={saving} onClick={handleSave}>저장</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

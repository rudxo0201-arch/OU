'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Drawer, Group, Text, Button, Stack, Box, ScrollArea,
  TextInput, Textarea, Select, SimpleGrid, SegmentedControl,
  Divider, Badge, ActionIcon, Tooltip,
} from '@mantine/core';
import {
  CalendarBlank, Kanban, ChartBar, Graph, TreeStructure,
  SquaresFour, BookOpen, Clock, Cards, BookBookmark,
  FileText, Table, Trash, X, FloppyDisk,
  FilePdf, Presentation, User, UsersThree,
  Heartbeat, IdentificationBadge, Camera,
} from '@phosphor-icons/react';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { VIEW_SCHEMA_HINTS, getSchemaHint, calculateFieldCoverage } from '@/lib/views/schema-hints';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { LayoutDesignPanel } from './LayoutDesignPanel';
import type { LayoutConfig } from '@/types/layout-config';

const VIEW_TYPE_ICONS: Record<string, any> = {
  calendar: CalendarBlank,
  task: Kanban,
  chart: ChartBar,
  knowledge_graph: Graph,
  mindmap: TreeStructure,
  heatmap: SquaresFour,
  journal: BookOpen,
  timeline: Clock,
  flashcard: Cards,
  dictionary: BookBookmark,
  document: FileText,
  table: Table,
  pdf: FilePdf,
  lecture: Presentation,
  profile: User,
  relationship: UsersThree,
  health: Heartbeat,
  resume: IdentificationBadge,
  snapshot: Camera,
};

const DOMAIN_OPTIONS = [
  { value: 'schedule', label: '일정' },
  { value: 'task', label: '할 일' },
  { value: 'habit', label: '습관' },
  { value: 'knowledge', label: '지식' },
  { value: 'idea', label: '아이디어' },
  { value: 'relation', label: '관계' },
  { value: 'emotion', label: '감정' },
  { value: 'finance', label: '가계' },
  { value: 'product', label: '상품' },
  { value: 'broadcast', label: '방송' },
  { value: 'education', label: '교육' },
  { value: 'media', label: '미디어' },
  { value: 'location', label: '장소' },
];

interface ViewEditorDrawerProps {
  nodes: any[];
  onSaved: () => void;
}

export function ViewEditorDrawer({ nodes, onSaved }: ViewEditorDrawerProps) {
  const store = useViewEditorStore();
  const {
    isOpen, editingView, name, viewType, icon, description,
    filterConfig, layoutConfig, schemaMap, visibility, isDefault, saving,
    setField, setFilterField, removeFilterField, setSchemaField,
    removeSchemaField, setSaving, close,
  } = store;

  // 현재 필터에 맞는 노드만
  const filteredNodes = useMemo(() => {
    let result = nodes;
    const domain = filterConfig.domain;
    if (domain && typeof domain === 'string') {
      result = result.filter(n => n.domain === domain);
    }
    return result;
  }, [nodes, filterConfig]);

  // 스키마 힌트
  const currentHint = useMemo(() => getSchemaHint(viewType), [viewType]);
  const allFields = useMemo(() => {
    if (!currentHint) return [];
    return [...currentHint.requiredFields, ...currentHint.optionalFields];
  }, [currentHint]);
  const fieldCoverage = useMemo(
    () => calculateFieldCoverage(filteredNodes, allFields),
    [filteredNodes, allFields],
  );

  // 노드들의 실제 domain_data 키 목록
  const availableDataFields = useMemo(() => {
    const keys = new Set<string>();
    for (const n of filteredNodes) {
      if (n.domain_data && typeof n.domain_data === 'object') {
        for (const k of Object.keys(n.domain_data)) {
          keys.add(k);
        }
      }
    }
    return Array.from(keys).sort().map(k => ({ value: k, label: k }));
  }, [filteredNodes]);

  // 존재하는 도메인만 필터에 표시
  const availableDomainOptions = useMemo(() => {
    const domains = new Set(nodes.map(n => n.domain).filter(Boolean));
    return DOMAIN_OPTIONS.filter(d => domains.has(d.value));
  }, [nodes]);

  const handleSave = async () => {
    if (!name.trim() || !viewType) return;
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        view_type: viewType,
        icon: icon || null,
        description: description || null,
        filter_config: Object.keys(filterConfig).length > 0 ? filterConfig : null,
        layout_config: Object.keys(layoutConfig).length > 0 ? layoutConfig : null,
        schema_map: Object.keys(schemaMap).length > 0 ? schemaMap : null,
        visibility,
        is_default: isDefault,
      };

      if (editingView) {
        // 업데이트
        const res = await fetch('/api/views', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingView.id, ...payload }),
        });
        if (!res.ok) throw new Error('Update failed');
      } else {
        // 새로 생성
        const res = await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: payload.name,
            viewType: payload.view_type,
            filterConfig: payload.filter_config,
          }),
        });
        if (!res.ok) throw new Error('Create failed');

        // 생성 후 추가 필드 업데이트 (icon, description, schema_map 등)
        const { view } = await res.json();
        if (view?.id) {
          await fetch('/api/views', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: view.id, ...payload }),
          });
        }
      }

      onSaved();
      close();
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingView) return;
    const res = await fetch(`/api/views?id=${editingView.id}`, { method: 'DELETE' });
    if (res.ok) {
      onSaved();
      close();
    }
  };

  return (
    <Drawer
      opened={isOpen}
      onClose={close}
      position="right"
      size="85%"
      withCloseButton={false}
      styles={{
        body: { height: '100%', padding: 0, display: 'flex', flexDirection: 'column' },
        content: { background: 'var(--mantine-color-body)' },
      }}
    >
      {/* 상단 헤더 */}
      <Group justify="space-between" px="lg" py="sm" style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
        <Text fw={600}>
          {editingView ? `편집: ${editingView.name}` : '새 뷰 만들기'}
        </Text>
        <Group gap="sm">
          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<FloppyDisk size={14} />}
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim() || !viewType}
          >
            저장
          </Button>
          <ActionIcon variant="subtle" color="gray" onClick={close}>
            <X size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {/* 본문: 좌측 설정 + 우측 미리보기 */}
      <Box style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 좌측: 설정 (40%) */}
        <ScrollArea style={{ width: '40%', borderRight: '0.5px solid var(--mantine-color-default-border)' }}>
          <Stack gap="lg" p="lg">
            {/* 기본 정보 */}
            <Stack gap="xs">
              <Text fz="xs" fw={600} c="dimmed" tt="uppercase">기본</Text>
              <Group gap="sm" align="flex-end">
                <TextInput
                  label="아이콘"
                  placeholder="📅"
                  value={icon}
                  onChange={e => setField('icon', e.target.value)}
                  style={{ width: 70 }}
                  size="xs"
                />
                <TextInput
                  label="이름"
                  placeholder="뷰 이름"
                  value={name}
                  onChange={e => setField('name', e.target.value)}
                  style={{ flex: 1 }}
                  size="xs"
                />
              </Group>
              <Textarea
                label="설명"
                placeholder="이 뷰의 용도를 간단히"
                value={description}
                onChange={e => setField('description', e.target.value)}
                minRows={2}
                size="xs"
              />
            </Stack>

            <Divider />

            {/* 뷰 타입 선택 */}
            <Stack gap="xs">
              <Text fz="xs" fw={600} c="dimmed" tt="uppercase">뷰 타입</Text>
              <SimpleGrid cols={3} spacing={6}>
                {VIEW_SCHEMA_HINTS.map(hint => {
                  const Icon = VIEW_TYPE_ICONS[hint.viewType];
                  const isSelected = viewType === hint.viewType;
                  return (
                    <Box
                      key={hint.viewType}
                      onClick={() => setField('viewType', hint.viewType)}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 8,
                        border: `1px solid ${isSelected ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-default-border)'}`,
                        background: isSelected ? 'var(--mantine-color-dark-6)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {Icon && <Icon size={18} weight={isSelected ? 'fill' : 'light'} />}
                      <Text fz={10} mt={2} lineClamp={1}>{hint.label}</Text>
                    </Box>
                  );
                })}
              </SimpleGrid>
              {currentHint && (
                <Text fz="xs" c="dimmed">{currentHint.description}</Text>
              )}
            </Stack>

            <Divider />

            {/* 데이터 필터 */}
            <Stack gap="xs">
              <Text fz="xs" fw={600} c="dimmed" tt="uppercase">데이터 필터</Text>
              <Select
                label="도메인"
                placeholder="전체"
                data={availableDomainOptions.length > 0 ? availableDomainOptions : DOMAIN_OPTIONS}
                value={(filterConfig.domain as string) ?? null}
                onChange={v => v ? setFilterField('domain', v) : removeFilterField('domain')}
                clearable
                size="xs"
              />
            </Stack>

            <Divider />

            {/* 스키마 매핑 */}
            {currentHint && allFields.length > 0 && (
              <Stack gap="xs">
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase">스키마 매핑</Text>
                <Text fz="xs" c="dimmed">뷰가 기대하는 필드를 실제 데이터 필드에 연결</Text>
                {allFields.map(field => (
                  <Group key={field} gap="xs" align="flex-end">
                    <Text fz="xs" w={80} style={{ flexShrink: 0 }}>
                      {field}
                      {currentHint.requiredFields.includes(field) && (
                        <Text span c="red" fz="xs"> *</Text>
                      )}
                    </Text>
                    <Select
                      placeholder="선택"
                      data={availableDataFields}
                      value={schemaMap[field] ?? null}
                      onChange={v => v ? setSchemaField(field, v) : removeSchemaField(field)}
                      clearable
                      size="xs"
                      style={{ flex: 1 }}
                    />
                  </Group>
                ))}
              </Stack>
            )}

            <Divider />

            {/* 디자인 에디터 */}
            <LayoutDesignPanel viewType={viewType} />

            <Divider />

            {/* 공개 설정 */}
            <Stack gap="xs">
              <Text fz="xs" fw={600} c="dimmed" tt="uppercase">공개</Text>
              <SegmentedControl
                data={[
                  { value: 'private', label: '비공개' },
                  { value: 'link', label: '링크' },
                  { value: 'public', label: '공개' },
                ]}
                value={visibility}
                onChange={v => setField('visibility', v as 'private' | 'link' | 'public')}
                size="xs"
                color="gray"
              />
            </Stack>

            {/* 삭제 */}
            {editingView && (
              <>
                <Divider />
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<Trash size={14} />}
                  onClick={handleDelete}
                >
                  이 뷰 삭제
                </Button>
              </>
            )}
          </Stack>
        </ScrollArea>

        {/* 우측: 미리보기 (60%) */}
        <Box style={{ width: '60%', display: 'flex', flexDirection: 'column' }}>
          <Box px="lg" py="sm" style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
            <Text fz="xs" fw={600} c="dimmed" tt="uppercase">미리보기</Text>
          </Box>

          <ScrollArea style={{ flex: 1 }} p="md">
            {viewType && filteredNodes.length > 0 ? (
              <Box style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}>
                <ViewRenderer
                  viewType={viewType}
                  nodes={filteredNodes}
                  filters={filterConfig}
                  layoutConfig={layoutConfig as LayoutConfig}
                />
              </Box>
            ) : (
              <Stack align="center" justify="center" h="100%" gap="sm">
                <Text fz="sm" c="dimmed" ta="center">
                  {!viewType ? '뷰 타입을 선택하면 미리보기가 표시됩니다' : '표시할 데이터가 없습니다'}
                </Text>
              </Stack>
            )}

            {/* 스키마 적합도 */}
            {currentHint && Object.keys(fieldCoverage).length > 0 && (
              <Box mt="md">
                <Text fz="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">스키마 적합도</Text>
                <Stack gap={4}>
                  {allFields.map(field => {
                    const pct = fieldCoverage[field] ?? 0;
                    const isReq = currentHint.requiredFields.includes(field);
                    return (
                      <Group key={field} gap="xs">
                        <Text fz="xs" c={pct > 0 ? undefined : 'dimmed'} w={80}>
                          {pct > 0 ? '✓' : '○'} {field}
                        </Text>
                        <Box
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            background: 'var(--mantine-color-dark-6)',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'var(--mantine-color-gray-5)',
                              borderRadius: 2,
                            }}
                          />
                        </Box>
                        <Text fz="xs" c="dimmed" w={40} ta="right">{pct}%</Text>
                      </Group>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </ScrollArea>
        </Box>
      </Box>
    </Drawer>
  );
}

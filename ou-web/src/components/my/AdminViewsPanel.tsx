'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Box, Group, Text, Badge, ActionIcon, Tooltip, Select,
  Button, Stack, ScrollArea, Menu, Loader,
} from '@mantine/core';
import {
  Plus, PencilSimple, Trash, DotsThree, X, Sparkle,
} from '@phosphor-icons/react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import type { SavedViewRow } from '@/types/admin';

interface AdminViewsPanelProps {
  views: SavedViewRow[];
  onClose: () => void;
  onViewsChange: (views: SavedViewRow[]) => void;
}

const VIEW_TYPE_LABELS: Record<string, string> = {
  calendar: '캘린더',
  task: '보드',
  knowledge_graph: '그래프',
  chart: '차트',
  mindmap: '마인드맵',
  heatmap: '히트맵',
  journal: '일기',
  timeline: '타임라인',
  flashcard: '플래시카드',
  dictionary: '사전',
  document: '문서',
  table: '표',
  export: '내보내기',
  custom: '커스텀',
};

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  habit: '습관',
  knowledge: '지식',
  idea: '아이디어',
  relation: '관계',
  emotion: '감정',
  finance: '가계',
  product: '상품',
  broadcast: '방송',
  education: '교육',
  media: '미디어',
  location: '장소',
};

export function AdminViewsPanel({ views, onClose, onViewsChange }: AdminViewsPanelProps) {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [visFilter, setVisFilter] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openEditor = useViewEditorStore(s => s.open);

  // 존재하는 타입/도메인만 필터에 표시 (빈 필터 원칙)
  const availableTypes = useMemo(() => {
    const types = new Set(views.map(v => v.view_type));
    return Array.from(types)
      .map(t => ({ value: t, label: VIEW_TYPE_LABELS[t] ?? t }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [views]);

  const availableDomains = useMemo(() => {
    const domains = new Set<string>();
    for (const v of views) {
      const d = (v.filter_config as any)?.domain;
      if (d) domains.add(d);
    }
    return Array.from(domains)
      .map(d => ({ value: d, label: DOMAIN_LABELS[d] ?? d }));
  }, [views]);

  const filteredViews = useMemo(() => {
    return views
      .filter(v => !typeFilter || v.view_type === typeFilter)
      .filter(v => !domainFilter || (v.filter_config as any)?.domain === domainFilter)
      .filter(v => !visFilter || v.visibility === visFilter)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [views, typeFilter, domainFilter, visFilter]);

  const hasDefaults = views.some(v => v.is_default);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/views/defaults', { method: 'POST' });
      if (res.ok) {
        // 뷰 목록 새로고침
        const listRes = await fetch('/api/views');
        if (listRes.ok) {
          const { views: freshViews } = await listRes.json();
          onViewsChange(freshViews);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/views?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        onViewsChange(views.filter(v => v.id !== id));
      }
    } catch {
      // Silent fail
    }
    setDeleteId(null);
  };

  return (
    <Box
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        background: 'rgba(6, 8, 16, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
      }}
    >
      {/* 헤더 */}
      <Group justify="space-between" mb="lg">
        <Text fw={600} fz="lg">데이터뷰 관리</Text>
        <Group gap="sm">
          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<Plus size={14} />}
            onClick={() => openEditor()}
          >
            새 뷰
          </Button>
          <ActionIcon variant="subtle" color="gray" onClick={onClose}>
            <X size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {/* 필터 */}
      <Group gap="sm" mb="md">
        {availableTypes.length > 1 && (
          <Select
            placeholder="전체 타입"
            data={availableTypes}
            value={typeFilter}
            onChange={setTypeFilter}
            clearable
            size="xs"
            style={{ width: 130 }}
          />
        )}
        {availableDomains.length > 1 && (
          <Select
            placeholder="전체 도메인"
            data={availableDomains}
            value={domainFilter}
            onChange={setDomainFilter}
            clearable
            size="xs"
            style={{ width: 130 }}
          />
        )}
        <Select
          placeholder="공개 상태"
          data={[
            { value: 'private', label: '비공개' },
            { value: 'link', label: '링크' },
            { value: 'public', label: '공개' },
          ]}
          value={visFilter}
          onChange={setVisFilter}
          clearable
          size="xs"
          style={{ width: 110 }}
        />
        <Text fz="xs" c="dimmed">{filteredViews.length}개</Text>
      </Group>

      {/* 뷰 목록 */}
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap={2}>
          {filteredViews.map(view => (
            <GlassCard
              key={view.id}
              px="md"
              py="sm"
              style={{ cursor: 'pointer' }}
              onClick={() => openEditor(view)}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <Text fz="md">{view.icon || '◆'}</Text>
                  <Box style={{ minWidth: 0 }}>
                    <Text fz="sm" fw={500} lineClamp={1}>{view.name}</Text>
                    {view.description && (
                      <Text fz="xs" c="dimmed" lineClamp={1}>{view.description}</Text>
                    )}
                  </Box>
                </Group>
                <Group gap={6} wrap="nowrap">
                  <Badge variant="light" color="gray" size="xs">
                    {VIEW_TYPE_LABELS[view.view_type] ?? view.view_type}
                  </Badge>
                  {(view.filter_config as any)?.domain && (
                    <Badge variant="outline" color="gray" size="xs">
                      {DOMAIN_LABELS[(view.filter_config as any).domain] ?? (view.filter_config as any).domain}
                    </Badge>
                  )}
                  <Badge
                    variant="dot"
                    color={view.visibility === 'public' ? 'gray' : 'dark'}
                    size="xs"
                  >
                    {view.visibility === 'public' ? '공개' : view.visibility === 'link' ? '링크' : '비공개'}
                  </Badge>
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={e => e.stopPropagation()}
                      >
                        <DotsThree size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<PencilSimple size={14} />}
                        onClick={e => { e.stopPropagation(); openEditor(view); }}
                      >
                        편집
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<Trash size={14} />}
                        color="red"
                        onClick={e => { e.stopPropagation(); handleDelete(view.id); }}
                      >
                        삭제
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </GlassCard>
          ))}
        </Stack>

        {filteredViews.length === 0 && (
          <Stack align="center" gap="md" py="xl">
            <Text fz="sm" c="dimmed">
              {views.length === 0 ? '아직 뷰가 없습니다' : '조건에 맞는 뷰가 없습니다'}
            </Text>
            {!hasDefaults && (
              <Button
                variant="light"
                color="gray"
                leftSection={seeding ? <Loader size={14} /> : <Sparkle size={14} />}
                onClick={handleSeedDefaults}
                loading={seeding}
              >
                기본 뷰 생성하기
              </Button>
            )}
          </Stack>
        )}
      </ScrollArea>

      {/* 하단: 기본 뷰 없을 때 시드 버튼 */}
      {views.length > 0 && !hasDefaults && (
        <Group justify="center" mt="md">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<Sparkle size={14} />}
            onClick={handleSeedDefaults}
            loading={seeding}
          >
            기본 뷰 추가하기
          </Button>
        </Group>
      )}
    </Box>
  );
}

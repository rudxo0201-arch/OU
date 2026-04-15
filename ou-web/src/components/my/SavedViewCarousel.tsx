'use client';

import { useState } from 'react';
import {
  Group, Text, ScrollArea, Menu, Modal, TextInput, Button, Stack,
} from '@mantine/core';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { useNavigationStore } from '@/stores/navigationStore';

interface SavedView {
  id: string;
  name: string;
  icon?: string;
  view_type?: string;
  filter_config?: Record<string, any>;
  layout_config?: Record<string, any>;
}

interface SavedViewCarouselProps {
  views: SavedView[];
  nodes?: any[];
}

export function SavedViewCarousel({ views: initialViews, nodes = [] }: SavedViewCarouselProps) {
  const router = useRouter();
  const { removeSavedView, renameSavedView } = useNavigationStore();
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const [views, setViews] = useState(initialViews);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleRename = async () => {
    if (!renameId || !renameValue.trim()) return;

    try {
      const res = await fetch('/api/views', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: renameId, name: renameValue.trim() }),
      });

      if (res.ok) {
        setViews(prev => prev.map(v =>
          v.id === renameId ? { ...v, name: renameValue.trim() } : v
        ));
        renameSavedView(renameId, renameValue.trim());
      }
    } catch {
      // Silent fail
    }

    setRenameId(null);
    setRenameValue('');
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/views?id=${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setViews(prev => prev.filter(v => v.id !== deleteId));
        removeSavedView(deleteId);
      }
    } catch {
      // Silent fail
    }

    setDeleteId(null);
  };

  if (views.length === 0) return null;

  const viewToDelete = views.find(v => v.id === deleteId);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <ScrollArea type="never">
          <Group gap="sm" wrap="nowrap">
            {views.map(view => (
              <Menu key={view.id} position="top-start" withinPortal>
                <Menu.Target>
                  <GlassCard
                    px="md"
                    py="sm"
                    style={{
                      cursor: 'pointer',
                      flexShrink: 0,
                      minWidth: 140,
                      transition: 'background 150ms',
                    }}
                    onClick={() => setActiveView(view)}
                  >
                    <Group gap="xs" wrap="nowrap">
                      <Text fz={16}>{view.icon ?? '◆'}</Text>
                      <div>
                        <Text fz="xs" fw={500} style={{ whiteSpace: 'nowrap' }}>
                          {view.name}
                        </Text>
                        <Text fz={10} c="dimmed">{view.view_type}</Text>
                      </div>
                    </Group>
                  </GlassCard>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<PencilSimple size={14} />}
                    onClick={() => {
                      setRenameId(view.id);
                      setRenameValue(view.name);
                    }}
                  >
                    이름 변경
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<Trash size={14} />}
                    color="red"
                    onClick={() => setDeleteId(view.id)}
                  >
                    삭제
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ))}
          </Group>
        </ScrollArea>
      </div>

      {/* Rename Modal */}
      <Modal
        opened={!!renameId}
        onClose={() => { setRenameId(null); setRenameValue(''); }}
        title={<Text fw={600}>이름 변경</Text>}
        centered
        size="xs"
      >
        <Stack gap="md">
          <TextInput
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            placeholder="새 이름"
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
            }}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setRenameId(null)}>
              취소
            </Button>
            <Button color="gray" onClick={handleRename} disabled={!renameValue.trim()}>
              변경
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={<Text fw={600}>뷰 삭제</Text>}
        centered
        size="xs"
      >
        <Stack gap="md">
          <Text fz="sm">
            <Text span fw={600}>{viewToDelete?.name}</Text> 뷰를 삭제하시겠어요?
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setDeleteId(null)}>
              취소
            </Button>
            <Button color="gray" onClick={handleDelete}>
              삭제
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Saved View Rendering Modal */}
      <Modal
        opened={!!activeView}
        onClose={() => setActiveView(null)}
        title={<Text fw={600}>{activeView?.icon ?? '◆'} {activeView?.name}</Text>}
        centered
        size="xl"
        styles={{
          body: { padding: 0, maxHeight: '70vh', overflow: 'auto' },
        }}
      >
        {activeView && (() => {
          const filters = activeView.filter_config ?? {};
          const filtered = nodes.filter(node => {
            if (filters.domain && node.domain !== filters.domain) return false;
            if (filters.dateFrom) {
              const from = new Date(filters.dateFrom);
              if (new Date(node.created_at) < from) return false;
            }
            if (filters.dateTo) {
              const to = new Date(filters.dateTo);
              if (new Date(node.created_at) > to) return false;
            }
            if (filters.importance != null && (node.importance ?? 0) < filters.importance) return false;
            if (filters.tags && Array.isArray(filters.tags)) {
              const nodeTags: string[] = node.domain_data?.tags ?? [];
              if (!filters.tags.some((t: string) => nodeTags.includes(t))) return false;
            }
            return true;
          });

          return (
            <ViewRenderer
              viewType={activeView.view_type ?? 'document'}
              nodes={filtered}
              filters={filters}
              layoutConfig={activeView.layout_config}
            />
          );
        })()}
      </Modal>
    </>
  );
}

'use client';

import { useState } from 'react';
import {
  Group, Text, ScrollArea, Menu, Modal, TextInput, Button, Stack,
} from '@mantine/core';
import { PencilSimple, Trash, ShareNetwork } from '@phosphor-icons/react';
import { notifications } from '@mantine/notifications';
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
                  <div
                    style={{
                      cursor: 'pointer',
                      flexShrink: 0,
                      minWidth: 140,
                      padding: '10px 14px',
                      background: 'transparent',
                      border: '0.5px solid var(--ou-border-subtle)',
                      borderRadius: 'var(--ou-radius-card)',
                      boxShadow: 'var(--ou-glow-sm)',
                      transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
                    }}
                    onClick={() => setActiveView(view)}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
                    }}
                  >
                    <Group gap="xs" wrap="nowrap">
                      {/* orb-block.sm style icon */}
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: '0.5px solid var(--ou-border-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        flexShrink: 0,
                        boxShadow: 'var(--ou-glow-xs)',
                      }}>
                        {view.icon ?? '◆'}
                      </div>
                      <div>
                        <Text
                          fz={13}
                          fw={500}
                          style={{ whiteSpace: 'nowrap', color: 'var(--ou-text-strong)' }}
                        >
                          {view.name}
                        </Text>
                        {/* badge-block style domain */}
                        {view.view_type && (
                          <Text
                            fz={10}
                            style={{
                              color: 'var(--ou-text-dimmed)',
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: 'var(--ou-radius-pill)',
                              border: '0.5px solid var(--ou-border-faint)',
                              marginTop: 2,
                            }}
                          >
                            {view.view_type}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </div>
                </Menu.Target>
                <Menu.Dropdown
                  style={{
                    background: 'var(--ou-surface-muted)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    boxShadow: 'var(--ou-glow-md)',
                    borderRadius: 'var(--ou-radius-md)',
                  }}
                >
                  <Menu.Item
                    leftSection={<ShareNetwork size={14} />}
                    onClick={() => {
                      const url = `${window.location.origin}/view/${view.id}`;
                      navigator.clipboard.writeText(url).then(() => {
                        notifications.show({
                          message: '복사됨!',
                          color: 'gray',
                          autoClose: 2000,
                        });
                      }).catch(() => {
                        // Silent fail
                      });
                    }}
                  >
                    링크 복사
                  </Menu.Item>
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

      {/* Rename Modal — glass-block */}
      <Modal
        opened={!!renameId}
        onClose={() => { setRenameId(null); setRenameValue(''); }}
        title={<Text fw={600} style={{ color: 'var(--ou-text-strong)' }}>이름 변경</Text>}
        centered
        size="xs"
        styles={{
          content: {
            background: 'var(--ou-surface-muted)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '0.5px solid var(--ou-border-subtle)',
            boxShadow: 'var(--ou-glow-lg)',
            borderRadius: 'var(--ou-radius-card)',
          },
          header: {
            background: 'transparent',
          },
          body: {
            background: 'transparent',
          },
        }}
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
            styles={{
              input: {
                background: 'transparent',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                color: 'var(--ou-text-body)',
              },
            }}
          />
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setRenameId(null)}
              style={{
                borderRadius: 'var(--ou-radius-pill)',
              }}
            >
              취소
            </Button>
            <Button
              color="gray"
              onClick={handleRename}
              disabled={!renameValue.trim()}
              style={{
                borderRadius: 'var(--ou-radius-pill)',
                border: '0.5px solid var(--ou-border-subtle)',
              }}
            >
              변경
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal — glass-block */}
      <Modal
        opened={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={<Text fw={600} style={{ color: 'var(--ou-text-strong)' }}>뷰 삭제</Text>}
        centered
        size="xs"
        styles={{
          content: {
            background: 'var(--ou-surface-muted)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '0.5px solid var(--ou-border-subtle)',
            boxShadow: 'var(--ou-glow-lg)',
            borderRadius: 'var(--ou-radius-card)',
          },
          header: {
            background: 'transparent',
          },
          body: {
            background: 'transparent',
          },
        }}
      >
        <Stack gap="md">
          <Text fz="sm" style={{ color: 'var(--ou-text-body)' }}>
            <Text span fw={600} style={{ color: 'var(--ou-text-strong)' }}>{viewToDelete?.name}</Text> 뷰를 삭제하시겠어요?
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setDeleteId(null)}
              style={{ borderRadius: 'var(--ou-radius-pill)' }}
            >
              취소
            </Button>
            <Button
              color="gray"
              onClick={handleDelete}
              style={{
                borderRadius: 'var(--ou-radius-pill)',
                border: '0.5px solid var(--ou-border-subtle)',
              }}
            >
              삭제
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Saved View Rendering Modal — glass-block */}
      <Modal
        opened={!!activeView}
        onClose={() => setActiveView(null)}
        title={<Text fw={600} style={{ color: 'var(--ou-text-strong)' }}>{activeView?.icon ?? '◆'} {activeView?.name}</Text>}
        centered
        size="xl"
        styles={{
          content: {
            background: 'var(--ou-surface-muted)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '0.5px solid var(--ou-border-subtle)',
            boxShadow: 'var(--ou-glow-lg)',
            borderRadius: 'var(--ou-radius-card)',
          },
          header: {
            background: 'transparent',
          },
          body: { padding: 0, maxHeight: '70vh', overflow: 'auto', background: 'transparent' },
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

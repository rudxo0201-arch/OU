'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Group, ActionIcon, Tooltip, Text, ScrollArea, Badge,
  Menu, TextInput, Modal, Button, Stack,
} from '@mantine/core';
import {
  Plus, MagnifyingGlass, DotsThree, PencilSimple, Trash, X,
  SlidersHorizontal,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { CreateViewModal } from './CreateViewModal';
import { useNavigationStore } from '@/stores/navigationStore';

interface SavedView {
  id: string;
  name: string;
  icon?: string;
  view_type?: string;
}

interface FloatingToolbarProps {
  savedViews: SavedView[];
  onViewClick?: (viewId: string) => void;
  onSearchChange?: (query: string) => void;
  isAdmin?: boolean;
  onAdminModeToggle?: () => void;
}

export function FloatingToolbar({ savedViews: initialViews, onViewClick, onSearchChange, isAdmin, onAdminModeToggle }: FloatingToolbarProps) {
  const router = useRouter();
  const { addSavedView, removeSavedView, renameSavedView } = useNavigationStore();
  const [views, setViews] = useState(initialViews);
  const [createOpened, setCreateOpened] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search callback (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange?.(searchText);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, onSearchChange]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const handleCreated = useCallback((view: { id: string; name: string; viewType: string }) => {
    const newView: SavedView = { id: view.id, name: view.name, view_type: view.viewType };
    setViews(prev => [newView, ...prev]);
    addSavedView({ id: view.id, name: view.name, viewType: view.viewType });
  }, [addSavedView]);

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

  const viewToDelete = views.find(v => v.id === deleteId);

  return (
    <>
      <GlassCard
        px="md"
        py={8}
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          maxWidth: 'calc(100% - 32px)',
        }}
      >
        <Group gap="sm" wrap="nowrap" className="floating-toolbar-inner">
          {views.length > 0 && (
            <ScrollArea type="never" style={{ maxWidth: 400 }}>
              <Group gap={6} wrap="nowrap">
                {views.map(view => (
                  <Menu key={view.id} position="bottom-start" withinPortal>
                    <Menu.Target>
                      <Badge
                        variant="light"
                        color="gray"
                        size="lg"
                        style={{ cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => onViewClick?.(view.id)}
                        onContextMenu={e => {
                          e.preventDefault();
                          // Context menu opens via Mantine Menu
                        }}
                      >
                        {view.icon ?? '◆'} {view.name}
                      </Badge>
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
          )}

          {views.length === 0 && (
            <Text fz="xs" c="dimmed">내 우주</Text>
          )}

          <Group gap={4} ml="auto" wrap="nowrap">
            {isAdmin && (
              <Tooltip label="데이터뷰 관리">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={onAdminModeToggle}
                >
                  <SlidersHorizontal size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {searchOpen ? (
              <Group gap={4} wrap="nowrap">
                <TextInput
                  ref={searchInputRef}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="검색..."
                  size="xs"
                  styles={{
                    input: {
                      width: 160,
                      background: 'transparent',
                      border: '0.5px solid var(--mantine-color-default-border)',
                    },
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setSearchOpen(false);
                      setSearchText('');
                      onSearchChange?.('');
                    }
                  }}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchText('');
                    onSearchChange?.('');
                  }}
                >
                  <X size={14} />
                </ActionIcon>
              </Group>
            ) : (
              <Tooltip label="검색">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => setSearchOpen(true)}
                >
                  <MagnifyingGlass size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="뷰 만들기">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setCreateOpened(true)}
              >
                <Plus size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </GlassCard>

      {/* Create View Modal */}
      <CreateViewModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        onCreated={handleCreated}
      />

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
    </>
  );
}

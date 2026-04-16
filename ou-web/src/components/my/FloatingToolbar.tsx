'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus, MagnifyingGlass, X,
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
        setViews(prev => prev.map(v => v.id === renameId ? { ...v, name: renameValue.trim() } : v));
        renameSavedView(renameId, renameValue.trim());
      }
    } catch { /* Silent fail */ }
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
    } catch { /* Silent fail */ }
    setDeleteId(null);
  };

  const viewToDelete = views.find(v => v.id === deleteId);
  const btnStyle: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--mantine-color-gray-6)' };

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
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }} className="floating-toolbar-inner">
          {views.length > 0 && (
            <div style={{ maxWidth: 400, overflow: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'nowrap' }}>
                {views.map(view => (
                  <span
                    key={view.id}
                    onClick={() => onViewClick?.(view.id)}
                    style={{
                      fontSize: 'var(--mantine-font-size-sm)',
                      padding: '4px 12px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.08)',
                      color: 'var(--mantine-color-dimmed)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {view.icon ?? '\u25C6'} {view.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {views.length === 0 && (
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>내 우주</span>
          )}

          <div style={{ display: 'flex', flexDirection: 'row', gap: 4, marginLeft: 'auto', flexWrap: 'nowrap' }}>
            {isAdmin && (
              <button title="데이터뷰 관리" onClick={onAdminModeToggle} style={btnStyle}>
                <SlidersHorizontal size={16} />
              </button>
            )}
            {searchOpen ? (
              <div style={{ display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <input
                  ref={searchInputRef}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="검색..."
                  style={{ width: 160, padding: '4px 8px', fontSize: 'var(--mantine-font-size-xs)', background: 'transparent', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 4, color: 'inherit' }}
                  onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchText(''); onSearchChange?.(''); } }}
                />
                <button onClick={() => { setSearchOpen(false); setSearchText(''); onSearchChange?.(''); }} style={btnStyle}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button title="검색" onClick={() => setSearchOpen(true)} style={btnStyle}>
                <MagnifyingGlass size={16} />
              </button>
            )}
            <button title="뷰 만들기" onClick={() => setCreateOpened(true)} style={btnStyle}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Create View Modal */}
      <CreateViewModal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        onCreated={handleCreated}
      />

      {/* Rename Modal */}
      {renameId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setRenameId(null); setRenameValue(''); }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: 'var(--mantine-color-body)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 320, zIndex: 1 }}>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: 16 }}>이름 변경</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="새 이름" onKeyDown={e => { if (e.key === 'Enter') handleRename(); }} autoFocus style={{ width: '100%', padding: '8px 12px', fontSize: 'var(--mantine-font-size-sm)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'transparent', color: 'inherit' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setRenameId(null)} style={{ padding: '6px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mantine-color-dimmed)' }}>취소</button>
                <button onClick={handleRename} disabled={!renameValue.trim()} style={{ padding: '6px 16px', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: !renameValue.trim() ? 'not-allowed' : 'pointer', opacity: !renameValue.trim() ? 0.5 : 1, color: 'inherit' }}>변경</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleteId(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: 'var(--mantine-color-body)', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 320, zIndex: 1 }}>
            <span style={{ fontWeight: 600, display: 'block', marginBottom: 16 }}>뷰 삭제</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ fontSize: 'var(--mantine-font-size-sm)' }}><strong>{viewToDelete?.name}</strong> 뷰를 삭제하시겠어요?</span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setDeleteId(null)} style={{ padding: '6px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mantine-color-dimmed)' }}>취소</button>
                <button onClick={handleDelete} style={{ padding: '6px 16px', border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', color: 'inherit' }}>삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

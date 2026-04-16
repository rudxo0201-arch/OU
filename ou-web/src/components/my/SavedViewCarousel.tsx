'use client';

import { useState, useRef, useEffect } from 'react';
import { PencilSimple, Trash, ShareNetwork } from '@phosphor-icons/react';
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

  // Context menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [menuOpenId]);

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

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--ou-text-body)',
    fontFamily: 'inherit',
    borderRadius: 4,
    transition: 'background var(--ou-transition)',
  };

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
        <div style={{ overflow: 'auto', scrollbarWidth: 'none' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'nowrap' }}>
            {views.map(view => (
              <div key={view.id} style={{ position: 'relative' }}>
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuOpenId(menuOpenId === view.id ? null : view.id);
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center' }}>
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
                      <span
                        style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', color: 'var(--ou-text-strong)', display: 'block' }}
                      >
                        {view.name}
                      </span>
                      {/* badge-block style domain */}
                      {view.view_type && (
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--ou-text-dimmed)',
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: 'var(--ou-radius-pill)',
                            border: '0.5px solid var(--ou-border-faint)',
                            marginTop: 2,
                          }}
                        >
                          {view.view_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Context menu dropdown */}
                {menuOpenId === view.id && (
                  <div
                    ref={menuRef}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: 4,
                      background: 'var(--ou-surface-muted)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '0.5px solid var(--ou-border-subtle)',
                      boxShadow: 'var(--ou-glow-md)',
                      borderRadius: 'var(--ou-radius-md)',
                      padding: 4,
                      zIndex: 100,
                      minWidth: 140,
                    }}
                  >
                    <button
                      style={menuItemStyle}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        const url = `${window.location.origin}/view/${view.id}`;
                        navigator.clipboard.writeText(url).then(() => {
                          alert('복사됨!');
                        }).catch(() => {});
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ou-surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <ShareNetwork size={14} />
                      링크 복사
                    </button>
                    <button
                      style={menuItemStyle}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setRenameId(view.id);
                        setRenameValue(view.name);
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ou-surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <PencilSimple size={14} />
                      이름 변경
                    </button>
                    <button
                      style={{ ...menuItemStyle, color: 'var(--ou-text-dimmed)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        setDeleteId(view.id);
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ou-surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Trash size={14} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rename Modal — glass-block */}
      {renameId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) { setRenameId(null); setRenameValue(''); }
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 360,
              background: 'var(--ou-surface-muted)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '0.5px solid var(--ou-border-subtle)',
              boxShadow: 'var(--ou-glow-lg)',
              borderRadius: 'var(--ou-radius-card)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>이름 변경</span>
              <button onClick={() => { setRenameId(null); setRenameValue(''); }} style={{ background: 'none', border: 'none', color: 'var(--ou-text-dimmed)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                placeholder="새 이름"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename();
                }}
                autoFocus
                style={{
                  background: 'transparent',
                  border: '0.5px solid var(--ou-border-subtle)',
                  borderRadius: 'var(--ou-radius-pill)',
                  color: 'var(--ou-text-body)',
                  padding: '8px 14px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setRenameId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderRadius: 'var(--ou-radius-pill)',
                    color: 'var(--ou-text-dimmed)',
                    padding: '6px 14px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleRename}
                  disabled={!renameValue.trim()}
                  style={{
                    borderRadius: 'var(--ou-radius-pill)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    background: 'var(--ou-surface-hover)',
                    color: 'var(--ou-text-body)',
                    padding: '6px 14px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: !renameValue.trim() ? 'not-allowed' : 'pointer',
                    opacity: !renameValue.trim() ? 0.4 : 1,
                  }}
                >
                  변경
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal — glass-block */}
      {deleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setDeleteId(null);
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 360,
              background: 'var(--ou-surface-muted)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '0.5px solid var(--ou-border-subtle)',
              boxShadow: 'var(--ou-glow-lg)',
              borderRadius: 'var(--ou-radius-card)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>뷰 삭제</span>
              <button onClick={() => setDeleteId(null)} style={{ background: 'none', border: 'none', color: 'var(--ou-text-dimmed)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ fontSize: 14, color: 'var(--ou-text-body)' }}>
                <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>{viewToDelete?.name}</span> 뷰를 삭제하시겠어요?
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setDeleteId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderRadius: 'var(--ou-radius-pill)',
                    color: 'var(--ou-text-dimmed)',
                    padding: '6px 14px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    borderRadius: 'var(--ou-radius-pill)',
                    border: '0.5px solid var(--ou-border-subtle)',
                    background: 'var(--ou-surface-hover)',
                    color: 'var(--ou-text-body)',
                    padding: '6px 14px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved View Rendering Modal — glass-block */}
      {activeView && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setActiveView(null);
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 900,
              maxHeight: '85vh',
              background: 'var(--ou-surface-muted)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '0.5px solid var(--ou-border-subtle)',
              boxShadow: 'var(--ou-glow-lg)',
              borderRadius: 'var(--ou-radius-card)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '0.5px solid var(--ou-border-faint)',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>{activeView.icon ?? '◆'} {activeView.name}</span>
              <button onClick={() => setActiveView(null)} style={{ background: 'none', border: 'none', color: 'var(--ou-text-dimmed)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>&times;</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', maxHeight: '70vh' }}>
              {(() => {
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}

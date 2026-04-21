'use client';

import { Suspense, useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DockBar } from '@/components/widgets/DockBar';
import { QSDTabs } from '@/components/qsd/QSDTabs';
import { useHomeStore, type GridItem } from '@/stores/homeStore';
import { getAppDef } from '@/lib/apps/registry';
import { resolveAppIcon } from '@/lib/apps/icon-map';

const GRID_COLS = 6;

export default function HomeWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    }>
      <HomePage />
    </Suspense>
  );
}

function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const gridItems = useHomeStore(s => s.gridItems);
  const addToGrid = useHomeStore(s => s.addToGrid);
  const moveOnGrid = useHomeStore(s => s.moveOnGrid);
  const removeFromGrid = useHomeStore(s => s.removeFromGrid);
  const findFreeCell = useHomeStore(s => s.findFreeCell);
  const ensureDefaults = useHomeStore(s => s.ensureDefaults);
  const hydrated = useHomeStore(s => s._hasHydrated);

  // hydration 후 QSD 등 기본 아이템 보장
  useEffect(() => {
    if (hydrated) ensureDefaults();
  }, [hydrated, ensureDefaults]);

  // 드래그 오버 중인 셀
  const [dragOverCell, setDragOverCell] = useState<{ col: number; row: number } | null>(null);
  // 우클릭 컨텍스트 메뉴
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 초대 토큰 처리
  useEffect(() => {
    if (!inviteToken || !user) return;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase
        .from('profile_shares')
        .select('id, shared_fields, sharer_id, used_at')
        .eq('token', inviteToken)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single()
        .then(async ({ data: share }) => {
          if (!share) return;
          const fields = share.shared_fields as Record<string, string>;
          const profileUpdate: Record<string, string> = {};
          if (fields.name) profileUpdate.display_name = fields.name;
          if (Object.keys(profileUpdate).length > 0) {
            await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
          }
          await supabase
            .from('profile_shares')
            .update({ used_by: user.id, used_at: new Date().toISOString() })
            .eq('id', share.id);
          if (share.sharer_id) {
            fetch('/api/profile-card/invite-reward', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sharerId: share.sharer_id, shareId: share.id }),
            }).catch(() => {});
          }
        });
    });
    router.replace('/home');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken, user]);

  // Orb 전체화면 이벤트
  useEffect(() => {
    const orbHandler = () => router.push('/orb/deep-talk');
    window.addEventListener('orb-expand', orbHandler);
    return () => window.removeEventListener('orb-expand', orbHandler);
  }, [router]);

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  // 드롭 시 처리 — grid cell에 item 추가/이동
  const handleDrop = useCallback((e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    setDragOverCell(null);
    const raw = e.dataTransfer.getData('application/ou-app');
    if (!raw) return;
    const { slug, itemId, source } = JSON.parse(raw) as { slug?: string; itemId?: string; source: 'dock' | 'grid' };

    if (source === 'grid' && itemId) {
      // 홈 내 이동
      moveOnGrid(itemId, col, row);
    } else if (source === 'dock' && slug) {
      // 독 → 홈 복사 (동시 존재)
      addToGrid('app', col, row, slug);
    }
  }, [addToGrid, moveOnGrid]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  // 그리드에서 실제 사용하는 행 수 계산
  const maxRow = hydrated ? Math.max(...gridItems.map(i => i.row), 1) : 1;
  const totalRows = maxRow + 2; // 빈 행 하나 여유

  // 그리드 셀 목록 (빈 셀 포함)
  const cells: Array<{ col: number; row: number; item: GridItem | null }> = [];
  const itemMap = new Map<string, GridItem>();
  if (hydrated) {
    gridItems.forEach(item => itemMap.set(`${item.col},${item.row}`, item));
  }
  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const item = itemMap.get(`${col},${row}`) ?? null;
      // QSD는 전체 행 차지 (col=0에 하나만 표시)
      if (item?.type === 'qsd' && col > 0) continue;
      cells.push({ col, row, item });
    }
  }

  return (
    <div
      style={{ position: 'relative', height: '100dvh', overflow: 'hidden', background: 'var(--ou-bg)' }}
      onClick={() => setContextMenu(null)}
    >
      {/* 그리드 영역 */}
      <div style={{
        position: 'absolute',
        top: 32,
        bottom: 120,
        left: 0,
        right: 0,
        overflowY: 'auto',
        padding: '0 32px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gap: 12,
          alignItems: 'start',
        }}>
          {hydrated && cells.map(({ col, row, item }) => {
            const isQSD = item?.type === 'qsd';
            const isDragOver = dragOverCell?.col === col && dragOverCell?.row === row;

            return (
              <div
                key={item ? item.id : `empty-${col}-${row}`}
                style={{
                  gridColumn: isQSD ? `1 / -1` : undefined,
                  minHeight: isQSD ? 'auto' : 80,
                  borderRadius: 12,
                  border: isDragOver && !item
                    ? '2px dashed var(--ou-border-subtle)'
                    : '2px solid transparent',
                  transition: 'border-color 150ms ease',
                  position: 'relative',
                }}
                onDragOver={e => { e.preventDefault(); setDragOverCell({ col, row }); }}
                onDragLeave={() => setDragOverCell(null)}
                onDrop={e => handleDrop(e, col, row)}
              >
                {item?.type === 'qsd' && <QSDWidget />}
                {item?.type === 'app' && item.slug && (
                  <AppIconCell
                    item={item}
                    onNavigate={route => router.push(route)}
                    onContextMenu={(x, y) => setContextMenu({ x, y, itemId: item.id })}
                  />
                )}
                {!item && isDragOver && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 10,
                    background: 'var(--ou-surface)',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DockBar — 하단 */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <DockBar onDropToGrid={(slug) => {
            const cell = findFreeCell();
            if (cell) addToGrid('app', cell.col, cell.row, slug);
          }} />
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 100,
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-lg)',
            borderRadius: 8,
            padding: '4px 0',
            minWidth: 140,
          }}
        >
          <button
            onClick={() => { removeFromGrid(contextMenu.itemId); setContextMenu(null); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px', background: 'none', border: 'none',
              fontSize: 13, color: 'var(--ou-text-body)', cursor: 'pointer',
            }}
          >
            바로가기 삭제
          </button>
        </div>
      )}
    </div>
  );
}

function QSDWidget() {
  return (
    <div style={{ width: '100%' }}>
      <QSDTabs />
    </div>
  );
}

function AppIconCell({
  item,
  onNavigate,
  onContextMenu,
}: {
  item: GridItem;
  onNavigate: (route: string) => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  const app = item.slug ? getAppDef(item.slug) : null;
  const Icon = app ? resolveAppIcon(app.icon) : null;
  const route = app?.route ?? (app ? `/orb/${app.slug}` : '/home');

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/ou-app', JSON.stringify({
      slug: item.slug,
      itemId: item.id,
      source: 'grid',
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e.clientX, e.clientY);
  };

  if (!app) return null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onContextMenu={handleContextMenu}
      onClick={() => onNavigate(route)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '12px 8px', borderRadius: 12,
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-raised-sm)',
        cursor: 'pointer',
        minHeight: 80,
        userSelect: 'none',
        transition: 'box-shadow 150ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--ou-neu-raised-md)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--ou-neu-raised-sm)')}
    >
      {Icon && <Icon size={28} weight="regular" color="var(--ou-text-muted)" />}
      <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)', letterSpacing: '0.3px' }}>
        {app.label.replace('OU ', '')}
      </span>
    </div>
  );
}

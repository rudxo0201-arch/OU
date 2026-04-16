'use client';

import { useMemo, useCallback } from 'react';
import { X, ArrowsOutSimple } from '@phosphor-icons/react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { useNavigationStore, type DashboardLayoutItem } from '@/stores/navigationStore';
import { GlassCard } from './GlassCard';
import 'react-grid-layout/css/styles.css';

interface DashboardGridProps {
  savedViews: any[];
  nodes: any[];
  onViewFullscreen?: (viewId: string) => void;
}

export function DashboardGrid({ savedViews, nodes, onViewFullscreen }: DashboardGridProps) {
  const { dashboardLayout, setDashboardLayout } = useNavigationStore();
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: false });

  const dashboardViews = useMemo(() => {
    if (dashboardLayout.length === 0 && savedViews.length > 0) {
      return savedViews.slice(0, 4);
    }
    return savedViews.filter(v => dashboardLayout.some(l => l.i === v.id));
  }, [savedViews, dashboardLayout]);

  const layouts = useMemo(() => {
    if (dashboardLayout.length > 0) {
      return { lg: dashboardLayout };
    }
    return {
      lg: dashboardViews.map((v, idx) => ({
        i: v.id,
        x: (idx % 2) * 6,
        y: Math.floor(idx / 2) * 4,
        w: 6,
        h: 4,
        minW: 3,
        minH: 2,
      })),
    };
  }, [dashboardLayout, dashboardViews]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback(
    (layout: any) => {
      const items: DashboardLayoutItem[] = Array.from(layout).map((l: any) => ({
        i: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
      }));
      setDashboardLayout(items);
    },
    [setDashboardLayout]
  );

  const handleRemoveView = useCallback(
    (viewId: string) => {
      setDashboardLayout(dashboardLayout.filter(l => l.i !== viewId));
    },
    [dashboardLayout, setDashboardLayout]
  );

  if (dashboardViews.length === 0) {
    return (
      <div
        ref={containerRef as React.Ref<HTMLDivElement>}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 40,
        }}
      >
        <GlassCard style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <span style={{ fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 8 }}>아직 뷰가 없어요</span>
          <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>
            채팅으로 데이터를 추가하면 자동으로 뷰가 만들어집니다.
          </span>
        </GlassCard>
      </div>
    );
  }

  return (
    <div ref={containerRef as React.Ref<HTMLDivElement>} style={{ width: '100%', height: '100%', overflow: 'auto', padding: 16, background: 'var(--ou-glass-bg)', backdropFilter: 'blur(var(--ou-glass-blur))', WebkitBackdropFilter: 'blur(var(--ou-glass-blur))', border: '0.5px solid var(--ou-glass-border)', borderRadius: 16 }}>
      {mounted && (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          margin={[12, 12] as const}
          containerPadding={[0, 0] as const}
          dragConfig={{
            handle: '.dashboard-drag-handle',
          }}
          onLayoutChange={handleLayoutChange}
        >
          {dashboardViews.map(view => (
            <div key={view.id}>
              <GlassCard
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="dashboard-drag-handle"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    cursor: 'grab',
                    borderBottom: '0.5px solid var(--ou-glass-border)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {view.name || view.view_type}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => onViewFullscreen?.(view.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6b7280' }}
                    >
                      <ArrowsOutSimple size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveView(view.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6b7280' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                  <ViewRenderer
                    viewType={view.view_type}
                    nodes={nodes.filter(n => {
                      if (view.filter_config?.domain) {
                        return n.domain === view.filter_config.domain;
                      }
                      return true;
                    })}
                    filters={view.filter_config}
                    layoutConfig={view.layout_config}
                  />
                </div>
              </GlassCard>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { PageLayout } from '@/components/ds';
import { DockBar } from '@/components/home/DockBar';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { ViewPickerPanel } from '@/components/widgets/ViewPickerPanel';
import '@/components/widgets/views/register';

const NAV_HEIGHT  = 56;
const DOCK_HEIGHT = 80;

export default function HomePage() {
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const onModeChange = (e: Event) => {
      const active = (e as CustomEvent).detail?.active ?? false;
      setEditMode(active);
      if (!active) setPickerOpen(false);
    };
    const onAddWidget = () => setPickerOpen(p => !p);

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('qsbar-focus'));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('widget-edit-mode-enter'));
      }
    };

    window.addEventListener('widget-edit-mode-change', onModeChange);
    window.addEventListener('dock-add-widget', onAddWidget);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('widget-edit-mode-change', onModeChange);
      window.removeEventListener('dock-add-widget', onAddWidget);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <PageLayout>
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>

        {/* ── 위젯 그리드 ── */}
        <div style={{
          position: 'absolute',
          top: NAV_HEIGHT, bottom: DOCK_HEIGHT, left: 0, right: 0,
        }}>
          <WidgetGrid />
        </div>

        {/* ── 편집 모드 딤 오버레이 ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.28)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: editMode ? 1 : 0,
          transition: 'opacity 200ms ease',
        }} />

        {/* ── ViewPickerPanel (우측 슬라이드) ── */}
        <ViewPickerPanel open={pickerOpen} onClose={() => setPickerOpen(false)} />

        {/* ── 독바 ── */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: DOCK_HEIGHT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <DockBar />
        </div>

      </div>
    </PageLayout>
  );
}

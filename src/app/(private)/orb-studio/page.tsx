'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useStudioStore } from '@/components/orb-studio/studioStore';

const StudioCanvas = dynamic(
  () => import('@/components/orb-studio/StudioCanvas').then(m => m.StudioCanvas),
  { ssr: false },
);

const DEFAULT_ELEMENTS = [
  { id: 'demo-clock',    type: 'clock',       x: 40,  y: 40,  width: 240, height: 160, minWidth: 120, minHeight: 80,  zIndex: 1 },
  { id: 'demo-streak',  type: 'streak',      x: 300, y: 40,  width: 300, height: 160, minWidth: 160, minHeight: 80,  zIndex: 2 },
  { id: 'demo-memo',    type: 'quick-memo',  x: 40,  y: 220, width: 300, height: 260, minWidth: 160, minHeight: 120, zIndex: 3 },
  { id: 'demo-tasks',   type: 'today-tasks', x: 360, y: 220, width: 360, height: 260, minWidth: 200, minHeight: 120, zIndex: 4 },
];

function StudioInitializer() {
  useEffect(() => {
    const store = useStudioStore.getState();
    if (store.elements.length === 0) {
      store.elements.length === 0 && useStudioStore.setState({ elements: DEFAULT_ELEMENTS });
    }
  }, []);
  return null;
}

export default function OrbStudioPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--ou-bg)' }}>
      <StudioInitializer />
      <StudioCanvas />
    </div>
  );
}

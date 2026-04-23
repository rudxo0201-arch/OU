'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/ds';
import { OrbGrid } from '@/components/home/OrbGrid';
import { DockBar } from '@/components/home/DockBar';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import '@/components/widgets/views/register';

/* ─────────────────────────────────────────────
   OrbGrid height 상수 (DockBar와 맞춤)
   OrbGrid: 약 64px, DockBar: 80px
───────────────────────────────────────────── */
const ORB_ROW_HEIGHT = 64;
const DOCK_HEIGHT = 80;

export default function HomePage() {
  const router = useRouter();

  /* Cmd+K → QSBar 포커스 (위젯 안에 있으므로 커스텀 이벤트로 전달) */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('qsbar-focus'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <PageLayout>
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>

        {/* ── Orb 아이콘 행 ── */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: ORB_ROW_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 24,
          zIndex: 10,
        }}>
          <OrbGrid />
        </div>

        {/* ── 위젯 그리드 ── */}
        <div style={{
          position: 'absolute',
          top: ORB_ROW_HEIGHT,
          bottom: DOCK_HEIGHT,
          left: 0,
          right: 0,
        }}>
          <WidgetGrid />
        </div>

        {/* ── 독바 ── */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: DOCK_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <DockBar />
        </div>

      </div>
    </PageLayout>
  );
}

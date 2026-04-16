'use client';

import {
  Newspaper, ChatCircle, Gear, Sun, Moon,
} from '@phosphor-icons/react';
import { useRouter, usePathname } from 'next/navigation';
import { SystemOrbDock, type SystemOrbItem } from './SystemOrbDock';

interface OUUniverseShellProps {
  children: React.ReactNode;
}

export function OUUniverseShell({ children }: OUUniverseShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Orb Dock = 저장된 뷰 노드 전용 (네비게이션 아이템 아님)
  // 뷰가 없으면 빈 배열 → Dock 안 보임
  const systemOrbs: SystemOrbItem[] = [];

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--ou-space, #060810)',
      }}
    >
      {/* OU 로고 좌상단 */}
      <a
        href="/my"
        style={{
          position: 'fixed', top: 20, left: 24, zIndex: 20,
          fontFamily: "var(--font-orbitron, 'Orbitron'), sans-serif",
          fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.7)',
          textDecoration: 'none', letterSpacing: '2px',
          transition: 'color 150ms',
        }}
        onMouseEnter={(e: any) => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e: any) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
      >
        OU
      </a>

      {/* 다크/라이트 토글 — 우하단 단일 아이콘 */}
      <button
        onClick={() => {
          document.documentElement.setAttribute('data-theme',
            document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
          );
        }}
        title="테마 전환"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.25)', fontSize: 16,
          transition: 'color 150ms',
        }}
        onMouseEnter={(e: any) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
        onMouseLeave={(e: any) => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}
      >
        <Sun size={18} weight="light" />
      </button>

      {/* Main content */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 1, overflowY: 'auto' }}>
        {children}
      </div>

      {/* Left orb dock -- system navigation */}
      <SystemOrbDock side="left" items={systemOrbs} />
    </div>
  );
}

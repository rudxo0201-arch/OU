'use client';

import { useState } from 'react';
import { SidebarSimple } from '@phosphor-icons/react';

interface BaseAppLayoutProps {
  appLabel: string;
  sidebar?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 모든 OU First-Party App의 공통 레이아웃.
 * NoteLayout 패턴: 사이드바 + 헤더(breadcrumb) + 메인
 */
export function BaseAppLayout({ appLabel, sidebar, headerRight, children }: BaseAppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--ou-bg)' }}>

      {/* 사이드바 */}
      {sidebar && (
        <aside style={{
          width: sidebarOpen ? 220 : 0,
          overflow: 'hidden',
          transition: 'width 220ms ease',
          flexShrink: 0,
          borderRight: sidebarOpen ? '1px solid var(--ou-border-faint)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ width: 220, padding: '16px 12px', flex: 1, overflow: 'auto' }}>
            {sidebar}
          </div>
        </aside>
      )}

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* 헤더 */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderBottom: '1px solid var(--ou-border-faint)',
          position: 'sticky',
          top: 0,
          background: 'var(--ou-bg)',
          zIndex: 10,
          flexShrink: 0,
        }}>
          {sidebar && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
              style={{
                display: 'flex', alignItems: 'center',
                padding: 6, border: 'none', borderRadius: 'var(--ou-radius-sm)',
                background: 'transparent', cursor: 'pointer',
                color: 'var(--ou-text-secondary)',
              }}
            >
              <SidebarSimple size={16} />
            </button>
          )}

          <a
            href="/home"
            style={{
              fontSize: 13, color: 'var(--ou-text-secondary)',
              textDecoration: 'none', padding: '2px 6px',
              borderRadius: 'var(--ou-radius-sm)',
            }}
          >
            홈
          </a>

          <span style={{ color: 'var(--ou-text-faint)' }}>/</span>

          <span style={{
            fontSize: 13, fontWeight: 500,
            color: 'var(--ou-text-muted)',
          }}>
            {appLabel}
          </span>

          {/* 우측 컨트롤 (뷰 전환, 필터 등) */}
          {headerRight && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {headerRight}
            </div>
          )}
        </header>

        {/* 콘텐츠 */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

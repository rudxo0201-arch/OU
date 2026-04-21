'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, SidebarSimple } from '@phosphor-icons/react';

interface BaseAppLayoutProps {
  appLabel: string;
  sidebar?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * OU First-Party App 공통 레이아웃.
 * TopNavBar 없는 풀스크린 독립 앱 윈도우.
 * 헤더: ← 홈 + 앱명(크게) + 우측 컨트롤
 */
export function BaseAppLayout({ appLabel, sidebar, headerRight, children }: BaseAppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  return (
    <div style={{
      display: 'flex',
      height: '100dvh',
      background: 'var(--ou-bg)',
      overflow: 'hidden',
    }}>

      {/* 사이드바 */}
      {sidebar && (
        <aside style={{
          width: sidebarOpen ? 248 : 0,
          overflow: 'hidden',
          transition: 'width 220ms ease',
          flexShrink: 0,
          borderRight: sidebarOpen ? '1px solid var(--ou-border-faint)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            width: 248,
            padding: '16px',
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}>
            {sidebar}
          </div>
        </aside>
      )}

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* 앱 헤더 */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          height: 52,
          padding: '0 24px',
          borderBottom: '1px solid var(--ou-border-faint)',
          position: 'sticky',
          top: 0,
          background: 'var(--ou-bg)',
          zIndex: 10,
          flexShrink: 0,
          gap: 12,
        }}>
          {/* 좌측: 사이드바 토글 + 뒤로가기 + 앱명 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {sidebar && (
              <button
                onClick={() => setSidebarOpen(o => !o)}
                title={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32,
                  border: 'none', borderRadius: 8,
                  background: 'transparent', cursor: 'pointer',
                  color: 'var(--ou-text-secondary)',
                  flexShrink: 0,
                }}
              >
                <SidebarSimple size={16} />
              </button>
            )}

            <button
              onClick={() => router.push('/home')}
              title="홈으로"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32,
                border: 'none', borderRadius: 8,
                background: 'transparent', cursor: 'pointer',
                color: 'var(--ou-text-secondary)',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={16} />
            </button>

            <span style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--ou-text-strong)',
              letterSpacing: '-0.01em',
            }}>
              {appLabel}
            </span>
          </div>

          {/* 우측 컨트롤 */}
          {headerRight && (
            <div style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
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

'use client';

import { useNoteStore } from '@/stores/noteStore';
import { NoteSidebar } from './NoteSidebar';
import { SidebarSimple } from '@phosphor-icons/react';

type Props = {
  noteId?: string;
  title?: string;
  children: React.ReactNode;
};

export function NoteLayout({ noteId, title, children }: Props) {
  const { sidebarOpen, setSidebarOpen } = useNoteStore();

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        background: 'var(--ou-bg)',
      }}
    >
      {/* 사이드바 */}
      <NoteSidebar activeNoteId={noteId} />

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 상단 바 */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderBottom: '1px solid var(--ou-border-faint)',
            position: 'sticky',
            top: 0,
            background: 'var(--ou-bg)',
            zIndex: 10,
          }}
        >
          {/* 사이드바 토글 */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 6,
              border: 'none',
              borderRadius: 'var(--ou-radius-sm)',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--ou-text-secondary)',
            }}
          >
            <SidebarSimple size={16} />
          </button>

          <a
            href="/home"
            style={{
              fontSize: 13,
              color: 'var(--ou-text-secondary)',
              textDecoration: 'none',
              padding: '2px 6px',
              borderRadius: 'var(--ou-radius-sm)',
            }}
          >
            홈
          </a>

          {title && (
            <>
              <span style={{ color: 'var(--ou-text-faint)' }}>/</span>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--ou-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </span>
            </>
          )}
        </header>

        {/* 페이지 콘텐츠 */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

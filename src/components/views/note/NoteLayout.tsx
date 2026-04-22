'use client';

import dynamic from 'next/dynamic';
import { useNoteStore } from '@/stores/noteStore';
import { NoteSidebar } from './NoteSidebar';

const PanelWorkspace = dynamic(
  () => import('./panels/PanelWorkspace').then(m => m.PanelWorkspace),
  { ssr: false },
);

type Props = {
  noteId?: string;
  title?: string;
  /** children을 넘기면 PanelWorkspace 대신 렌더 (graph 페이지 등 특수 케이스) */
  children?: React.ReactNode;
};

/**
 * Note 앱 레이아웃.
 * children이 없으면 PanelWorkspace(다중 패널 워크스페이스)를 렌더.
 */
export function NoteLayout({ noteId, children }: Props) {
  const { sidebarOpen } = useNoteStore();

  return (
    <div style={{
      display: 'flex',
      height: '100dvh',
      overflow: 'hidden',
      background: 'var(--ou-space)',
    }}>
      <NoteSidebar activeNoteId={noteId} />

      <main style={{
        flex: 1,
        overflow: 'hidden',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: sidebarOpen ? '1px solid var(--ou-glass-border)' : 'none',
      }}>
        {children ?? <PanelWorkspace noteId={noteId} />}
      </main>
    </div>
  );
}

'use client';

import { ArrowClockwise, Globe, ArrowSquareOut } from '@phosphor-icons/react';
import { useRef } from 'react';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

/**
 * WebContainer 라이브 프리뷰
 * dev server가 시작되면 자동으로 URL 감지하여 iframe에 표시
 */
export function PreviewPanel() {
  const { previewUrl, webcontainerStatus } = useDevWorkspaceStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
        <Globe size={28} color="var(--mantine-color-dark-3)" />
        <span style={{ fontSize: 11, color: 'var(--mantine-color-dimmed)', textAlign: 'center', maxWidth: 200 }}>
          {webcontainerStatus === 'ready'
            ? '터미널에서 dev server를 실행하면 여기에 표시됩니다'
            : '프로젝트 로드 중...'}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 주소 바 */}
      <div
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, padding: '4px 8px', borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}
      >
        <Globe size={12} color="var(--mantine-color-green-5)" />
        <span style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {previewUrl}
        </span>
        <button
          onClick={() => iframeRef.current?.contentWindow?.location.reload()}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'inherit' }}
        >
          <ArrowClockwise size={10} />
        </button>
        <button
          onClick={() => window.open(previewUrl, '_blank')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'inherit' }}
        >
          <ArrowSquareOut size={10} />
        </button>
      </div>

      {/* 프리뷰 iframe */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#fff',
            borderRadius: '0 0 4px 4px',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

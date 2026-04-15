'use client';

import { useEffect, useRef } from 'react';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

/**
 * WebContainer 라이프사이클 관리 훅
 * projectId가 있고 admin 모드가 아닐 때 자동으로 부팅+프로젝트 로드
 */
export function useWebContainer() {
  const {
    projectId,
    isAdminMode,
    webcontainerStatus,
    setWebcontainerStatus,
    setWebcontainerInstance,
  } = useDevWorkspaceStore();
  const prevProjectRef = useRef<string | null>(null);

  useEffect(() => {
    // Admin 모드이거나 프로젝트 없으면 무시
    if (isAdminMode || !projectId) return;

    // 같은 프로젝트면 재부팅 안 함
    if (prevProjectRef.current === projectId && webcontainerStatus === 'ready') return;
    prevProjectRef.current = projectId;

    let cancelled = false;

    async function boot() {
      try {
        setWebcontainerStatus('booting');

        const { bootContainer } = await import('@/lib/dev/webcontainer');
        if (cancelled) return;

        setWebcontainerStatus('loading');

        const { loadProject } = await import('@/lib/dev/webcontainer');
        const container = await loadProject(projectId!);
        if (cancelled) return;

        setWebcontainerInstance(container);
        setWebcontainerStatus('ready');
      } catch (e) {
        if (!cancelled) {
          console.error('[WebContainer] boot failed:', e);
          setWebcontainerStatus('error', (e as Error).message);
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [projectId, isAdminMode]);

  return { status: webcontainerStatus };
}

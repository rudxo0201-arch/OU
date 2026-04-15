'use client';

import { useEffect, useRef } from 'react';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

let bootSequence = 0;

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
    if (isAdminMode || !projectId) return;
    if (prevProjectRef.current === projectId && webcontainerStatus === 'ready') return;
    prevProjectRef.current = projectId;

    const mySequence = ++bootSequence;

    async function boot() {
      try {
        setWebcontainerStatus('booting');

        const { bootContainer, loadProject, teardown } = await import('@/lib/dev/webcontainer');

        // 이미 다른 프로젝트로 전환됨 → 중단
        if (mySequence !== bootSequence) {
          teardown();
          return;
        }

        setWebcontainerStatus('loading');

        const container = await loadProject(projectId!);

        // 부팅 사이에 다른 프로젝트로 전환됨 → 정리
        if (mySequence !== bootSequence) {
          teardown();
          return;
        }

        setWebcontainerInstance(container);
        setWebcontainerStatus('ready');
      } catch (e) {
        if (mySequence === bootSequence) {
          console.error('[WebContainer] boot failed:', e);
          setWebcontainerStatus('error', (e as Error).message);
        }
      }
    }

    boot();

    return () => {
      // 시퀀스 증가로 이전 부팅 무효화 (teardown은 setProject에서 처리)
    };
  }, [projectId, isAdminMode]);

  return { status: webcontainerStatus };
}

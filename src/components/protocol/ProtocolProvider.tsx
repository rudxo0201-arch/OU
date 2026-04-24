'use client';

import { useEffect, useCallback } from 'react';
import { useProtocolStore } from '@/stores/protocolStore';
import { useAuthStore } from '@/stores/authStore';
import { AnnouncementModal } from './AnnouncementModal';

export function ProtocolProvider() {
  const { user } = useAuthStore();
  const {
    pendingAnnouncement,
    accept,
    dismiss,
    evaluate,
    syncFromRemote,
    _hasHydrated,
  } = useProtocolStore();

  // 원격 상태 로드 + 초기 평가
  useEffect(() => {
    if (!user || !_hasHydrated) return;

    const load = async () => {
      try {
        const res = await fetch('/api/protocol/state');
        if (res.ok) {
          const remote = await res.json();
          syncFromRemote(remote);
        }
      } catch {}

      const domainsRes = await fetch('/api/nodes?domains=true').catch(() => null);
      if (!domainsRes?.ok) return;
      const { domains } = await domainsRes.json();
      const domainCounts: Record<string, number> = {};
      for (const d of domains ?? []) domainCounts[d.key] = d.count;

      const totalNodes = Object.values(domainCounts).reduce((a, b) => a + b, 0);
      const daysSinceSignup = user.created_at
        ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000)
        : 0;

      evaluate(domainCounts, totalNodes, daysSinceSignup);
    };

    load();
  }, [user?.id, _hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // DataNode 생성 이벤트 후 재평가
  const reEvaluate = useCallback(async () => {
    const domainsRes = await fetch('/api/nodes?domains=true').catch(() => null);
    if (!domainsRes?.ok) return;
    const { domains } = await domainsRes.json();
    const domainCounts: Record<string, number> = {};
    for (const d of domains ?? []) domainCounts[d.key] = d.count;
    const totalNodes = Object.values(domainCounts).reduce((a, b) => a + b, 0);
    const daysSinceSignup = user?.created_at
      ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000)
      : 0;
    evaluate(domainCounts, totalNodes, daysSinceSignup);
  }, [evaluate, user?.created_at]);

  useEffect(() => {
    window.addEventListener('protocol-re-evaluate', reEvaluate);
    return () => window.removeEventListener('protocol-re-evaluate', reEvaluate);
  }, [reEvaluate]);

  if (!pendingAnnouncement) return null;

  return (
    <AnnouncementModal
      event={pendingAnnouncement}
      onAccept={accept}
      onDismiss={dismiss}
    />
  );
}

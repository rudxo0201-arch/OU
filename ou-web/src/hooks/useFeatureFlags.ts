'use client';

import { useCallback } from 'react';
import { useFeatureStore } from '@/stores/featureStore';
import { useAuth } from '@/hooks/useAuth';
import { isValidFeatureId, getFeatureById } from '@/lib/features/registry';
import { notifications } from '@mantine/notifications';
import { createClient } from '@/lib/supabase/client';

export function useFeatureFlags() {
  const { user } = useAuth();
  const {
    unlockedFeatures,
    isUnlocked,
    addUnlockedFeature,
    setUnlockedFeatures,
  } = useFeatureStore();

  /** DB에서 해금 상태 로드 */
  const hydrate = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('features_unlocked')
      .eq('id', user.id)
      .single();

    if (data?.features_unlocked) {
      setUnlockedFeatures(data.features_unlocked);
    }
  }, [user, setUnlockedFeatures]);

  /** 기능 해금 (DB + 로컬 상태 동시 업데이트) */
  const unlock = useCallback(async (featureId: string) => {
    if (!user) return;
    if (!isValidFeatureId(featureId)) return;
    if (isUnlocked(featureId)) return;

    // 로컬 상태 즉시 업데이트 (낙관적)
    addUnlockedFeature(featureId);

    // DB 업데이트
    try {
      const response = await fetch('/api/features/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId }),
      });

      if (!response.ok) throw new Error();

      // 해금 축하 알림
      const feature = getFeatureById(featureId);
      if (feature) {
        notifications.show({
          title: feature.unlockConfirm,
          message: '',
          color: 'dark',
          autoClose: 4000,
        });
      }
    } catch {
      // 실패 시 로컬 상태는 persist로 유지 (다음 로드 시 DB와 동기화)
    }
  }, [user, isUnlocked, addUnlockedFeature]);

  return {
    isUnlocked,
    unlock,
    hydrate,
    unlockedFeatures,
  };
}

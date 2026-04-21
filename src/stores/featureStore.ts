import { createSafeStore } from '@/lib/createSafeStore';
import { getDefaultUnlockedIds } from '@/lib/features/registry';

interface FeatureStore {
  /** 해금된 기능 ID 목록 */
  unlockedFeatures: string[];

  /** 기능 해금 상태 설정 (DB에서 로드 시) */
  setUnlockedFeatures: (features: string[]) => void;

  /** 기능 해금 추가 */
  addUnlockedFeature: (featureId: string) => void;

  /** 해금 여부 확인 */
  isUnlocked: (featureId: string) => boolean;

  /** DB에서 로드됐는지 여부 */
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
}

export const useFeatureStore = createSafeStore<FeatureStore>(
  (set, get) => ({
      unlockedFeatures: getDefaultUnlockedIds(),
      hydrated: false,

      setUnlockedFeatures: (features) =>
        set({ unlockedFeatures: features, hydrated: true }),

      addUnlockedFeature: (featureId) =>
        set((state) => ({
          unlockedFeatures: state.unlockedFeatures.includes(featureId)
            ? state.unlockedFeatures
            : [...state.unlockedFeatures, featureId],
        })),

      isUnlocked: (featureId) =>
        get().unlockedFeatures.includes(featureId),

      setHydrated: (hydrated) => set({ hydrated }),
    }),
  {
    name: 'ou-features',
    partialize: (state: any) => ({
      unlockedFeatures: state.unlockedFeatures,
    }),
  },
);

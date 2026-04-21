import { create, type UseBoundStore, type StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Zustand persist 스토어 팩토리.
 * - _hasHydrated: boolean 플래그 자동 주입 (localStorage 완료 시 true)
 * - _hasHydrated는 localStorage에 저장하지 않음
 * - getter 프로퍼티 (computed 상태) 보존
 *
 * 사용:
 *   export const useMyStore = createSafeStore<MyState>(
 *     (set, get) => ({ ... }),
 *     { name: 'my-key' }
 *   );
 *
 *   const hydrated = useMyStore(s => s._hasHydrated);
 *   if (!hydrated) return null; // 서버/클라이언트 상태 일치 보장
 */
export function createSafeStore<T extends object>(
  stateCreator: (
    set: (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void,
    get: () => T,
    api: StoreApi<T & { _hasHydrated: boolean }>,
  ) => T,
  persistOptions: any,
): UseBoundStore<StoreApi<T & { _hasHydrated: boolean }>> {
  type S = T & { _hasHydrated: boolean };

  let ref!: UseBoundStore<StoreApi<S>>;

  ref = create<S>()(
    persist(
      (set: any, get: any, api: any) => {
        const stateObj = stateCreator(set, get, api);
        // Object.defineProperties로 getter를 호출 없이 그대로 복사
        const base: { _hasHydrated: boolean } = { _hasHydrated: false };
        return Object.defineProperties(
          base,
          Object.getOwnPropertyDescriptors(stateObj),
        ) as unknown as S;
      },
      {
        ...persistOptions,
        partialize: persistOptions.partialize
          ? persistOptions.partialize
          : ({ _hasHydrated: _h, ...rest }: S) => rest,
        onRehydrateStorage: () => (_state: S | undefined, err: unknown) => {
          if (!err) ref.setState(s => ({ ...s, _hasHydrated: true }));
        },
      },
    ) as any,
  );

  return ref;
}

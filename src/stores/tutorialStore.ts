import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TUTORIAL_STEP_COUNT } from '@/data/tutorial';

type TutorialPhase = 'idle' | 'active' | 'edit-mode' | 'completed' | 'skipped';

interface TutorialStore {
  phase: TutorialPhase;
  stepIndex: number; // 0-based, 0~6

  // 편집 모드 진입 전 pending 위젯 (AddToHomeButton에서 설정)
  pendingWidget: { type: string; id: string } | null;

  // Actions
  startTutorial: () => void;
  completeStep: () => void;
  skipStep: () => void;
  skipAll: () => void;
  enterEditMode: (widget: { type: string; id: string }) => void;
  exitEditMode: () => void; // 편집 완료 → 튜토리얼 중이면 Orb 확장 트리거
  completeTutorial: () => void;
  reset: () => void;

  // Computed
  isActive: () => boolean;
  isEditMode: () => boolean;
  isCompleted: () => boolean;
  currentGhostText: () => string | undefined;
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      stepIndex: 0,
      pendingWidget: null,

      startTutorial: () => set({ phase: 'active', stepIndex: 0 }),

      completeStep: () => {
        const { stepIndex } = get();
        const next = stepIndex + 1;
        if (next >= TUTORIAL_STEP_COUNT) {
          set({ phase: 'completed', stepIndex: next });
        } else {
          set({ stepIndex: next });
        }
      },

      skipStep: () => {
        const { stepIndex } = get();
        const next = stepIndex + 1;
        if (next >= TUTORIAL_STEP_COUNT) {
          set({ phase: 'completed', stepIndex: next });
        } else {
          set({ stepIndex: next });
        }
      },

      skipAll: () => set({ phase: 'skipped' }),

      enterEditMode: (widget) => set({ phase: 'edit-mode', pendingWidget: widget }),

      exitEditMode: () => {
        // 편집 완료 후 다음 단계로 이동 — Orb 자동 확장은 my/page.tsx에서 처리
        const { stepIndex } = get();
        const next = stepIndex + 1;
        if (next >= TUTORIAL_STEP_COUNT) {
          set({ phase: 'completed', stepIndex: next, pendingWidget: null });
        } else {
          set({ phase: 'active', stepIndex: next, pendingWidget: null });
        }
      },

      completeTutorial: () => set({ phase: 'completed' }),

      reset: () => set({ phase: 'idle', stepIndex: 0, pendingWidget: null }),

      isActive: () => {
        const { phase } = get();
        return phase === 'active' || phase === 'edit-mode';
      },

      isEditMode: () => get().phase === 'edit-mode',

      isCompleted: () => {
        const { phase } = get();
        return phase === 'completed' || phase === 'skipped';
      },

      currentGhostText: () => {
        const { phase, stepIndex } = get();
        if (phase !== 'active') return undefined;
        // lazy import to avoid circular deps at module load
        const { getTutorialStep } = require('@/data/tutorial');
        return getTutorialStep(stepIndex)?.ghostText;
      },
    }),
    {
      name: 'ou-tutorial',
      version: 1,
    }
  )
);

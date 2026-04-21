import { createSafeStore } from '@/lib/createSafeStore';
import { TUTORIAL_STEP_COUNT } from '@/data/tutorial';

type TutorialPhase = 'idle' | 'active' | 'edit-mode' | 'completed' | 'skipped';

interface TutorialStore {
  phase: TutorialPhase;
  stepIndex: number; // 0-based, 0~6
  celebrated: boolean; // TutorialComplete 모달이 한 번이라도 표시됐는지

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
  markCelebrated: () => void;
  reset: () => void;

  // Computed
  isActive: () => boolean;
  isEditMode: () => boolean;
  isCompleted: () => boolean;
  currentGhostText: () => string | undefined;
}

function recordTutorialComplete() {
  fetch('/api/tutorial/complete', { method: 'POST' }).catch(() => {});
}

export const useTutorialStore = createSafeStore<TutorialStore>(
  (set, get) => ({
      phase: 'idle',
      stepIndex: 0,
      celebrated: false,
      pendingWidget: null,

      startTutorial: () => set({ phase: 'active', stepIndex: 0 }),

      completeStep: () => {
        const { stepIndex } = get();
        const next = stepIndex + 1;
        if (next >= TUTORIAL_STEP_COUNT) {
          set({ phase: 'completed', stepIndex: next });
          recordTutorialComplete();
        } else {
          set({ stepIndex: next });
        }
      },

      skipStep: () => {
        const { stepIndex } = get();
        const next = stepIndex + 1;
        if (next >= TUTORIAL_STEP_COUNT) {
          set({ phase: 'completed', stepIndex: next });
          recordTutorialComplete();
        } else {
          set({ stepIndex: next });
        }
      },

      skipAll: () => {
        set({ phase: 'skipped' });
        recordTutorialComplete();
      },

      enterEditMode: (widget) => set({ phase: 'edit-mode', pendingWidget: widget }),

      exitEditMode: () => {
        // 편집 완료 후 다음 단계로 이동 — Orb 자동 확장은 my/page.tsx에서 처리
        const { stepIndex } = get();
        const next = stepIndex + 1;
        if (next >= TUTORIAL_STEP_COUNT) {
          set({ phase: 'completed', stepIndex: next, pendingWidget: null });
          recordTutorialComplete();
        } else {
          set({ phase: 'active', stepIndex: next, pendingWidget: null });
        }
      },

      completeTutorial: () => {
        set({ phase: 'completed' });
        recordTutorialComplete();
      },

      markCelebrated: () => set({ celebrated: true }),

      reset: () => set({ phase: 'idle', stepIndex: 0, celebrated: false, pendingWidget: null }),

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
    version: 3,
    migrate: (persisted: unknown) => {
      const s = persisted as { phase?: string; stepIndex?: number; celebrated?: boolean };
      if (s?.phase === 'completed' || s?.phase === 'skipped') {
        return { phase: s.phase, stepIndex: 0, celebrated: s.celebrated ?? false, pendingWidget: null };
      }
      return { phase: 'idle', stepIndex: 0, celebrated: false, pendingWidget: null };
    },
  },
);

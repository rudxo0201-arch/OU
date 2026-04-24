import { createSafeStore } from '@/lib/createSafeStore';
import { evaluateEvents, type OrbState, type ProtocolEvent } from '@/lib/protocol/engine';
import { ALL_PROTOCOL_EVENTS } from '@/data/protocol';

interface ProtocolState {
  firedEvents: string[];
  dismissedEvents: Record<string, number>;
  orbState: Record<string, OrbState>;
  pendingAnnouncement: ProtocolEvent | null;

  // Actions
  evaluate: (domainCounts: Record<string, number>, totalNodes: number, daysSinceSignup: number) => void;
  accept: () => void;
  dismiss: () => void;
  completeTutorial: (orbSlug: string) => void;
  syncFromRemote: (state: Pick<ProtocolState, 'firedEvents' | 'dismissedEvents' | 'orbState'>) => void;
}

function persistToRemote(state: Pick<ProtocolState, 'firedEvents' | 'dismissedEvents' | 'orbState'>) {
  fetch('/api/protocol/state', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firedEvents: state.firedEvents,
      dismissedEvents: state.dismissedEvents,
      orbState: state.orbState,
    }),
  }).catch(() => {});
}

export const useProtocolStore = createSafeStore<ProtocolState>(
  (set, get) => ({
    firedEvents: [],
    dismissedEvents: {},
    orbState: {},
    pendingAnnouncement: null,

    evaluate: (domainCounts, totalNodes, daysSinceSignup) => {
      const { firedEvents, dismissedEvents, orbState, pendingAnnouncement } = get();
      if (pendingAnnouncement) return; // 이미 대기 중이면 스킵

      const ctx = {
        domainCounts,
        totalNodes,
        firedEvents: new Set(firedEvents),
        dismissedEvents,
        daysSinceSignup,
        orbState,
      };

      const next = evaluateEvents(ALL_PROTOCOL_EVENTS, ctx);
      if (next) set({ pendingAnnouncement: next });
    },

    accept: () => {
      const { pendingAnnouncement, firedEvents, dismissedEvents, orbState } = get();
      if (!pendingAnnouncement) return;

      const nextFired = [...firedEvents, pendingAnnouncement.id];
      set({ pendingAnnouncement: null, firedEvents: nextFired });

      if (pendingAnnouncement.onAccept) pendingAnnouncement.onAccept();

      persistToRemote({ firedEvents: nextFired, dismissedEvents, orbState });
    },

    dismiss: () => {
      const { pendingAnnouncement, firedEvents, dismissedEvents, orbState } = get();
      if (!pendingAnnouncement) return;

      const nextDismissed = { ...dismissedEvents, [pendingAnnouncement.id]: Date.now() };
      set({ pendingAnnouncement: null, dismissedEvents: nextDismissed });

      persistToRemote({ firedEvents, dismissedEvents: nextDismissed, orbState });
    },

    completeTutorial: (orbSlug) => {
      const { firedEvents, dismissedEvents, orbState } = get();
      const nextOrbState = {
        ...orbState,
        [orbSlug]: { ...(orbState[orbSlug] ?? {}), tutorialCompleted: true },
      };
      set({ orbState: nextOrbState });
      persistToRemote({ firedEvents, dismissedEvents, orbState: nextOrbState });
    },

    syncFromRemote: ({ firedEvents, dismissedEvents, orbState }) => {
      set({ firedEvents, dismissedEvents, orbState });
    },
  }),
  {
    name: 'ou-protocol',
    version: 1,
    partialize: (s: ProtocolState) => ({
      firedEvents: s.firedEvents,
      dismissedEvents: s.dismissedEvents,
      orbState: s.orbState,
    }),
  },
);

export interface ProtocolContext {
  domainCounts: Record<string, number>;
  totalNodes: number;
  firedEvents: Set<string>;
  dismissedEvents: Record<string, number>;
  daysSinceSignup: number;
  orbState: Record<string, OrbState>;
}

export interface OrbState {
  tutorialCompleted: boolean;
  [k: string]: unknown;
}

export interface ProtocolEvent {
  id: string;
  scope: 'ou' | { orb: string };
  title: string;
  body: string;
  cta: string;
  predicate: (ctx: ProtocolContext) => boolean;
  onAccept?: () => void;
  priority: number;
  cooldownMs?: number;
}

export function evaluateEvents(
  events: ProtocolEvent[],
  ctx: ProtocolContext,
): ProtocolEvent | null {
  const now = Date.now();
  const candidates = events
    .filter((e) => {
      if (ctx.firedEvents.has(e.id)) return false;
      const dismissedAt = ctx.dismissedEvents[e.id];
      if (dismissedAt && e.cooldownMs && now - dismissedAt < e.cooldownMs) return false;
      return e.predicate(ctx);
    })
    .sort((a, b) => b.priority - a.priority);

  return candidates[0] ?? null;
}

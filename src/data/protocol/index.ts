import type { ProtocolEvent } from '@/lib/protocol/engine';
import { SCHEDULE_EVENTS } from './schedule';

export const ALL_PROTOCOL_EVENTS: ProtocolEvent[] = [
  ...SCHEDULE_EVENTS,
];

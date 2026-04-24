-- Protocol 엔진 상태 저장
-- firedEvents: 이미 발동된 이벤트 ID 목록
-- dismissedEvents: {eventId: dismissedTimestamp} — cooldown 계산용
-- orbState: {orbSlug: {tutorialCompleted: boolean, ...}} — Orb별 진행 상태
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS protocol_state JSONB
  DEFAULT '{"firedEvents":[],"dismissedEvents":{},"orbState":{}}'::jsonb;

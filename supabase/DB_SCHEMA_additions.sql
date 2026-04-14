-- ============================================================
-- 15. 구독 플랜 (Free / Pro / Team)
-- ============================================================
-- 왜: BUSINESS.md의 토큰 제한 + 업그레이드 모달 UX 구현에 필요
--     subscriptions 없으면 TokenGauge 컴포넌트 구현 불가

CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN (
                    'free',   -- 광고 있음, 채팅 토큰 제한, AI 뷰 생성 불가
                    'pro',    -- 광고 없음, 토큰 대폭 확대, AI 뷰 생성 가능
                    'team'    -- 그룹 기능 강화, 공동편집 인원 확대
                  )),
  status          TEXT DEFAULT 'active' CHECK (status IN (
                    'active',    -- 정상
                    'cancelled', -- 취소 예정 (기간 만료 전까지 유지)
                    'expired',   -- 만료
                    'trial'      -- 체험
                  )),
  -- 토큰 한도 (단일 게이지: 채팅 + AI뷰 생성 통합)
  -- 단위: 토큰 포인트 (실제 LLM 토큰과 1:1 아님, UX용 추상 단위)
  token_limit     INTEGER NOT NULL DEFAULT 100,   -- Free: 100, Pro: 2000
  current_period_start  TIMESTAMPTZ DEFAULT now(),
  current_period_end    TIMESTAMPTZ DEFAULT (now() + interval '1 month'),
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)  -- 1인 1구독
);

-- ============================================================
-- 16. 토큰 사용량 (단일 게이지 UX)
-- ============================================================
-- 왜: BUSINESS.md "단일 게이지 UX" — 채팅 + 뷰 생성을 하나의 풀로 표시
--     뷰 생성 시 게이지 크게 감소 → 업그레이드 유도
--     TokenGauge 컴포넌트 실시간 렌더링에 필요

CREATE TABLE token_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  operation       TEXT NOT NULL CHECK (operation IN (
                    'chat',       -- 채팅 응답 (낮은 소비)
                    'view_gen',   -- AI 뷰 생성 (높은 소비, Pro 전용)
                    'view_edit',  -- AI 뷰 수정 (반복 소비)
                    'embed',      -- 임베딩 (내부 처리, 낮음)
                    'ocr'         -- OCR (이미지 첨부 시)
                  )),
  tokens_used     INTEGER NOT NULL,   -- 소비된 토큰 포인트
  -- 뷰 생성은 채팅보다 높은 소비 → 사용자가 "아 뷰 만드니까 빨리 줄어드네" 인식
  -- 예: 채팅 1턴 = 1pt, 뷰 생성 1회 = 10~20pt
  llm_tokens_actual INTEGER,          -- 실제 LLM 토큰 (api_cost_log와 연계)
  period_start    TIMESTAMPTZ,        -- 해당 구독 기간 시작
  message_id      UUID REFERENCES messages(id),
  node_id         UUID REFERENCES data_nodes(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 기간별 사용량 집계용 인덱스
CREATE INDEX token_usage_user_period_idx
  ON token_usage (user_id, period_start, created_at DESC);

CREATE INDEX token_usage_operation_idx
  ON token_usage (operation);

-- 구독 조회 인덱스
CREATE INDEX subscriptions_user_idx
  ON subscriptions (user_id);
CREATE INDEX subscriptions_status_idx
  ON subscriptions (status) WHERE status = 'active';

-- ============================================================
-- 17. 구독 RLS
-- ============================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_subscription" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "own_token_usage" ON token_usage
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- OU (OWN UNIVERSE) — 전체 DB 스키마
-- 작성일: 2026-04-14
-- DB: Supabase PostgreSQL + pgvector
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 인증 / 사용자
-- ============================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  language        TEXT DEFAULT 'ko',
  verified        BOOLEAN DEFAULT false,
  user_level      TEXT DEFAULT 'unknown' CHECK (user_level IN (
                    'unknown','basic','intermediate','expert'
                  )),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL, -- 'admin', 'member'
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_id     UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_at  TIMESTAMPTZ DEFAULT now(),
  granted_by  UUID REFERENCES profiles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE api_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. 페르소나 (멀티 페르소나 시스템)
-- ============================================================
-- 1인 1계정, N페르소나
-- 페르소나 = 어떤 DataNode를 공개할지의 설정 = 프로필뷰 필터

CREATE TABLE personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  handle              TEXT UNIQUE NOT NULL,  -- @hanu_minjon
  display_name        TEXT NOT NULL,
  bio                 TEXT,
  avatar_url          TEXT,
  profile_view_config JSONB,   -- 프로필뷰 설정 (뷰 타입, 테마 등)
  is_default          BOOLEAN DEFAULT false, -- 기본 페르소나 (나만 보기)
  visibility          TEXT DEFAULT 'public' CHECK (visibility IN (
                        'public','link','private'
                      )),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 페르소나별 DataNode 공개 설정
CREATE TABLE persona_node_visibility (
  persona_id  UUID REFERENCES personas(id) ON DELETE CASCADE,
  node_id     UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  is_visible  BOOLEAN DEFAULT false,  -- 기본: 비공개
  PRIMARY KEY (persona_id, node_id)
);

-- 페르소나별 엣지 공개 설정
CREATE TABLE persona_edge_visibility (
  persona_id    UUID REFERENCES personas(id) ON DELETE CASCADE,
  relation_id   UUID REFERENCES node_relations(id) ON DELETE CASCADE,
  is_visible    BOOLEAN DEFAULT false,
  PRIMARY KEY (persona_id, relation_id)
);

-- 팔로우는 페르소나 단위
CREATE TABLE persona_follows (
  follower_persona_id  UUID REFERENCES personas(id) ON DELETE CASCADE,
  following_persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_persona_id, following_persona_id)
);

-- ============================================================
-- 3. 그룹
-- ============================================================

CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    UUID REFERENCES profiles(id),
  visibility  TEXT DEFAULT 'private' CHECK (visibility IN (
                'private','link','public'
              )),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  group_id   UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT CHECK (role IN ('owner','editor','viewer')),
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- 3. 대화 스트림 (세션 없음, 연속)
-- ============================================================

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES groups(id),  -- NULL = 개인
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  raw         TEXT NOT NULL,               -- 원문 불변
  type        TEXT NOT NULL CHECK (type IN ('chat','question','answer')),
  pair_id     UUID REFERENCES messages(id),-- question ↔ answer 연결
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE message_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id),
  event_type  TEXT NOT NULL CHECK (event_type IN (
                'deleted','cancelled','edited','reacted'
              )),
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. DataNode (그래프의 노드)
-- ============================================================

CREATE TABLE data_nodes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id         UUID REFERENCES groups(id), -- NULL = 개인
  message_id       UUID REFERENCES messages(id),
  is_admin_node    BOOLEAN DEFAULT false,       -- 관리자 기본 DB

  -- 분류
  domain           TEXT NOT NULL CHECK (domain IN (
                     'schedule','task','habit','knowledge',
                     'idea','relation','emotion','finance',
                     'product','broadcast','education',
                     'media','location','unresolved'
                   )),
  source_type      TEXT NOT NULL CHECK (source_type IN (
                     'chat','upload','youtube','crawl','manual'
                   )),

  -- 원본 파일 연결 (DATA.md 원본 보존 원칙)
  source_file_url  TEXT,          -- Cloudflare R2 경로
  source_location  JSONB,         -- {page, paragraph, timestamp 등}
  source_file_type TEXT,          -- 'pdf','ppt','hwp','image','youtube' 등

  -- 신뢰도
  confidence       TEXT DEFAULT 'medium' CHECK (confidence IN (
                     'high','medium','low'
                   )),
  resolution       TEXT DEFAULT 'resolved' CHECK (resolution IN (
                     'resolved','fuzzy','opaque'
                   )),
  precision_level  INTEGER DEFAULT 1 CHECK (precision_level BETWEEN 0 AND 3),

  -- 공개 설정
  visibility       TEXT DEFAULT 'private' CHECK (visibility IN (
                     'private','link','public'
                   )),

  -- 뷰 힌트 (추천 시스템용)
  view_hint        TEXT CHECK (view_hint IN (
                     'calendar','task','heatmap','knowledge_graph',
                     'mindmap','relation_graph','journal','chart',
                     'gallery','feed','quiz','flashcard'
                   )),

  -- 도메인별 구조화 데이터
  domain_data      JSONB,
  system_tags      TEXT[],

  -- 그래프뷰 시각 타입 (planet: 일반 노드, star: 도메인 허브 노드)
  graph_type       TEXT DEFAULT 'planet' CHECK (graph_type IN (
                     'planet','star'
                   )),

  -- 스토리지 티어 (비용 최적화)
  storage_tier     TEXT DEFAULT 'hot' CHECK (storage_tier IN (
                     'hot','warm','cold'
                   )),
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  last_verified_at TIMESTAMPTZ, -- 검증 에이전트용

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. 섹션 (heading + 문단 묶음)
-- ============================================================

CREATE TABLE sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id     UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  heading     TEXT,
  order_idx   INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. 문장 (벡터 임베딩 포함)
-- ============================================================

CREATE TABLE sentences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   UUID REFERENCES sections(id) ON DELETE CASCADE,
  node_id      UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  order_idx    INTEGER NOT NULL,

  -- 벡터 임베딩 (text-embedding-3-small = 1536차원)
  embedding    vector(1536),

  -- 임베딩 상태 (비용 최적화)
  embed_status TEXT DEFAULT 'pending' CHECK (embed_status IN (
                 'pending','processing','done','failed'
               )),
  embed_tier   TEXT DEFAULT 'hot' CHECK (embed_tier IN (
                 'hot','warm','cold'
               )),

  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. 트리플 (온톨로지)
-- ============================================================
-- 핵심 설계:
--   triples는 sentences의 자식이 아니라 data_nodes의 자식
--   한 문장 → 트리플 여러 개 (1:N)
--   여러 문장 → 트리플 하나 추론 (N:M)
--   triple_sentence_sources로 출처 연결

CREATE TABLE triples (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id      UUID REFERENCES data_nodes(id) ON DELETE CASCADE,

  -- 출처 주소 (직접 참조 — 조인 없이 바로 위치 파악 가능)
  section_id   UUID REFERENCES sections(id),   -- 어느 문단에서 나왔는지
  -- sentence 레벨 출처는 triple_sentence_sources로 N:M 관리

  subject      TEXT NOT NULL,
  predicate    TEXT NOT NULL CHECK (predicate IN (
                 'is_a','part_of','causes','derived_from',
                 'related_to','opposite_of','requires',
                 'example_of','involves','located_at','occurs_at'
               )),
  object       TEXT NOT NULL,

  -- 어느 레벨에서 추출됐는지
  source_level TEXT DEFAULT 'sentence' CHECK (source_level IN (
                 'sentence', -- 문장 단위 추출 (가장 흔함)
                 'section',  -- 문단 단위 추론
                 'node'      -- 노드 전체에서 추론
               )),

  -- 어떻게 생성됐는지
  source_type  TEXT DEFAULT 'generated' CHECK (source_type IN (
                 'generated', -- OU LLM이 처음부터 생성
                 'extracted', -- 사후 추출
                 'inferred'   -- 여러 문장 조합 추론
               )),

  confidence   TEXT DEFAULT 'medium' CHECK (confidence IN (
                 'high','medium','low'
               )),

  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 트리플 ↔ 문장 출처 연결 (N:M)
-- 한 트리플이 여러 문장에서 나올 수 있음
-- 한 문장에서 여러 트리플이 나올 수 있음
CREATE TABLE triple_sentence_sources (
  triple_id    UUID REFERENCES triples(id) ON DELETE CASCADE,
  sentence_id  UUID REFERENCES sentences(id) ON DELETE CASCADE,
  PRIMARY KEY (triple_id, sentence_id)
);

-- ============================================================
-- 8. 노드 간 엣지 (그래프뷰)
-- ============================================================

CREATE TABLE node_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id  UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  target_node_id  UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  relation_type   TEXT NOT NULL CHECK (relation_type IN (
                    'is_a','part_of','causes','derived_from',
                    'related_to','opposite_of','requires',
                    'example_of','involves','located_at','occurs_at'
                  )),
  weight          FLOAT DEFAULT 1.0,
  source          TEXT CHECK (source IN (
                    'sql',       -- 명시적 관계형 연결
                    'vector',    -- 벡터 유사도 기반
                    'manual'     -- 사용자 직접 연결
                  )),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source_node_id, target_node_id, relation_type)
);

-- ============================================================
-- 9. UNRESOLVED 엔티티
-- ============================================================

CREATE TABLE unresolved_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  raw_text        TEXT NOT NULL,       -- "걔", "거기" 등
  context_snippet TEXT,                -- 주변 문장 (정확도 높이기 UI용)
  placeholder_node_id UUID REFERENCES data_nodes(id),
  resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN (
                      'pending',   -- 해소 대기
                      'auto',      -- 자동 해소됨
                      'manual',    -- 사용자가 직접 해소
                      'skipped'    -- 건너뜀
                    )),
  resolved_node_id UUID REFERENCES data_nodes(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

-- ============================================================
-- 10. 뷰 시스템
-- ============================================================

CREATE TABLE saved_views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id      UUID REFERENCES groups(id),
  name          TEXT NOT NULL,
  view_type     TEXT NOT NULL,      -- 'calendar','kanban','graph','pdf' 등
  filter_config JSONB,              -- 필터 조건
  layout_config JSONB,              -- 레이아웃 설정
  custom_code   TEXT,               -- AI 뷰 생성기 결과 (HTML/CSS/JS)
  ownership     TEXT DEFAULT 'personal' CHECK (ownership IN (
                  'personal','collaborative'
                )),
  is_subscribable BOOLEAN DEFAULT false,
  subscriber_count INTEGER DEFAULT 0,
  visibility    TEXT DEFAULT 'private' CHECK (visibility IN (
                  'private','link','public'
                )),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE view_members (
  view_id    UUID REFERENCES saved_views(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT CHECK (role IN ('owner','editor','subscriber')),
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (view_id, user_id)
);

CREATE TABLE view_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  view_id     UUID REFERENCES saved_views(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notify_on   JSONB,
  -- {data_updated: true, new_item: true, deadline_before: 3}
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. 관리자 노드 참조 (복사 저장 금지)
-- ============================================================

CREATE TABLE user_node_refs (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  node_id    UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, node_id)
);

-- ============================================================
-- 12. 집단지성 검토 시스템
-- ============================================================

-- 검토 요청
CREATE TABLE verification_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id     UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  triple_id   UUID REFERENCES triples(id),  -- 특정 트리플 검토 시
  reason      TEXT NOT NULL CHECK (reason IN (
                'auto_flagged',   -- 자동 에이전트 감지
                'user_reported',  -- 사용자 오류 신고
                'admin_flagged'   -- 관리자 직접 등록
              )),
  status      TEXT DEFAULT 'open' CHECK (status IN (
                'open',      -- 투표 진행 중
                'approved',  -- 집단지성으로 승인 (confidence → 'high')
                'rejected',  -- 집단지성으로 오류 확인 → 관리자 큐
                'escalated', -- 관리자 최종 검토 필요
                'resolved'   -- 최종 해소
              )),
  vote_approve INTEGER DEFAULT 0,
  vote_reject  INTEGER DEFAULT 0,
  vote_unsure  INTEGER DEFAULT 0,
  threshold    INTEGER DEFAULT 5, -- 몇 명 투표 시 자동 결정
  created_at  TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 투표 기록 (1인 1표)
CREATE TABLE verification_votes (
  request_id  UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vote        TEXT NOT NULL CHECK (vote IN ('approve','reject','unsure')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (request_id, user_id)
);

CREATE INDEX verification_requests_status_idx
  ON verification_requests (status) WHERE status = 'open';
CREATE INDEX verification_requests_node_idx
  ON verification_requests (node_id);

-- ============================================================
-- 13. 비용 추적
-- ============================================================

CREATE TABLE api_cost_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation   TEXT NOT NULL,
  -- 'chat','embed','extract_triple','ocr','view_gen'
  model       TEXT NOT NULL,
  tokens      INTEGER,
  cost_usd    NUMERIC(10,6),
  user_id     UUID REFERENCES profiles(id),
  node_id     UUID REFERENCES data_nodes(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. 인덱스
-- ============================================================

-- 벡터 유사도 검색
CREATE INDEX sentences_embedding_idx
  ON sentences USING hnsw (embedding vector_cosine_ops);

-- 자주 쓰는 필터
CREATE INDEX data_nodes_user_domain_idx
  ON data_nodes (user_id, domain);
CREATE INDEX data_nodes_group_idx
  ON data_nodes (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX data_nodes_admin_idx
  ON data_nodes (is_admin_node) WHERE is_admin_node = true;
CREATE INDEX triples_node_idx
  ON triples (node_id);
CREATE INDEX triples_section_idx
  ON triples (section_id) WHERE section_id IS NOT NULL;
CREATE INDEX triples_subject_idx
  ON triples (subject);
CREATE INDEX triples_predicate_idx
  ON triples (predicate);
CREATE INDEX triple_sentence_sources_triple_idx
  ON triple_sentence_sources (triple_id);
CREATE INDEX triple_sentence_sources_sentence_idx
  ON triple_sentence_sources (sentence_id);
CREATE INDEX node_relations_source_idx
  ON node_relations (source_node_id);
CREATE INDEX node_relations_target_idx
  ON node_relations (target_node_id);
CREATE INDEX unresolved_user_status_idx
  ON unresolved_entities (user_id, resolution_status);
CREATE INDEX embed_status_idx
  ON sentences (embed_status) WHERE embed_status != 'done';

-- ============================================================
-- 14. RLS (Row Level Security)
-- ============================================================

ALTER TABLE data_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE triples ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE unresolved_entities ENABLE ROW LEVEL SECURITY;

-- 개인 DataNode: 본인만 접근
CREATE POLICY "personal_nodes" ON data_nodes
  FOR ALL USING (
    user_id = auth.uid()
    OR is_admin_node = true      -- 관리자 노드는 전체 공개
    OR visibility = 'public'
    OR (visibility = 'link' AND /* 링크 토큰 검증 로직 */ true)
  );

-- 그룹 DataNode: 멤버만 접근
CREATE POLICY "group_nodes" ON data_nodes
  FOR ALL USING (
    group_id IS NULL
    OR group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );


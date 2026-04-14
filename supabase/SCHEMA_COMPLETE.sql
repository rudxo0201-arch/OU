-- ============================================================
-- OU (OWN UNIVERSE) — 완성 DB 스키마
-- Supabase SQL Editor에서 전체 실행
-- ============================================================

-- 확장
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 인증 / 사용자
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  handle          TEXT UNIQUE,          -- 프로필 URL용 @handle
  bio             TEXT,
  language        TEXT DEFAULT 'ko',
  verified        BOOLEAN DEFAULT false,
  user_level      TEXT DEFAULT 'unknown' CHECK (user_level IN (
                    'unknown','basic','intermediate','expert'
                  )),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_audit_log (
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
-- 2. 그룹 (personas 보다 먼저 — 의존성)
-- ============================================================

CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    UUID REFERENCES profiles(id),
  visibility  TEXT DEFAULT 'private' CHECK (visibility IN (
                'private','link','public'
              )),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id   UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT CHECK (role IN ('owner','editor','viewer')),
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  created_by  UUID REFERENCES profiles(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. 대화 스트림
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES groups(id),
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  raw         TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('chat','question','answer')),
  pair_id     UUID REFERENCES messages(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. DataNode
-- ============================================================

CREATE TABLE IF NOT EXISTS data_nodes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id         UUID REFERENCES groups(id),
  message_id       UUID REFERENCES messages(id),
  is_admin_node    BOOLEAN DEFAULT false,

  domain           TEXT NOT NULL CHECK (domain IN (
                     'schedule','task','habit','knowledge',
                     'idea','relation','emotion','finance',
                     'product','broadcast','education',
                     'media','location','unresolved'
                   )),
  source_type      TEXT NOT NULL CHECK (source_type IN (
                     'chat','upload','youtube','crawl','manual',
                     'import','interaction'
                   )),

  source_file_url  TEXT,
  source_location  JSONB,
  source_file_type TEXT,

  raw              TEXT,
  confidence       TEXT DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),
  resolution       TEXT DEFAULT 'resolved' CHECK (resolution IN ('resolved','fuzzy','opaque')),
  precision_level  INTEGER DEFAULT 1 CHECK (precision_level BETWEEN 0 AND 3),

  visibility       TEXT DEFAULT 'private' CHECK (visibility IN ('private','link','public')),

  view_hint        TEXT CHECK (view_hint IN (
                     'calendar','task','heatmap','knowledge_graph',
                     'mindmap','relation_graph','journal','chart',
                     'gallery','feed','quiz','flashcard'
                   )),

  domain_data      JSONB,
  system_tags      TEXT[],

  storage_tier     TEXT DEFAULT 'hot' CHECK (storage_tier IN ('hot','warm','cold')),
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  last_verified_at TIMESTAMPTZ,

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. 페르소나 (data_nodes 이후 — 의존성)
-- ============================================================

CREATE TABLE IF NOT EXISTS personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  handle              TEXT UNIQUE NOT NULL,
  display_name        TEXT NOT NULL,
  bio                 TEXT,
  avatar_url          TEXT,
  profile_view_config JSONB,
  is_default          BOOLEAN DEFAULT false,
  visibility          TEXT DEFAULT 'public' CHECK (visibility IN ('public','link','private')),
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS persona_node_visibility (
  persona_id  UUID REFERENCES personas(id) ON DELETE CASCADE,
  node_id     UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  is_visible  BOOLEAN DEFAULT false,
  PRIMARY KEY (persona_id, node_id)
);

CREATE TABLE IF NOT EXISTS persona_follows (
  follower_persona_id  UUID REFERENCES personas(id) ON DELETE CASCADE,
  following_persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_persona_id, following_persona_id)
);

-- ============================================================
-- 6. 섹션
-- ============================================================

CREATE TABLE IF NOT EXISTS sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id     UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  heading     TEXT,
  order_idx   INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. 문장 (벡터 임베딩)
-- ============================================================

CREATE TABLE IF NOT EXISTS sentences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   UUID REFERENCES sections(id) ON DELETE CASCADE,
  node_id      UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  order_idx    INTEGER NOT NULL,
  embedding    vector(1536),
  embed_status TEXT DEFAULT 'pending' CHECK (embed_status IN ('pending','processing','done','failed')),
  embed_tier   TEXT DEFAULT 'hot' CHECK (embed_tier IN ('hot','warm','cold')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. 트리플
-- ============================================================

CREATE TABLE IF NOT EXISTS triples (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id      UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  section_id   UUID REFERENCES sections(id),
  subject      TEXT NOT NULL,
  predicate    TEXT NOT NULL CHECK (predicate IN (
                 'is_a','part_of','causes','derived_from',
                 'related_to','opposite_of','requires',
                 'example_of','involves','located_at','occurs_at'
               )),
  object       TEXT NOT NULL,
  source_level TEXT DEFAULT 'sentence' CHECK (source_level IN ('sentence','section','node')),
  source_type  TEXT DEFAULT 'generated' CHECK (source_type IN ('generated','extracted','inferred')),
  confidence   TEXT DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS triple_sentence_sources (
  triple_id    UUID REFERENCES triples(id) ON DELETE CASCADE,
  sentence_id  UUID REFERENCES sentences(id) ON DELETE CASCADE,
  PRIMARY KEY (triple_id, sentence_id)
);

-- ============================================================
-- 9. 노드 간 엣지
-- ============================================================

CREATE TABLE IF NOT EXISTS node_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id  UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  target_node_id  UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  relation_type   TEXT NOT NULL CHECK (relation_type IN (
                    'is_a','part_of','causes','derived_from',
                    'related_to','opposite_of','requires',
                    'example_of','involves','located_at','occurs_at'
                  )),
  weight          FLOAT DEFAULT 1.0,
  source          TEXT CHECK (source IN ('sql','vector','manual')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source_node_id, target_node_id, relation_type)
);

-- ============================================================
-- 10. UNRESOLVED 엔티티
-- ============================================================

CREATE TABLE IF NOT EXISTS unresolved_entities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  raw_text            TEXT NOT NULL,
  context_snippet     TEXT,
  placeholder_node_id UUID REFERENCES data_nodes(id),
  resolution_status   TEXT DEFAULT 'pending' CHECK (resolution_status IN (
                        'pending','auto','manual','skipped'
                      )),
  resolved_node_id    UUID REFERENCES data_nodes(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

-- ============================================================
-- 11. 뷰 시스템
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_views (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id         UUID REFERENCES groups(id),
  name             TEXT NOT NULL,
  view_type        TEXT NOT NULL,
  filter_config    JSONB,
  layout_config    JSONB,
  custom_code      TEXT,
  ownership        TEXT DEFAULT 'personal' CHECK (ownership IN ('personal','collaborative')),
  is_subscribable  BOOLEAN DEFAULT false,
  subscriber_count INTEGER DEFAULT 0,
  visibility       TEXT DEFAULT 'private' CHECK (visibility IN ('private','link','public')),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS view_members (
  view_id    UUID REFERENCES saved_views(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT CHECK (role IN ('owner','editor','subscriber')),
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (view_id, user_id)
);

-- ============================================================
-- 12. 구독 & 토큰
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  plan                 TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','team')),
  token_limit          INTEGER NOT NULL DEFAULT 100,
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end   TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS token_usage (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  operation        TEXT NOT NULL,  -- 'chat','view_gen','embed'
  tokens_used      INTEGER NOT NULL DEFAULT 1,
  llm_tokens_actual INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. 집단지성 검토
-- ============================================================

CREATE TABLE IF NOT EXISTS verification_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id      UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  triple_id    UUID REFERENCES triples(id),
  reason       TEXT NOT NULL CHECK (reason IN ('auto_flagged','user_reported','admin_flagged')),
  status       TEXT DEFAULT 'open' CHECK (status IN (
                 'open','approved','rejected','escalated','resolved'
               )),
  vote_approve INTEGER DEFAULT 0,
  vote_reject  INTEGER DEFAULT 0,
  vote_unsure  INTEGER DEFAULT 0,
  threshold    INTEGER DEFAULT 5,
  created_at   TIMESTAMPTZ DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS verification_votes (
  request_id  UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vote        TEXT NOT NULL CHECK (vote IN ('approve','reject','unsure')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (request_id, user_id)
);

-- ============================================================
-- 14. 관리자 노드 참조
-- ============================================================

CREATE TABLE IF NOT EXISTS user_node_refs (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  node_id    UUID REFERENCES data_nodes(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, node_id)
);

-- ============================================================
-- 15. 비용 추적
-- ============================================================

CREATE TABLE IF NOT EXISTS api_cost_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation   TEXT NOT NULL,
  model       TEXT NOT NULL,
  tokens      INTEGER,
  cost_usd    NUMERIC(10,6),
  user_id     UUID REFERENCES profiles(id),
  node_id     UUID REFERENCES data_nodes(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 16. OU 채팅 (/messages)
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id  UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES profiles(id),
  content     TEXT,
  node_id     UUID REFERENCES data_nodes(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 17. 마켓플레이스
-- ============================================================

CREATE TABLE IF NOT EXISTS market_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID REFERENCES profiles(id),
  view_id        UUID REFERENCES saved_views(id),
  name           TEXT NOT NULL,
  description    TEXT,
  price_krw      INTEGER DEFAULT 0,
  thumbnail_url  TEXT,
  purchase_count INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID REFERENCES market_items(id),
  buyer_id    UUID REFERENCES profiles(id),
  price_paid  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 18. 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS sentences_embedding_idx
  ON sentences USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS data_nodes_user_domain_idx
  ON data_nodes (user_id, domain);
CREATE INDEX IF NOT EXISTS data_nodes_group_idx
  ON data_nodes (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS data_nodes_visibility_idx
  ON data_nodes (visibility);
CREATE INDEX IF NOT EXISTS triples_node_idx
  ON triples (node_id);
CREATE INDEX IF NOT EXISTS triples_subject_idx
  ON triples (subject);
CREATE INDEX IF NOT EXISTS triples_predicate_idx
  ON triples (predicate);
CREATE INDEX IF NOT EXISTS node_relations_source_idx
  ON node_relations (source_node_id);
CREATE INDEX IF NOT EXISTS node_relations_target_idx
  ON node_relations (target_node_id);
CREATE INDEX IF NOT EXISTS unresolved_user_status_idx
  ON unresolved_entities (user_id, resolution_status);
CREATE INDEX IF NOT EXISTS embed_status_idx
  ON sentences (embed_status) WHERE embed_status != 'done';
CREATE INDEX IF NOT EXISTS token_usage_user_created_idx
  ON token_usage (user_id, created_at);
CREATE INDEX IF NOT EXISTS verification_requests_status_idx
  ON verification_requests (status) WHERE status = 'open';

-- ============================================================
-- 19. RLS (Row Level Security)
-- ============================================================

ALTER TABLE data_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE triples ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE unresolved_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- data_nodes
CREATE POLICY "nodes_select" ON data_nodes
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_admin_node = true
    OR visibility = 'public'
  );
CREATE POLICY "nodes_insert" ON data_nodes
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "nodes_update" ON data_nodes
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "nodes_delete" ON data_nodes
  FOR DELETE USING (user_id = auth.uid());

-- messages
CREATE POLICY "messages_own" ON messages
  FOR ALL USING (user_id = auth.uid());

-- triples
CREATE POLICY "triples_via_node" ON triples
  FOR SELECT USING (
    node_id IN (
      SELECT id FROM data_nodes
      WHERE user_id = auth.uid() OR is_admin_node = true OR visibility = 'public'
    )
  );
CREATE POLICY "triples_insert" ON triples
  FOR INSERT WITH CHECK (
    node_id IN (SELECT id FROM data_nodes WHERE user_id = auth.uid())
  );

-- sentences
CREATE POLICY "sentences_via_node" ON sentences
  FOR SELECT USING (
    node_id IN (
      SELECT id FROM data_nodes
      WHERE user_id = auth.uid() OR is_admin_node = true OR visibility = 'public'
    )
  );
CREATE POLICY "sentences_insert" ON sentences
  FOR INSERT WITH CHECK (
    node_id IN (SELECT id FROM data_nodes WHERE user_id = auth.uid())
  );
CREATE POLICY "sentences_update" ON sentences
  FOR UPDATE USING (
    node_id IN (SELECT id FROM data_nodes WHERE user_id = auth.uid())
  );

-- sections
CREATE POLICY "sections_via_node" ON sections
  FOR SELECT USING (
    node_id IN (
      SELECT id FROM data_nodes
      WHERE user_id = auth.uid() OR is_admin_node = true OR visibility = 'public'
    )
  );
CREATE POLICY "sections_insert" ON sections
  FOR INSERT WITH CHECK (
    node_id IN (SELECT id FROM data_nodes WHERE user_id = auth.uid())
  );

-- saved_views
CREATE POLICY "views_own" ON saved_views
  FOR ALL USING (user_id = auth.uid() OR visibility = 'public');

-- unresolved_entities
CREATE POLICY "unresolved_own" ON unresolved_entities
  FOR ALL USING (user_id = auth.uid());

-- token_usage
CREATE POLICY "token_usage_own" ON token_usage
  FOR ALL USING (user_id = auth.uid());

-- subscriptions
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- chat_messages (채팅방 멤버만)
CREATE POLICY "chat_messages_room_members" ON chat_messages
  FOR ALL USING (
    room_id IN (
      SELECT room_id FROM chat_room_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 20. 신규 가입 자동 처리 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 1. profiles 생성
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Free 구독 생성
  INSERT INTO public.subscriptions (user_id, plan, token_limit)
  VALUES (NEW.id, 'free', 100)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 21. 벡터 유사도 검색 함수
-- ============================================================

CREATE OR REPLACE FUNCTION match_sentences(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE(node_id uuid, text text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT
    s.node_id,
    s.text,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM sentences s
  JOIN data_nodes n ON s.node_id = n.id
  WHERE
    n.user_id = p_user_id
    AND s.embed_status = 'done'
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ============================================================
-- 완료
-- ============================================================

-- MCP 자동 대화 수집을 위한 API Key 시스템
-- 실행: Supabase 대시보드 SQL Editor에서 실행

-- 1. API Keys 테이블
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{mcp:write,mcp:read}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_hash_idx
  ON api_keys (key_hash) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS api_keys_user_idx
  ON api_keys (user_id) WHERE revoked_at IS NULL;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_own" ON api_keys
  FOR ALL USING (user_id = auth.uid());

GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_keys TO service_role;

-- 2. data_nodes.source_type CHECK 업데이트 (mcp, dev_tool 추가)
ALTER TABLE data_nodes DROP CONSTRAINT IF EXISTS data_nodes_source_type_check;
ALTER TABLE data_nodes ADD CONSTRAINT data_nodes_source_type_check
  CHECK (source_type IN ('chat','upload','youtube','crawl','manual','dev_tool','mcp'));

-- 3. messages.type CHECK 업데이트 (mcp_session, dev_session 추가)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('chat','question','answer','dev_session','mcp_session'));

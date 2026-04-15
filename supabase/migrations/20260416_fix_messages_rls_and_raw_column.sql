-- Fix Layer2 insert errors (2026-04-16)
-- 1. messages: RLS INSERT 권한 누락 → 개별 정책 분리
-- 2. data_nodes: raw 컬럼 미존재 → 추가

-- ============================================================
-- 1. messages RLS: FOR ALL → 개별 정책으로 분리
-- ============================================================
DROP POLICY IF EXISTS "messages_own" ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 2. data_nodes: raw 컬럼 추가
-- ============================================================
ALTER TABLE data_nodes ADD COLUMN IF NOT EXISTS raw TEXT;

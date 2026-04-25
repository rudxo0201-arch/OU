-- Phase 1 폴더 시스템 + visibility
-- bundle_paths: 수동 폴더 경로 배열 (예: ['/공부', '/CS'])
-- parent_id:    sub-page 트리용 부모 노드 참조
-- visibility:   'visible' | 'stealth' | 'admin_only'

ALTER TABLE data_nodes
  ADD COLUMN IF NOT EXISTS bundle_paths text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES data_nodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'visible'
    CHECK (visibility IN ('visible', 'stealth', 'admin_only'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS folder_tree jsonb DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_data_nodes_bundle_paths
  ON data_nodes USING gin(bundle_paths);

CREATE INDEX IF NOT EXISTS idx_data_nodes_parent_id
  ON data_nodes(parent_id);

CREATE INDEX IF NOT EXISTS idx_data_nodes_domain
  ON data_nodes(domain);

CREATE INDEX IF NOT EXISTS idx_data_nodes_visibility
  ON data_nodes(visibility);

-- stealth 도메인 기본 적용 (emotion 등)
UPDATE data_nodes
  SET visibility = 'stealth'
  WHERE domain IN ('emotion', 'behavior_pattern')
    AND visibility = 'visible';

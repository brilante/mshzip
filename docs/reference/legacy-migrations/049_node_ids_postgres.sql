-- PostgreSQL version of 049_node_ids.sql
-- Auto-converted from SQLite

-- 049_node_ids.sql
-- 노드 ID 레지스트리 (10자 고유 ID 지원)
-- Created: 2026-01-28

-- 노드 ID 저장 테이블
-- 사용자별 유니크 (다른 사용자는 같은 ID 가질 수 있음)
CREATE TABLE IF NOT EXISTS node_ids (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mindmap_id VARCHAR(255) NOT NULL,
  node_id VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 사용자별 유니크 제약
  UNIQUE(user_id, node_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_node_ids_user_id ON node_ids(user_id);
CREATE INDEX IF NOT EXISTS idx_node_ids_node_id ON node_ids(node_id);
CREATE INDEX IF NOT EXISTS idx_node_ids_mindmap ON node_ids(user_id, mindmap_id);

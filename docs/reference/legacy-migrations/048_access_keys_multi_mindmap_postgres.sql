-- PostgreSQL version of 048_access_keys_multi_mindmap.sql
-- Auto-converted from SQLite

-- 048_access_keys_multi_mindmap.sql
-- Access Key 다중 마인드맵 접근 지원
-- Created: 2026-01-28

-- 1. access_keys 테이블에 scope 컬럼 추가
-- scope: 'all' (전체 마인드맵) | 'whitelist' (선택한 마인드맵만)
DO $$ BEGIN
  ALTER TABLE access_keys ADD COLUMN scope VARCHAR(10) DEFAULT 'all';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. 마인드맵 화이트리스트 테이블 생성
CREATE TABLE IF NOT EXISTS access_key_mindmaps (
  id SERIAL PRIMARY KEY,
  access_key_id INTEGER NOT NULL,
  mindmap_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (access_key_id) REFERENCES access_keys(id) ON DELETE CASCADE,
  UNIQUE(access_key_id, mindmap_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_akm_access_key_id ON access_key_mindmaps(access_key_id);
CREATE INDEX IF NOT EXISTS idx_akm_mindmap_id ON access_key_mindmaps(mindmap_id);

-- 3. 기존 데이터 마이그레이션
-- 기존 키의 mindmap_id를 화이트리스트 테이블로 이동
INSERT INTO access_key_mindmaps (access_key_id, mindmap_id)
SELECT id, mindmap_id FROM access_keys
WHERE mindmap_id IS NOT NULL AND mindmap_id != '' ON CONFLICT DO NOTHING;

-- 기존 키의 scope를 'whitelist'로 설정 (기존 방식 유지)
UPDATE access_keys SET scope = 'whitelist'
WHERE mindmap_id IS NOT NULL AND mindmap_id != '';

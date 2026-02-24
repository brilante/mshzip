-- 050_access_keys_fix_mindmap_nullable_postgres.sql
-- access_keys.mindmap_id NOT NULL 제약 제거 (scope='all' 지원)
-- Created: 2026-01-28
-- Updated: 2026-02-19 - PostgreSQL 네이티브 ALTER COLUMN 사용

-- PostgreSQL은 ALTER COLUMN을 지원하므로 간단히 NOT NULL 제약만 제거
ALTER TABLE access_keys ALTER COLUMN mindmap_id DROP NOT NULL;

-- scope 기본값 설정 (없으면 추가)
ALTER TABLE access_keys ALTER COLUMN scope SET DEFAULT 'all';

-- 인덱스 (없으면 생성)
CREATE INDEX IF NOT EXISTS idx_ak_user_id ON access_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ak_key_hash ON access_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_ak_key_id ON access_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_ak_scope ON access_keys(scope);

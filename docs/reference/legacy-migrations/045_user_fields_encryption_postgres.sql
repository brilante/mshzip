-- 045: 사용자 개인정보 필드 암호화를 위한 해시 컬럼 추가 (PostgreSQL)
-- username, google_id, facebook_id 검색용 해시 컬럼
-- AES-256-GCM 암호화된 필드는 검색 불가하므로 SHA-256 해시로 검색

-- 해시 컬럼 추가 (PostgreSQL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id_hash TEXT;

-- 인덱스 생성 (검색 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_username_hash ON users(username_hash);
CREATE INDEX IF NOT EXISTS idx_users_google_id_hash ON users(google_id_hash);
CREATE INDEX IF NOT EXISTS idx_users_facebook_id_hash ON users(facebook_id_hash);

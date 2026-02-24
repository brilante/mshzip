-- Facebook OAuth 연동을 위한 컬럼 추가 (PostgreSQL)
-- 실행일: 2026-01-13

-- users 테이블에 facebook_id 컬럼 추가 (이미 존재하면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'facebook_id'
  ) THEN
    ALTER TABLE users ADD COLUMN facebook_id VARCHAR(255);
  END IF;
END $$;

-- facebook_id 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);

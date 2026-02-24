-- =============================================
-- Migration 039: TOTP 2FA System (PostgreSQL)
-- Google Authenticator 호환 2차 인증
-- =============================================

-- users 테이블에 TOTP 관련 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;

-- 백업 코드 테이블 생성
CREATE TABLE IF NOT EXISTS backup_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code_hash TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_code_hash ON backup_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON users(totp_enabled);

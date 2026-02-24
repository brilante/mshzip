-- PostgreSQL version of 013_admin_users.sql
-- Auto-converted from SQLite

-- 관리자 사용자 테이블
-- MyMind3 관리자 인증 시스템을 위한 DB 스키마
-- 작성일: 2025-12-06

-- admin_users 테이블
-- users.json의 사용자와 연결되어 관리자 권한을 부여
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,           -- users.json의 username과 연결
    admin_password TEXT NOT NULL,           -- SHA256 해시된 비밀번호
    is_active INTEGER DEFAULT 1,            -- 관리자 권한 활성화 여부 (1=활성, 0=비활성)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_verified_at TIMESTAMP,              -- 마지막 인증 시간
    failed_attempts INTEGER DEFAULT 0,      -- 연속 실패 횟수
    locked_until TIMESTAMP                   -- 잠금 해제 시간 (5회 실패 시 5분 잠금)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- 기본 관리자 추가
-- 비밀번호: "1" → SHA256 해시
-- SHA256("1") = 6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b
INSERT INTO admin_users (user_id, admin_password)
VALUES ('brilante33', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b') ON CONFLICT DO NOTHING;

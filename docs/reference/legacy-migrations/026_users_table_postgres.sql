-- =============================================
-- Migration 026: Users Table (PostgreSQL Version)
-- users.json -> Database Migration
-- 사용자 인증 정보를 DB에 저장
-- =============================================

-- 사용자 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    display_name VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'local',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 기존 users.json 데이터 마이그레이션
-- bril 사용자 (로컬 계정)
INSERT INTO users (username, email, password, auth_provider, created_at)
VALUES ('bril', 'bril@test.com', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'local', CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- brilante33 사용자 (Google 계정)
INSERT INTO users (username, email, password, google_id, display_name, auth_provider, created_at, last_login)
VALUES ('brilante33', 'brilante33@gmail.com', 'fd4289c011a2001d4ca0cc8e071da920c74d6a5fa2c68d838d82a6c3965d936c', '105916885407042629728', 'OngDalm', 'google', '2025-12-17T15:35:39.665Z', '2025-12-30T05:46:05.672Z')
ON CONFLICT (username) DO NOTHING;

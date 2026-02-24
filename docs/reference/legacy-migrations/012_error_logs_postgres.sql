-- PostgreSQL version of 012_error_logs.sql
-- Auto-converted from SQLite

-- 에러 로그 테이블
-- MyMind3 에러 로깅 시스템을 위한 DB 스키마
-- 작성일: 2025-12-06

CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    error_id TEXT UNIQUE NOT NULL,
    level TEXT NOT NULL,
    level_num INTEGER NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    source TEXT,
    user_id TEXT,
    request_id TEXT,
    request_path TEXT,
    extra TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retention_days INTEGER,
    expires_at TIMESTAMP,
    is_resolved INTEGER DEFAULT 0
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level_num);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_expires ON error_logs(expires_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);

-- PostgreSQL version of 008_google_drive.sql
-- Auto-converted from SQLite

-- 008_google_drive.sql
-- 사용자 드라이브 설정 테이블
-- 생성일: 2025-12-05

CREATE TABLE IF NOT EXISTS user_drive_settings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  drive_enabled INTEGER DEFAULT 0,
  drive_path TEXT DEFAULT '/MyMind3/saves',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expiry TIMESTAMP,
  last_sync TIMESTAMP,
  sync_mode TEXT DEFAULT 'two-way-manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drive_settings_user ON user_drive_settings(user_id);

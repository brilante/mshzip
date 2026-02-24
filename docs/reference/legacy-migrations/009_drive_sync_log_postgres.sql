-- PostgreSQL version of 009_drive_sync_log.sql
-- Auto-converted from SQLite

-- 009_drive_sync_log.sql
-- 동기화 로그 테이블
-- 생성일: 2025-12-05

CREATE TABLE IF NOT EXISTS drive_sync_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  file_path TEXT,
  file_count INTEGER DEFAULT 1,
  total_size INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user ON drive_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON drive_sync_log(status);

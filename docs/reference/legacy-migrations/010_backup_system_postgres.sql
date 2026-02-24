-- PostgreSQL version of 010_backup_system.sql
-- Auto-converted from SQLite

-- 010_backup_system.sql
-- 백업 스케줄 및 히스토리 테이블
-- 생성일: 2025-12-05

-- 백업 스케줄 테이블
CREATE TABLE IF NOT EXISTS user_backup_schedule (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  first_login TIMESTAMP NOT NULL,
  next_backup TIMESTAMP,
  backup_interval INTEGER DEFAULT 86400000,
  last_backup TIMESTAMP,
  backup_count INTEGER DEFAULT 0,
  max_backups INTEGER DEFAULT 7,
  is_drive_user INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 백업 히스토리 테이블
CREATE TABLE IF NOT EXISTS backup_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  backup_path TEXT NOT NULL,
  backup_size INTEGER,
  mindmap_count INTEGER,
  node_count INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_schedule_user ON user_backup_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_user ON backup_history(user_id);

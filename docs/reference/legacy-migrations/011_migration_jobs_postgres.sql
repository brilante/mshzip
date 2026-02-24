-- PostgreSQL version of 011_migration_jobs.sql
-- Auto-converted from SQLite

-- 011_migration_jobs.sql
-- 마이그레이션 작업 테이블
-- 생성일: 2025-12-05

CREATE TABLE IF NOT EXISTS migration_jobs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  total_files INTEGER,
  processed_files INTEGER DEFAULT 0,
  total_size INTEGER,
  processed_size INTEGER DEFAULT 0,
  selected_mindmaps TEXT,
  delete_source INTEGER DEFAULT 0,
  rollback_path TEXT,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_migration_jobs_user ON migration_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_status ON migration_jobs(status);

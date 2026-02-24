-- PostgreSQL version of 060_skill_api_pricing.sql
-- Auto-converted from SQLite

-- 060: Skill API 과금 시스템
-- Access Key를 통한 Skill API 호출 사용량 추적

CREATE TABLE IF NOT EXISTS skill_api_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_key_id INTEGER,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  node_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saul_user ON skill_api_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_saul_key ON skill_api_usage_logs(access_key_id, created_at);

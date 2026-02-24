-- PostgreSQL version of 047_access_keys.sql
-- Auto-converted from SQLite

-- Access Keys 테이블
-- Claude Code Agent Skills용 API 키 관리

CREATE TABLE IF NOT EXISTS access_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(50) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  key_id VARCHAR(16) NOT NULL UNIQUE,
  mindmap_id VARCHAR(255) NOT NULL,
  permission VARCHAR(10) NOT NULL DEFAULT 'read',
  ip_whitelist TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  is_active INTEGER DEFAULT 1,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_access_keys_user_id ON access_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_access_keys_key_hash ON access_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_access_keys_key_id ON access_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_access_keys_mindmap_id ON access_keys(mindmap_id);
CREATE INDEX IF NOT EXISTS idx_access_keys_is_active ON access_keys(is_active);

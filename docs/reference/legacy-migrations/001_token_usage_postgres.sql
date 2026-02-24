-- PostgreSQL version of 001_token_usage.sql
-- Auto-converted from SQLite

-- ============================================
-- Token Usage 테이블 - AI 토큰 사용량 추적
-- ============================================
CREATE TABLE IF NOT EXISTS token_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,  -- users.json의 username
  service TEXT NOT NULL,  -- 'openai', 'anthropic', 'google', 'xai', 'local'
  model TEXT NOT NULL,  -- 'gpt-4', 'claude-opus', etc.
  request_tokens INTEGER DEFAULT 0,
  response_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0.0,  -- 예상 비용 (USD)
  request_type TEXT,  -- 'chat', 'completion', 'embedding'
  mindmap_id TEXT,  -- 어느 마인드맵에서 사용했는지 (선택사항)
  node_id TEXT,  -- 어느 노드에서 사용했는지 (선택사항)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_token_usage_user_created ON token_usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_service ON token_usage(service, model);
CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage(created_at);

-- 월별 토큰 사용량 요약 뷰
CREATE VIEW IF NOT EXISTS monthly_token_usage AS
SELECT
  user_id,
  service,
  TO_CHAR(created_at, 'YYYY-MM') as month,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost) as total_cost,
  COUNT(*) as request_count
FROM token_usage
GROUP BY user_id, service, month;

-- 현재 월 사용량 뷰
CREATE VIEW IF NOT EXISTS current_month_usage AS
SELECT
  user_id,
  SUM(total_tokens) as monthly_tokens,
  SUM(estimated_cost) as monthly_cost,
  COUNT(*) as request_count
FROM token_usage
WHERE TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
GROUP BY user_id;

-- PostgreSQL version of 057_subscription_verification.sql
-- Auto-converted from SQLite

-- 057: 구독 결제 검증 로그 테이블
-- 결제 프로세스 V1~V10 검증 결과를 순차적으로 기록

-- 검증 실행 단위 (1회 검증 = 1 row)
CREATE TABLE IF NOT EXISTS subscription_verification_logs (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT,
  run_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  total_steps INTEGER DEFAULT 10,
  passed_steps INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK(status IN ('running', 'passed', 'failed')),
  failed_at_step TEXT
);

CREATE INDEX IF NOT EXISTS idx_sv_logs_session ON subscription_verification_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_sv_logs_run ON subscription_verification_logs(run_id);

-- 검증 단계별 결과 (V1~V10 각각 1 row)
CREATE TABLE IF NOT EXISTS subscription_verification_steps (
  id SERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_code TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'passed', 'failed', 'skipped')),
  result_json TEXT,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES subscription_verification_logs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_sv_steps_run ON subscription_verification_steps(run_id);

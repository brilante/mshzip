-- PostgreSQL version of 059_payment_verification_alerts.sql
-- Auto-converted from SQLite

-- 059: 결제 검증 알림 테이블
-- 검증 실패/자동복구 시 사용자에게 알림을 보내기 위한 테이블

CREATE TABLE IF NOT EXISTS payment_verification_alerts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  run_id TEXT,
  alert_type TEXT NOT NULL CHECK(alert_type IN ('verification_failed', 'remediation_success', 'remediation_failed', 'manual_review_needed')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK(severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  step_code TEXT,
  verify_type TEXT,
  acknowledged INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pva_user ON payment_verification_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_pva_unread ON payment_verification_alerts(user_id, acknowledged);

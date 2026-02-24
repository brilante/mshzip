-- PostgreSQL version of 052_paid_credit_batches.sql
-- Auto-converted from SQLite

-- ============================================
-- FIFO 유료 크레딧 배치 시스템 (v8.0)
-- 각 구매를 개별 배치로 추적
-- 구매일 + 365일 후 개별 만료
-- 선입선출(FIFO) 차감 순서
-- ============================================

-- 1. 유료 크레딧 배치 테이블
CREATE TABLE IF NOT EXISTS paid_credit_batches (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  purchase_log_id INTEGER,              -- credit_purchase_logs.id 참조
  original_amount INTEGER NOT NULL,     -- 최초 구매 크레딧
  remaining_amount INTEGER NOT NULL,    -- 현재 잔여 크레딧
  purchased_at TIMESTAMP NOT NULL,       -- 구매 시점
  expires_at DATE NOT NULL,             -- 만료일 (purchased_at + 365일)
  status TEXT DEFAULT 'active'
    CHECK(status IN ('active', 'exhausted', 'expired')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users_credits(user_id),
  FOREIGN KEY (purchase_log_id) REFERENCES credit_purchase_logs(id)
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_paid_batches_user_status
  ON paid_credit_batches(user_id, status);
CREATE INDEX IF NOT EXISTS idx_paid_batches_expires
  ON paid_credit_batches(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_paid_batches_fifo
  ON paid_credit_batches(user_id, status, purchased_at);

-- PostgreSQL version of 017_add_credit_tier_purchase_type.sql
-- Auto-converted from SQLite

-- Migration 017: Add 'credit_tier' to purchase_type CHECK constraint
-- Date: 2025-12-11
-- Description: Phase 3 단독 구매 10단계 시스템을 위한 purchase_type 추가
-- Note: SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- 1. Rename old table
ALTER TABLE credit_purchase_logs RENAME TO credit_purchase_logs_old;

-- 2. Create new table with updated CHECK constraint (credit_tier 추가)
CREATE TABLE credit_purchase_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- 구매 유형 (credit_tier 추가)
  purchase_type TEXT NOT NULL CHECK(purchase_type IN ('subscription', 'subscription_upgrade', 'credit_only', 'cancellation', 'downgrade', 'credit_tier')),
  package_type TEXT,                        -- 'only', 'plus10', 'plus30', 'plus60', 'credit_purchase', 'tier_1' ~ 'tier_10'

  -- 금액 및 크레딧
  amount_usd REAL NOT NULL,
  credit_amount INTEGER NOT NULL,
  bonus_rate REAL DEFAULT 0,
  bonus_credits INTEGER DEFAULT 0,

  -- 결제 정보
  payment_method TEXT,                      -- 'stripe', 'paypal', 'test', etc.
  payment_status TEXT DEFAULT 'pending',    -- 'pending', 'completed', 'failed', 'refunded'
  transaction_id TEXT,

  -- 타임스탬프
  purchase_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Copy data from old table
INSERT INTO credit_purchase_logs
  (id, user_id, purchase_type, package_type, amount_usd, credit_amount, bonus_rate, bonus_credits, payment_method, payment_status, transaction_id, purchase_timestamp)
SELECT
  id, user_id, purchase_type, package_type, amount_usd, credit_amount, bonus_rate, bonus_credits, payment_method, payment_status, transaction_id, purchase_timestamp
FROM credit_purchase_logs_old;

-- 4. Drop old table
DROP TABLE credit_purchase_logs_old;

-- 5. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_purchase_logs_user_id ON credit_purchase_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_logs_purchase_type ON credit_purchase_logs(purchase_type);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_logs_timestamp ON credit_purchase_logs(purchase_timestamp);

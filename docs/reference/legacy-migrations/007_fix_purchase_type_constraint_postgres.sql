-- PostgreSQL version of 007_fix_purchase_type_constraint.sql
-- Auto-converted from SQLite

-- Migration: 007_fix_purchase_type_constraint.sql
-- Fix CHECK constraint for purchase_type to allow 'subscription_upgrade' and 'cancellation'

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- 1. Rename old table
ALTER TABLE credit_purchase_logs RENAME TO credit_purchase_logs_old;

-- 2. Create new table with updated CHECK constraint
CREATE TABLE credit_purchase_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- 구매 유형 (subscription_upgrade, cancellation 추가)
  purchase_type TEXT NOT NULL CHECK(purchase_type IN ('subscription', 'subscription_upgrade', 'credit_only', 'cancellation')),
  package_type TEXT,                        -- 'only', 'plus10', 'plus30', 'plus60', 'credit_purchase'

  -- 금액 및 크레딧
  amount_usd REAL NOT NULL,                 -- USD 기준 금액
  credit_amount INTEGER NOT NULL,           -- 지급된 크레딧
  bonus_rate REAL DEFAULT 0,                -- 보너스율 (0.03, 0.05, 0.07)
  bonus_credits INTEGER DEFAULT 0,          -- 보너스 크레딧

  -- 결제 정보
  payment_method TEXT,                      -- 'card', 'paypal', etc.
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id TEXT,

  -- 타임스탬프
  purchase_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users_credits(user_id)
);

-- 3. Copy data from old table
INSERT INTO credit_purchase_logs
  (id, user_id, purchase_type, package_type, amount_usd, credit_amount, bonus_rate, bonus_credits, payment_method, payment_status, transaction_id, purchase_timestamp)
SELECT
  id, user_id, purchase_type, package_type, amount_usd, credit_amount, bonus_rate, bonus_credits, payment_method, payment_status, transaction_id, purchase_timestamp
FROM credit_purchase_logs_old;

-- 4. Drop old table
DROP TABLE credit_purchase_logs_old;

-- 5. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_purchase_logs_user_id ON credit_purchase_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_logs_purchase_type ON credit_purchase_logs(purchase_type);

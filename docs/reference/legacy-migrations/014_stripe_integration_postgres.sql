-- PostgreSQL version of 014_stripe_integration.sql
-- Auto-converted from SQLite

-- ================================================
-- Stripe 결제 시스템 통합 마이그레이션
-- 버전: 1.0
-- 날짜: 2025-12-08
-- 설명: 기존 크레딧 시스템에 Stripe 결제 통합
-- ================================================

-- 1. 기존 credit_purchase_logs 테이블에 Stripe 컬럼 추가
-- 이미 존재하는 컬럼이면 무시됨 (SQLite는 IF NOT EXISTS 미지원, 에러 무시)

-- Stripe Payment Intent ID
DO $$ BEGIN
  ALTER TABLE credit_purchase_logs ADD COLUMN stripe_payment_intent_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Stripe Checkout Session ID
DO $$ BEGIN
  ALTER TABLE credit_purchase_logs ADD COLUMN stripe_checkout_session_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Stripe Charge ID
DO $$ BEGIN
  ALTER TABLE credit_purchase_logs ADD COLUMN stripe_charge_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Stripe Refund ID (환불 시)
DO $$ BEGIN
  ALTER TABLE credit_purchase_logs ADD COLUMN stripe_refund_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Webhook 처리 시간
DO $$ BEGIN
  ALTER TABLE credit_purchase_logs ADD COLUMN webhook_processed_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. 기존 users_credits 테이블에 Stripe 컬럼 추가

-- Stripe Customer ID
DO $$ BEGIN
  ALTER TABLE users_credits ADD COLUMN stripe_customer_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Stripe Subscription ID
DO $$ BEGIN
  ALTER TABLE users_credits ADD COLUMN stripe_subscription_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Stripe Webhook 이벤트 로그 (중복 처리 방지)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id SERIAL PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,           -- Stripe 이벤트 ID (evt_xxx)
    event_type TEXT NOT NULL,                -- checkout.session.completed, payment_intent.succeeded 등
    processed INTEGER DEFAULT 0,             -- 처리 완료 여부 (0: 미처리, 1: 처리완료)
    payload TEXT,                            -- 이벤트 페이로드 (JSON)
    error_message TEXT,                      -- 처리 실패 시 에러 메시지
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP                    -- 처리 완료 시간
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_purchase_logs_stripe_pi
  ON credit_purchase_logs(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_purchase_logs_stripe_session
  ON credit_purchase_logs(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer
  ON users_credits(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_id
  ON stripe_webhook_events(event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_type
  ON stripe_webhook_events(event_type, processed);

-- ================================================
-- Credit Purchase Logs 암호화 마이그레이션 (PostgreSQL)
-- 버전: 1.0
-- 날짜: 2026-01-20
-- 설명: credit_purchase_logs Stripe ID 암호화
-- ================================================

-- 1. 누락된 Stripe 컬럼 추가
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS webhook_processed_at TIMESTAMP;

-- 2. 암호화된 컬럼 추가
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS stripe_checkout_session_id_encrypted TEXT;
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS stripe_payment_intent_id_encrypted TEXT;
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS stripe_charge_id_encrypted TEXT;
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS stripe_refund_id_encrypted TEXT;
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS transaction_id_encrypted TEXT;

-- 3. 암호화 메타데이터
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS encryption_iv TEXT;
ALTER TABLE credit_purchase_logs ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 0;

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_purchase_logs_encryption_version
  ON credit_purchase_logs(encryption_version);

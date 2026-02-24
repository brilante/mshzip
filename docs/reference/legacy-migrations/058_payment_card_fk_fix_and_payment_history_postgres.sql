-- 058_payment_card_fk_fix_and_payment_history_postgres.sql
-- 1. payment_card_details FK 수정: users(id) → users_credits(user_id)
-- 2. payment_history 테이블 생성 (환불 이력)
-- 생성일: 2026-02-13

-- ============================================================
-- 1. payment_card_details FK 수정
--    PostgreSQL은 ALTER TABLE로 FK 변경 가능
-- ============================================================

-- 기존 FK 제거
ALTER TABLE payment_card_details DROP CONSTRAINT IF EXISTS fk_payment_card_user;

-- 새 FK 추가: users_credits(user_id) 참조
ALTER TABLE payment_card_details
  ADD CONSTRAINT fk_payment_card_user
  FOREIGN KEY (user_id) REFERENCES users_credits(user_id) ON DELETE CASCADE;

-- ============================================================
-- 2. payment_history 테이블 생성
--    결제/환불 이력 관리 (Stripe 연동)
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  payment_type TEXT NOT NULL,              -- 'credit', 'subscription', 'refund', 'upgrade'
  amount_usd REAL DEFAULT 0,              -- USD 금액 (환불 시 음수)
  amount_original REAL DEFAULT 0,         -- 원래 통화 금액
  currency TEXT DEFAULT 'USD',            -- 통화 코드
  status TEXT DEFAULT 'pending',          -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_intent_id TEXT,          -- Stripe PaymentIntent ID
  service_credits REAL DEFAULT 0,         -- 관련 서비스 크레딧 (환불 시 음수)
  description TEXT,                       -- 결제/환불 설명
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_type ON payment_history(payment_type);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_pi ON payment_history(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_payment_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_payment_history_updated ON payment_history;
CREATE TRIGGER tr_payment_history_updated
  BEFORE UPDATE ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_history_timestamp();

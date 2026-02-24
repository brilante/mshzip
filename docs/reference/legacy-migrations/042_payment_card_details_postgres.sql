-- 042_payment_card_details_postgres.sql
-- Stripe 결제 카드 정보 암호화 저장 테이블 (PostgreSQL 버전)
-- 생성일: 2026-01-19

-- 결제 카드 상세 정보 테이블 (암호화 저장)
CREATE TABLE IF NOT EXISTS payment_card_details (
  id SERIAL PRIMARY KEY,

  -- 연결 정보
  user_id TEXT NOT NULL,
  purchase_log_id INTEGER,                    -- credit_purchase_logs.id 참조

  -- Stripe 식별자
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_payment_method_id TEXT,

  -- 카드 정보 (암호화됨)
  card_brand TEXT,                            -- visa, mastercard, amex 등
  card_last4_encrypted TEXT,                  -- 마지막 4자리 (암호화)
  card_exp_month_encrypted TEXT,              -- 만료월 (암호화)
  card_exp_year_encrypted TEXT,               -- 만료년 (암호화)
  card_funding TEXT,                          -- credit, debit, prepaid
  card_network TEXT,                          -- visa, mastercard 등

  -- 카드 발급 정보
  card_issuer_country TEXT,                   -- 카드 발급 국가 (2자리 ISO 코드)
  card_issuer_name_encrypted TEXT,            -- 발급 기관명 (암호화)
  is_foreign_card SMALLINT DEFAULT 0,         -- 국외 카드 여부 (1=국외, 0=국내)

  -- 청구 주소 (암호화됨)
  billing_country TEXT,                       -- 청구 국가 (2자리 ISO 코드)
  billing_postal_code_encrypted TEXT,         -- 우편번호 (암호화)
  billing_city_encrypted TEXT,                -- 도시 (암호화)
  billing_address_encrypted TEXT,             -- 주소 (암호화)

  -- 결제 정보
  amount_paid INTEGER,                        -- 결제 금액 (센트 단위)
  currency TEXT,                              -- 통화 코드 (usd, krw 등)
  payment_status TEXT DEFAULT 'succeeded',    -- succeeded, failed, pending

  -- 암호화 메타데이터
  encryption_version INTEGER DEFAULT 1,       -- 암호화 버전 (추후 키 로테이션용)
  encryption_iv TEXT,                         -- 초기화 벡터 (각 레코드별 고유)

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 외래키
  CONSTRAINT fk_payment_card_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_card_purchase FOREIGN KEY (purchase_log_id) REFERENCES credit_purchase_logs(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payment_card_details_user_id ON payment_card_details(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_card_details_stripe_payment_intent ON payment_card_details(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_card_details_stripe_charge ON payment_card_details(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_card_details_issuer_country ON payment_card_details(card_issuer_country);
CREATE INDEX IF NOT EXISTS idx_payment_card_details_is_foreign ON payment_card_details(is_foreign_card);
CREATE INDEX IF NOT EXISTS idx_payment_card_details_created_at ON payment_card_details(created_at);

-- 결제 카드 요약 뷰 (복호화 없이 조회용)
CREATE OR REPLACE VIEW v_payment_card_summary AS
SELECT
  pcd.id,
  pcd.user_id,
  pcd.stripe_charge_id,
  pcd.card_brand,
  pcd.card_funding,
  pcd.card_network,
  pcd.card_issuer_country,
  pcd.is_foreign_card,
  pcd.billing_country,
  pcd.amount_paid,
  pcd.currency,
  pcd.payment_status,
  pcd.created_at,
  cpl.purchase_type,
  cpl.package_type
FROM payment_card_details pcd
LEFT JOIN credit_purchase_logs cpl ON pcd.purchase_log_id = cpl.id;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_payment_card_details_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_payment_card_details_updated ON payment_card_details;
CREATE TRIGGER tr_payment_card_details_updated
  BEFORE UPDATE ON payment_card_details
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_card_details_timestamp();

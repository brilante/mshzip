-- PostgreSQL version of 006_credit_rate_system.sql
-- Auto-converted from SQLite

-- ============================================
-- 통합 크레딧 레이트 시스템 (v3.0)
-- AI 제공사별 토큰 가격 기반 크레딧 가격 자동 계산
-- ============================================

-- 1. 서비스별 가중치 및 기준 모델 설정 테이블
CREATE TABLE IF NOT EXISTS credit_rate_config (
  id SERIAL PRIMARY KEY,
  ai_service TEXT NOT NULL UNIQUE CHECK(ai_service IN ('gpt', 'claude', 'grok', 'gemini')),
  default_model TEXT NOT NULL,               -- 가격 계산 기준 모델
  usage_weight REAL NOT NULL DEFAULT 0.25,   -- 사용 비율 가중치 (합계 1.0)
  input_output_ratio REAL DEFAULT 2.0,       -- 입력:출력 비율 (2.0 = 2:1)
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 통합 크레딧 레이트 히스토리 테이블
CREATE TABLE IF NOT EXISTS unified_credit_rate (
  id SERIAL PRIMARY KEY,
  rate_per_usd INTEGER NOT NULL,              -- $1당 크레딧 수 (VAT+마진 미적용 원가 기준)
  rate_per_usd_net INTEGER NOT NULL,          -- $1당 크레딧 수 (VAT+마진 적용 후 순수 크레딧)
  weighted_avg_cost REAL NOT NULL,            -- 가중 평균 토큰 단가 ($/1K tokens)
  calculation_details TEXT,                   -- JSON: 계산 상세 내역
  is_current INTEGER DEFAULT 1,               -- 현재 적용 중인 레이트
  effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  effective_to TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 상품별 크레딧 발급량 테이블
CREATE TABLE IF NOT EXISTS product_credit_amounts (
  id SERIAL PRIMARY KEY,
  product_type TEXT NOT NULL UNIQUE,          -- 'plus10', 'plus30', 'plus60', 'credit_10', 'credit_30', 'credit_60'
  product_category TEXT NOT NULL CHECK(product_category IN ('subscription', 'credit_only')),
  price_usd REAL NOT NULL,                    -- 크레딧 구매 금액 (USD, 구독료 제외)
  base_credits INTEGER NOT NULL,              -- 기본 크레딧 (VAT+마진 적용 후)
  bonus_rate REAL DEFAULT 0,                  -- 보너스율 (0.03, 0.05, 0.07)
  bonus_credits INTEGER DEFAULT 0,            -- 보너스 크레딧
  total_credits INTEGER NOT NULL,             -- 총 크레딧 (기본 + 보너스)
  free_credits INTEGER DEFAULT 0,             -- 무료 크레딧 (구독 혜택, 구독 상품만)
  grand_total INTEGER NOT NULL,               -- 최종 합계 (총 크레딧 + 무료)
  unified_rate_id INTEGER,                    -- 적용된 통합 레이트 ID
  is_current INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unified_rate_id) REFERENCES unified_credit_rate(id)
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_credit_rate_config_service ON credit_rate_config(ai_service, is_active);
CREATE INDEX IF NOT EXISTS idx_unified_rate_current ON unified_credit_rate(is_current);
CREATE INDEX IF NOT EXISTS idx_product_credits_type ON product_credit_amounts(product_type, is_current);

-- 5. 초기 서비스별 가중치 설정 (예상 사용 비율 기반)
INSERT INTO credit_rate_config (ai_service, default_model, usage_weight, input_output_ratio) VALUES
('gpt', 'gpt-5-mini', 0.40, 2.0),           -- GPT: 40% 사용 예상
('claude', 'claude-haiku-4-5', 0.30, 2.0),  -- Claude: 30% 사용 예상
('grok', 'grok-3-mini', 0.15, 2.0),         -- Grok: 15% 사용 예상
('gemini', 'gemini-2.5-flash', 0.15, 2.0);  -- Gemini: 15% 사용 예상

-- 6. 초기 통합 레이트 계산 및 삽입
-- (실제 계산은 서비스에서 수행, 여기는 기본값)
-- 현재 시스템 기준: $1 = 75,757.58 크레딧 (VAT+마진 적용 후)
INSERT INTO unified_credit_rate (
  rate_per_usd,
  rate_per_usd_net,
  weighted_avg_cost,
  calculation_details,
  is_current
) VALUES (
  100000,      -- 원가 기준 $1 = 100,000 크레딧
  75758,       -- VAT+마진 적용 후 $1 = 75,758 크레딧
  0.00001,     -- 1 크레딧 = $0.00001
  '{"version": "3.0", "note": "Initial rate based on existing system", "formula": "판매가 × 75,757.58", "vat": 1.1, "margin": 1.2}',
  1
) ON CONFLICT DO NOTHING;

-- 7. 초기 상품별 크레딧 설정
-- 구독 패키지 상품
INSERT INTO product_credit_amounts (
  product_type, product_category, price_usd,
  base_credits, bonus_rate, bonus_credits, total_credits,
  free_credits, grand_total, unified_rate_id, is_current
) VALUES
-- only: 구독료만 ($3.3), 크레딧 구매 $0
('only', 'subscription', 0, 0, 0, 0, 0, 350000, 350000, 1, 1),
-- plus10: 구독료 + $10 크레딧
('plus10', 'subscription', 10, 757575, 0.03, 22727, 780302, 350000, 1130302, 1, 1),
-- plus30: 구독료 + $30 크레딧
('plus30', 'subscription', 30, 2272727, 0.05, 113636, 2386363, 350000, 2736363, 1, 1),
-- plus60: 구독료 + $60 크레딧
('plus60', 'subscription', 60, 4545454, 0.07, 318181, 4863635, 350000, 5213635, 1, 1) ON CONFLICT DO NOTHING;

-- 크레딧 단독 구매 상품
INSERT INTO product_credit_amounts (
  product_type, product_category, price_usd,
  base_credits, bonus_rate, bonus_credits, total_credits,
  free_credits, grand_total, unified_rate_id, is_current
) VALUES
-- $10 크레딧 구매
('credit_10', 'credit_only', 10, 757575, 0.03, 22727, 780302, 0, 780302, 1, 1),
-- $30 크레딧 구매
('credit_30', 'credit_only', 30, 2272727, 0.05, 113636, 2386363, 0, 2386363, 1, 1),
-- $60 크레딧 구매
('credit_60', 'credit_only', 60, 4545454, 0.07, 318181, 4863635, 0, 4863635, 1, 1) ON CONFLICT DO NOTHING;

-- 8. 공유 트리거 함수: updated_at 자동 갱신 (BEFORE UPDATE, 재귀 방지)
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 트리거: product_credit_amounts 업데이트 시 updated_at 갱신 (BEFORE UPDATE)
DROP TRIGGER IF EXISTS update_product_credits_timestamp ON product_credit_amounts;
CREATE TRIGGER update_product_credits_timestamp
  BEFORE UPDATE ON product_credit_amounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. 트리거: credit_rate_config 업데이트 시 updated_at 갱신 (BEFORE UPDATE)
DROP TRIGGER IF EXISTS update_credit_rate_config_timestamp ON credit_rate_config;
CREATE TRIGGER update_credit_rate_config_timestamp
  BEFORE UPDATE ON credit_rate_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

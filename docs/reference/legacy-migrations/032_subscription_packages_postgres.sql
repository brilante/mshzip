-- PostgreSQL version of 032_subscription_packages.sql
-- Auto-converted from SQLite

-- ============================================
-- 구독 패키지 정의 테이블 (v7.0)
-- 기존 하드코딩된 패키지 정보를 DB로 이전
-- ============================================

-- 1. 구독 패키지 테이블 생성
CREATE TABLE IF NOT EXISTS subscription_packages (
  id SERIAL PRIMARY KEY,
  package_type TEXT NOT NULL UNIQUE,          -- 'lite', 'standard', 'pro', 'max'
  name TEXT NOT NULL,                         -- 영문 이름: 'Lite', 'Standard', 'Pro', 'Max'
  display_name TEXT NOT NULL,                 -- 한글 이름: '라이트', '스탠다드', '프로', '멕스'
  base_price REAL NOT NULL,                   -- 기본가 (USD, VAT 제외)
  price_usd REAL NOT NULL,                    -- 결제 금액 (USD, VAT 포함)
  vat_rate REAL NOT NULL DEFAULT 0.10,        -- VAT율 (기본 10%)
  base_usage INTEGER NOT NULL,                -- 기본 사용량 (크레딧)
  bonus_rate REAL NOT NULL DEFAULT 0,         -- 보너스율 (0.09, 0.07, 0.05, 0.03)
  bonus_usage INTEGER NOT NULL DEFAULT 0,     -- 보너스 사용량 (크레딧)
  total_usage INTEGER NOT NULL,               -- 총 사용량 (기본 + 보너스)
  expire_days INTEGER NOT NULL DEFAULT 30,    -- 유효기간 (일)
  target TEXT,                                -- 타겟 고객 설명
  sort_order INTEGER NOT NULL DEFAULT 0,      -- 정렬 순서
  is_active INTEGER NOT NULL DEFAULT 1,       -- 활성화 여부
  is_popular INTEGER NOT NULL DEFAULT 0,      -- 인기 상품 표시
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 기존 패키지 ID 매핑 테이블 (하위 호환성)
CREATE TABLE IF NOT EXISTS package_id_mapping (
  id SERIAL PRIMARY KEY,
  old_id TEXT NOT NULL UNIQUE,                -- 기존 ID: 'plus10', 'plus30', 'plus60', 'plus90'
  new_id TEXT NOT NULL,                       -- 신규 ID: 'lite', 'standard', 'pro', 'max'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (new_id) REFERENCES subscription_packages(package_type)
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subscription_packages_type ON subscription_packages(package_type);
CREATE INDEX IF NOT EXISTS idx_subscription_packages_active ON subscription_packages(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_package_id_mapping_old ON package_id_mapping(old_id);

-- 4. 초기 데이터 삽입 (v7.0 기준)
-- 라이트: $3.30 기본가, 9% 보너스
INSERT INTO subscription_packages (
  package_type, name, display_name, base_price, price_usd, vat_rate,
  base_usage, bonus_rate, bonus_usage, total_usage, expire_days,
  target, sort_order, is_active, is_popular
) VALUES (
  'lite', 'Lite', '라이트', 3.30, 3.63, 0.10,
  330000, 0.09, 29700, 359700, 30,
  '개인/취미', 1, 1, 1
) ON CONFLICT DO NOTHING;

-- 스탠다드: $11.00 기본가, 7% 보너스
INSERT INTO subscription_packages (
  package_type, name, display_name, base_price, price_usd, vat_rate,
  base_usage, bonus_rate, bonus_usage, total_usage, expire_days,
  target, sort_order, is_active, is_popular
) VALUES (
  'standard', 'Standard', '스탠다드', 11.00, 12.10, 0.10,
  1100000, 0.07, 77000, 1177000, 30,
  '일반 사용자', 2, 1, 0
) ON CONFLICT DO NOTHING;

-- 프로: $22.00 기본가, 5% 보너스
INSERT INTO subscription_packages (
  package_type, name, display_name, base_price, price_usd, vat_rate,
  base_usage, bonus_rate, bonus_usage, total_usage, expire_days,
  target, sort_order, is_active, is_popular
) VALUES (
  'pro', 'Pro', '프로', 22.00, 24.20, 0.10,
  2200000, 0.05, 110000, 2310000, 30,
  '헤비 유저', 3, 1, 0
) ON CONFLICT DO NOTHING;

-- 멕스: $44.00 기본가, 3% 보너스 (v7.0 신규)
INSERT INTO subscription_packages (
  package_type, name, display_name, base_price, price_usd, vat_rate,
  base_usage, bonus_rate, bonus_usage, total_usage, expire_days,
  target, sort_order, is_active, is_popular
) VALUES (
  'max', 'Max', '멕스', 44.00, 48.40, 0.10,
  4400000, 0.03, 132000, 4532000, 30,
  '헤비 유저/기업', 4, 1, 0
) ON CONFLICT DO NOTHING;

-- 5. 기존 패키지 ID 매핑 데이터 삽입
INSERT INTO package_id_mapping (old_id, new_id) VALUES
('plus10', 'lite'),
('plus30', 'standard'),
('plus60', 'pro'),
('plus90', 'max') ON CONFLICT DO NOTHING;

-- 6. 트리거: subscription_packages 업데이트 시 updated_at 갱신
-- Trigger function
CREATE OR REPLACE FUNCTION update_subscription_packages_timestamp_fn() RETURNS TRIGGER AS $$
BEGIN
  UPDATE subscription_packages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_subscription_packages_timestamp ON subscription_packages;
CREATE TRIGGER update_subscription_packages_timestamp
  AFTER UPDATE ON subscription_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_packages_timestamp_fn();

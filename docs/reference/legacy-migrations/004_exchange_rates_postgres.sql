-- PostgreSQL version of 004_exchange_rates.sql
-- Auto-converted from SQLite

-- 환율 테이블 생성
-- 기준 통화: USD (모든 환율은 1 USD 대비 각 통화 금액으로 저장)

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  currency_code TEXT NOT NULL UNIQUE,  -- 통화 코드 (KRW, JPY, EUR, GBP, CNY)
  currency_name TEXT NOT NULL,          -- 통화 이름 (Korean Won, Japanese Yen 등)
  rate REAL NOT NULL,                   -- 환율 (1 USD = ? 해당 통화)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기본 환율 데이터 삽입 (초기값)
INSERT INTO exchange_rates (currency_code, currency_name, rate) VALUES
  ('USD', 'US Dollar', 1.0),
  ('KRW', 'Korean Won', 1380.0),
  ('JPY', 'Japanese Yen', 149.5),
  ('EUR', 'Euro', 0.92),
  ('GBP', 'British Pound', 0.79),
  ('CNY', 'Chinese Yuan', 7.24);

-- 환율 업데이트 히스토리 테이블 (로그용)
CREATE TABLE IF NOT EXISTS exchange_rate_history (
  id SERIAL PRIMARY KEY,
  currency_code TEXT NOT NULL,
  old_rate REAL,
  new_rate REAL NOT NULL,
  source TEXT DEFAULT 'AI',  -- 'AI', 'MANUAL', 'API'
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_currency ON exchange_rate_history(currency_code);
CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_updated ON exchange_rate_history(updated_at);

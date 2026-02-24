-- PostgreSQL version of 002_credits_system.sql
-- Auto-converted from SQLite

-- ============================================
-- 크레딧 시스템 테이블 - 사용자 크레딧 관리
-- ============================================

-- 1. 사용자 크레딧 테이블
CREATE TABLE IF NOT EXISTS users_credits (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'free' CHECK(user_type IN ('free', 'basic', 'pro')),

  -- 크레딧 잔액 (3단계)
  free_credits INTEGER DEFAULT 0,           -- 무료 크레딧 (구독 시 제공, 1개월 후 소멸)
  service_credits INTEGER DEFAULT 0,        -- 유료서비스 크레딧 (패키지 포함)
  paid_credits INTEGER DEFAULT 0,           -- 유료 크레딧 (별도 구매)

  -- 크레딧 만료일
  free_credits_expiry DATE,                 -- 무료 크레딧 만료일
  service_credits_expiry DATE,              -- 서비스 크레딧 만료일
  paid_credits_expiry DATE,                 -- 유료 크레딧 만료일

  -- 구독 정보
  subscription_status TEXT DEFAULT 'inactive' CHECK(subscription_status IN ('inactive', 'active', 'cancelled')),
  subscription_package TEXT,                -- 'only', 'plus10', 'plus30', 'plus60'
  subscription_start_date DATE,
  subscription_end_date DATE,
  auto_renewal INTEGER DEFAULT 0,           -- 0: Off, 1: On (기본값 Off)

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 크레딧 충전/구매 내역 테이블
CREATE TABLE IF NOT EXISTS credit_purchase_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- 구매 유형
  purchase_type TEXT NOT NULL CHECK(purchase_type IN ('subscription', 'credit_only')),
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

-- 3. 환율 테이블
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
  id SERIAL PRIMARY KEY,
  currency_code TEXT NOT NULL UNIQUE,       -- USD, KRW, JPY, EUR, GBP, CNY
  currency_name TEXT NOT NULL,              -- 미국 달러, 대한민국 원 등
  currency_symbol TEXT NOT NULL,            -- $, ₩, ¥, €, £
  rate_to_usd REAL NOT NULL,                -- 1 USD = ? 해당 통화
  is_active INTEGER DEFAULT 1,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI 모델 가격 테이블
CREATE TABLE IF NOT EXISTS ai_model_pricing (
  id SERIAL PRIMARY KEY,
  ai_service TEXT NOT NULL CHECK(ai_service IN ('gpt', 'claude', 'gemini', 'grok', 'local')),
  model_name TEXT NOT NULL,
  display_name TEXT,                        -- UI에 표시될 이름
  cost_per_1k_input REAL DEFAULT 0,         -- USD 기준 1K 입력 토큰당 비용
  cost_per_1k_output REAL DEFAULT 0,        -- USD 기준 1K 출력 토큰당 비용
  credits_per_1k_tokens INTEGER DEFAULT 1,  -- 1K 토큰당 크레딧
  is_active INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,             -- 기본 모델 여부
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ai_service, model_name)
);

-- 5. 크레딧 사용 로그 테이블 (기존 token_usage 확장)
CREATE TABLE IF NOT EXISTS credit_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'free',

  -- AI 정보
  ai_service TEXT NOT NULL,
  model_name TEXT NOT NULL,

  -- 토큰 정보
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- 크레딧 차감 정보
  credit_type TEXT CHECK(credit_type IN ('free', 'service', 'paid', 'api_key')),
  credits_deducted INTEGER DEFAULT 0,

  -- 요청/응답
  request_preview TEXT,                     -- 요청 내용 미리보기 (100자)
  response_preview TEXT,                    -- 응답 내용 미리보기 (100자)
  error_message TEXT,

  -- 상태
  status TEXT DEFAULT 'success' CHECK(status IN ('success', 'failed')),
  processing_time_ms INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users_credits(user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_credits_type ON users_credits(user_type);
CREATE INDEX IF NOT EXISTS idx_users_credits_status ON users_credits(subscription_status);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_user ON credit_purchase_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_date ON credit_purchase_logs(purchase_timestamp);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user ON credit_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_credit_usage_service ON credit_usage_logs(ai_service, model_name);
CREATE INDEX IF NOT EXISTS idx_ai_model_service ON ai_model_pricing(ai_service, is_active);

-- 기본 환율 데이터 삽입
INSERT INTO currency_exchange_rates (currency_code, currency_name, currency_symbol, rate_to_usd) VALUES
('USD', '미국 달러', '$', 1.0),
('KRW', '대한민국 원', '₩', 1350.0),
('JPY', '일본 엔', '¥', 149.5),
('EUR', '유로', '€', 0.92),
('GBP', '영국 파운드', '£', 0.79),
('CNY', '중국 위안', '¥', 7.25) ON CONFLICT DO NOTHING;

-- 기본 AI 모델 가격 데이터 삽입 (2025-11-28 검증 완료)
-- 가격 단위: $/1K tokens (1M tokens 가격 ÷ 1000)
-- 공식 가격 소스: OpenAI, Anthropic, xAI, Google 공식 웹사이트

-- GPT 모델 (15개)
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, cost_per_1k_input, cost_per_1k_output, credits_per_1k_tokens, is_default) VALUES
('gpt', 'gpt-5.1', 'GPT-5.1', 0.015, 0.060, 15, 0),
('gpt', 'gpt-5.1-codex', 'GPT-5.1 Codex', 0.020, 0.080, 20, 0),
('gpt', 'gpt-5.1-codex-mini', 'GPT-5.1 Codex Mini', 0.008, 0.032, 8, 0),
('gpt', 'gpt-5.1-codex-max', 'GPT-5.1 Codex Max', 0.030, 0.120, 30, 0),
('gpt', 'gpt-5', 'GPT-5', 0.012, 0.048, 12, 0),
('gpt', 'gpt-5-mini', 'GPT-5 Mini', 0.006, 0.024, 6, 1),
('gpt', 'gpt-5-nano', 'GPT-5 Nano', 0.003, 0.012, 3, 0),
('gpt', 'gpt-5-chat', 'GPT-5 Chat', 0.010, 0.040, 10, 0),
('gpt', 'gpt-4.1', 'GPT-4.1', 0.002, 0.008, 2, 0),
('gpt', 'gpt-4.1-mini', 'GPT-4.1 Mini', 0.0004, 0.0016, 1, 0),
('gpt', 'gpt-4.1-nano', 'GPT-4.1 Nano', 0.0001, 0.0004, 1, 0),
('gpt', 'o4-mini', 'O4 Mini', 0.010, 0.040, 10, 0),
('gpt', 'o3', 'O3', 0.012, 0.048, 12, 0),
('gpt', 'gpt-image-1', 'GPT Image-1', 0.020, 0.080, 20, 0),
('gpt', 'gpt-4o-mini-tts', 'GPT-4o Mini TTS', 0.008, 0.032, 8, 0) ON CONFLICT DO NOTHING;

-- Claude 모델 (7개) - Anthropic 공식 가격
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, cost_per_1k_input, cost_per_1k_output, credits_per_1k_tokens, is_default) VALUES
('claude', 'claude-opus-4-5', 'Claude Opus 4.5', 0.005, 0.025, 8, 0),
('claude', 'claude-sonnet-4-5', 'Claude Sonnet 4.5', 0.003, 0.015, 5, 0),
('claude', 'claude-haiku-4-5', 'Claude Haiku 4.5', 0.001, 0.005, 2, 1),
('claude', 'claude-opus-4-1', 'Claude Opus 4.1', 0.005, 0.025, 8, 0),
('claude', 'claude-opus-4', 'Claude Opus 4', 0.015, 0.075, 25, 0),
('claude', 'claude-sonnet-4', 'Claude Sonnet 4', 0.003, 0.015, 5, 0),
('claude', 'claude-haiku-4', 'Claude Haiku 4', 0.001, 0.005, 2, 0) ON CONFLICT DO NOTHING;

-- Grok 모델 (10개) - xAI 공식 가격
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, cost_per_1k_input, cost_per_1k_output, credits_per_1k_tokens, is_default) VALUES
('grok', 'grok-4-1-fast-reasoning', 'Grok 4.1 Fast Reasoning', 0.0002, 0.0005, 1, 0),
('grok', 'grok-4-1-fast-non-reasoning', 'Grok 4.1 Fast Non-Reasoning', 0.0002, 0.0005, 1, 0),
('grok', 'grok-4', 'Grok 4', 0.003, 0.015, 5, 0),
('grok', 'grok-4-fast-reasoning', 'Grok 4 Fast Reasoning', 0.0002, 0.0005, 1, 0),
('grok', 'grok-4-fast-non-reasoning', 'Grok 4 Fast Non-Reasoning', 0.0002, 0.0005, 1, 0),
('grok', 'grok-4-0709', 'Grok 4 (2024-07-09)', 0.003, 0.015, 5, 0),
('grok', 'grok-3', 'Grok 3', 0.003, 0.015, 5, 0),
('grok', 'grok-3-mini', 'Grok 3 Mini', 0.0003, 0.0005, 1, 1),
('grok', 'grok-2-1212', 'Grok 2 (Vision)', 0.002, 0.010, 3, 0),
('grok', 'grok-2-image-1212', 'Grok 2 Image', 0.005, 0.015, 5, 0) ON CONFLICT DO NOTHING;

-- Gemini 모델 (8개) - Google 공식 가격
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, cost_per_1k_input, cost_per_1k_output, credits_per_1k_tokens, is_default) VALUES
('gemini', 'gemini-3-pro', 'Gemini 3 Pro (Preview)', 0.010, 0.040, 12, 0),
('gemini', 'gemini-3-pro-image', 'Gemini 3 Pro Image', 0.015, 0.060, 18, 0),
('gemini', 'gemini-2.5-pro', 'Gemini 2.5 Pro', 0.00125, 0.01, 3, 0),
('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 0.000075, 0.0003, 1, 1),
('gemini', 'gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 0.000025, 0.0001, 1, 0),
('gemini', 'gemini-2.5-flash-live', 'Gemini 2.5 Flash Live', 0.005, 0.020, 6, 0),
('gemini', 'gemini-2.5-image-preview', 'Gemini 2.5 Image', 0.010, 0.040, 12, 0),
('gemini', 'gemini-2.0-flash', 'Gemini 2.0 Flash', 0.0001, 0.0004, 1, 0) ON CONFLICT DO NOTHING;

-- Local AI 모델 (2개) - 무료
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, cost_per_1k_input, cost_per_1k_output, credits_per_1k_tokens, is_default) VALUES
('local', 'openai-gpt-oss-120b', 'OpenAI GPT OSS 120B', 0, 0, 0, 0),
('local', 'openai-gpt-oss-20b', 'OpenAI GPT OSS 20B', 0, 0, 0, 1) ON CONFLICT DO NOTHING;

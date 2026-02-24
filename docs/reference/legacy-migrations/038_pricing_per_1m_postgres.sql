-- PostgreSQL version of 038_pricing_per_1m.sql
-- Auto-converted from SQLite

-- Migration: 038_pricing_per_1m.sql
-- Description: AI 모델 가격 단위 변경 (1K 토큰당 → 1M 토큰당)
-- Date: 2026-01-09
--
-- 변경 사유:
-- - API 공급사들이 1M 토큰당 가격을 기준으로 제공
-- - 변환 로직 제거로 코드 단순화
-- - 가격 크롤링 시 직접 저장 가능
--
-- 변경 내용:
-- 1. 새 컬럼 추가: cost_per_1m_input, cost_per_1m_output, credits_per_1m_input, credits_per_1m_output
-- 2. 기존 데이터 변환: 1K 가격 × 1000 = 1M 가격
-- 3. 기존 1K 컬럼 제거 (테이블 재생성)
--
-- 크레딧 계산 공식 (변경 없음):
-- credits_per_1m = cost_per_1m × 100 × 1.2 (마진 20%)
-- 실제 차감: (tokens / 1,000,000) × credits_per_1m

-- ============================================================
-- Step 1: 새 컬럼 추가 (1M 토큰당)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN cost_per_1m_input REAL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN cost_per_1m_output REAL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN credits_per_1m_input INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN credits_per_1m_output INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- Step 2: 기존 데이터 변환 (1K → 1M: ×1000)
-- ============================================================

UPDATE ai_model_pricing SET
  cost_per_1m_input = COALESCE(cost_per_1k_input, 0) * 1000,
  cost_per_1m_output = COALESCE(cost_per_1k_output, 0) * 1000,
  credits_per_1m_input = COALESCE(credits_per_1k_input, 0) * 1000,
  credits_per_1m_output = COALESCE(credits_per_1k_output, 0) * 1000;

-- ============================================================
-- Step 3: 테이블 재생성 (1K 컬럼 제거)
-- SQLite는 DROP COLUMN을 직접 지원하지 않으므로 테이블 재생성 필요
-- ============================================================

-- 3.1 임시 테이블 생성 (새 스키마)
CREATE TABLE ai_model_pricing_new (
  id SERIAL PRIMARY KEY,
  ai_service TEXT NOT NULL,
  model_name TEXT NOT NULL,
  api_model_id TEXT,
  display_name TEXT,
  -- 새 가격 컬럼 (1M 토큰당 USD)
  cost_per_1m_input REAL DEFAULT 0,
  cost_per_1m_output REAL DEFAULT 0,
  credits_per_1m_input INTEGER DEFAULT 0,
  credits_per_1m_output INTEGER DEFAULT 0,
  -- 기존 컬럼 유지
  is_active INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  api_available INTEGER DEFAULT 1,
  needs_pricing INTEGER DEFAULT 0,
  last_api_check TEXT,
  deprecated_at TEXT,
  api_miss_count INTEGER DEFAULT 0,
  owned_by TEXT,
  model_created_at TEXT,
  input_token_limit INTEGER,
  output_token_limit INTEGER,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(ai_service, model_name)
);

-- 3.2 데이터 이전 (1M 컬럼만)
INSERT INTO ai_model_pricing_new (
  id, ai_service, model_name, api_model_id, display_name,
  cost_per_1m_input, cost_per_1m_output, credits_per_1m_input, credits_per_1m_output,
  is_active, is_default, api_available, needs_pricing,
  last_api_check, deprecated_at, api_miss_count,
  owned_by, model_created_at, input_token_limit, output_token_limit,
  created_at, updated_at
)
SELECT
  id, ai_service, model_name, api_model_id, display_name,
  cost_per_1m_input, cost_per_1m_output, credits_per_1m_input, credits_per_1m_output,
  is_active, is_default, api_available, needs_pricing,
  last_api_check, deprecated_at, api_miss_count,
  owned_by, model_created_at, input_token_limit, output_token_limit,
  created_at, updated_at
FROM ai_model_pricing;

-- 3.3 기존 테이블 삭제
DROP TABLE ai_model_pricing;

-- 3.4 임시 테이블 이름 변경
ALTER TABLE ai_model_pricing_new RENAME TO ai_model_pricing;

-- 3.5 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_model_pricing_service ON ai_model_pricing(ai_service);
CREATE INDEX IF NOT EXISTS idx_model_pricing_active ON ai_model_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_model_pricing_model ON ai_model_pricing(model_name);

-- ============================================================
-- Step 4: 변환 검증 쿼리 (참고용)
-- ============================================================
-- SELECT
--   ai_service, model_name,
--   cost_per_1m_input, cost_per_1m_output,
--   credits_per_1m_input, credits_per_1m_output
-- FROM ai_model_pricing
-- WHERE ai_service = 'gpt'
-- LIMIT 5;
--
-- 예상 결과:
-- gpt-5: cost_per_1m_input = 1.25 (기존 0.00125 × 1000)
-- gpt-4o: cost_per_1m_input = 2.5 (기존 0.0025 × 1000)

-- ============================================================
-- 마이그레이션 완료
-- ============================================================

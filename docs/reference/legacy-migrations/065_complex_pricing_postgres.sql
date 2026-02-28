-- Migration: 065_complex_pricing_postgres.sql
-- Description: AI 모델 복합 과금 체계 지원 (이미지 토큰 별도 가격, 초당 과금)
-- Date: 2026-02-26
--
-- 변경 사유:
-- - 이미지 생성 모델(gpt-image-1.5, gemini-3-pro-image-preview)은 텍스트/이미지 토큰 별도 가격 적용
-- - 영상 생성 모델(grok-imagine-video)은 초당 과금 체계 사용
-- - 기존 cost_per_1m_input/output만으로는 복합 과금 표현 불가
--
-- 신규 컬럼:
-- 1. billing_type: 과금 유형 ('token' | 'per_second')
-- 2. cost_per_1m_image_input: 이미지 토큰 입력가 ($/1M)
-- 3. cost_per_1m_image_output: 이미지 토큰 출력가 ($/1M)
-- 4. cost_per_second: 초당 과금 ($/sec)

-- ============================================================
-- Step 1: 신규 컬럼 추가
-- ============================================================

DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN billing_type TEXT DEFAULT 'token';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN cost_per_1m_image_input REAL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN cost_per_1m_image_output REAL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN cost_per_second REAL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- Step 2: 가격 데이터 수정 (4개 모델)
-- ============================================================

-- 2-1. gpt-image-1-mini: 텍스트 입력=$2, 출력=$8, 이미지 입력=$2.5, 출력=$8
UPDATE ai_model_pricing SET
  cost_per_1m_input = 2,
  cost_per_1m_output = 8,
  cost_per_1m_cached_input = 0.2,
  cost_per_1m_image_input = 2.5,
  cost_per_1m_image_output = 8,
  billing_type = 'token',
  updated_at = NOW()
WHERE model_name = 'gpt-image-1-mini';

-- 2-2. gpt-image-1.5: 텍스트=$5/$10, 이미지=$8/$32
UPDATE ai_model_pricing SET
  cost_per_1m_input = 5,
  cost_per_1m_output = 10,
  cost_per_1m_cached_input = 1.25,
  cost_per_1m_image_input = 8,
  cost_per_1m_image_output = 32,
  billing_type = 'token',
  updated_at = NOW()
WHERE model_name = 'gpt-image-1.5';

-- 2-3. gemini-3-pro-image-preview: 텍스트=$2/$12, 이미지 출력=$120
UPDATE ai_model_pricing SET
  cost_per_1m_image_input = 2,
  cost_per_1m_image_output = 120,
  billing_type = 'token',
  updated_at = NOW()
WHERE model_name = 'gemini-3-pro-image-preview';

-- 2-4. grok-imagine-video: 초당 과금 $0.05/sec
UPDATE ai_model_pricing SET
  billing_type = 'per_second',
  cost_per_second = 0.05,
  cost_per_1m_input = 0,
  cost_per_1m_output = 0,
  updated_at = NOW()
WHERE model_name = 'grok-imagine-video';

-- ============================================================
-- 검증 쿼리
-- ============================================================
-- SELECT model_name, billing_type, cost_per_1m_input, cost_per_1m_output,
--        cost_per_1m_image_input, cost_per_1m_image_output, cost_per_second
-- FROM ai_model_pricing
-- WHERE model_name IN ('gpt-image-1-mini', 'gpt-image-1.5',
--                      'gemini-3-pro-image-preview', 'grok-imagine-video');

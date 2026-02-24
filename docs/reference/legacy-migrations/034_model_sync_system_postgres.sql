-- PostgreSQL version of 034_model_sync_system.sql
-- Auto-converted from SQLite

-- Migration: 034_model_sync_system.sql
-- Description: AI 모델 동기화 배치 시스템을 위한 스키마 확장
-- Date: 2026-01-05
-- 기획서: testpy/md4/ai 모델 리스트 api 배치.md

-- Step 1: ai_model_pricing 테이블에 동기화 관련 컬럼 추가

-- API에서 반환하는 원본 모델 ID (정규화 전)
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN api_model_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- API에서 조회 가능 여부 (1: 가능, 0: 불가)
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN api_available INTEGER DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 가격 정보 수동 입력 필요 여부 (신규 모델)
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN needs_pricing INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 마지막 API 확인 일시
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN last_api_check TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- API에서 사라진 날짜 (deprecated 처리용)
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN deprecated_at TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- API 미조회 연속 일수 (3일 연속 미조회 시 deprecated)
DO $$ BEGIN
  ALTER TABLE ai_model_pricing ADD COLUMN api_miss_count INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Step 2: 동기화 로그 테이블 생성
CREATE TABLE IF NOT EXISTS model_sync_logs (
  id SERIAL PRIMARY KEY,
  sync_date TEXT NOT NULL,           -- 동기화 실행 날짜 (YYYY-MM-DD)
  ai_service TEXT NOT NULL,          -- 서비스명 (gpt, claude, gemini, grok)
  api_status TEXT NOT NULL,          -- success, failed, timeout
  models_found INTEGER DEFAULT 0,    -- API에서 조회된 모델 수
  models_added INTEGER DEFAULT 0,    -- 신규 추가 모델 수
  models_updated INTEGER DEFAULT 0,  -- 업데이트 모델 수
  models_deprecated INTEGER DEFAULT 0, -- deprecated 처리 모델 수
  error_message TEXT,                -- 에러 발생 시 메시지
  response_time_ms INTEGER,          -- API 응답 시간
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON model_sync_logs(sync_date);
CREATE INDEX IF NOT EXISTS idx_sync_logs_service ON model_sync_logs(ai_service);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON model_sync_logs(api_status);

-- Step 3: 기존 모델의 api_model_id 초기화 (model_name과 동일하게)
UPDATE ai_model_pricing SET api_model_id = model_name WHERE api_model_id IS NULL;

-- Step 4: 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_model_api_available ON ai_model_pricing(api_available);
CREATE INDEX IF NOT EXISTS idx_model_needs_pricing ON ai_model_pricing(needs_pricing);
CREATE INDEX IF NOT EXISTS idx_model_deprecated ON ai_model_pricing(deprecated_at);

-- 마이그레이션 완료 확인용 쿼리:
-- SELECT COUNT(*) FROM ai_model_pricing WHERE api_model_id IS NOT NULL;
-- SELECT COUNT(*) FROM model_sync_logs;

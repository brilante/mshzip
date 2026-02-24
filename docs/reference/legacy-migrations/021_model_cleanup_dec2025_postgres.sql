-- PostgreSQL version of 021_model_cleanup_dec2025.sql
-- Auto-converted from SQLite

-- Migration: 021_model_cleanup_dec2025.sql
-- Description: AI 모델 정리 - 2025년 12월 기준 실제 서비스 모델만 유지
-- Date: 2025-12-22
--
-- 변경 사항:
-- 1. Grok: grok-3, grok-3-mini, grok-4 등 존재하지 않는 모델 삭제
-- 2. Gemini: gemini-3-pro-preview 추가
-- 3. 모델 목록을 aimodel.md 참조 문서와 동기화
--
-- 참조: testpy/md3/기본설정/aimodel.md

-- Step 1: 존재하지 않는 Grok 모델 삭제
-- xAI 공식 문서 기준 grok-2 시리즈만 서비스 중
DELETE FROM ai_model_pricing WHERE ai_service = 'grok' AND model_name LIKE 'grok-3%';
DELETE FROM ai_model_pricing WHERE ai_service = 'grok' AND model_name LIKE 'grok-4%';

-- Step 2: Grok-2 모델 확인 및 추가 (없으면 추가)
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, is_default, credits_per_1k_tokens, credits_per_1k_input, credits_per_1k_output)
VALUES
  ('grok', 'grok-2', 'Grok-2', 1, 240, 240, 1200),
  ('grok', 'grok-2-latest', 'Grok-2 Latest', 0, 240, 240, 1200),
  ('grok', 'grok-2-1212', 'Grok-2 (2024-12-12)', 0, 240, 240, 1200),
  ('grok', 'grok-2-vision-1212', 'Grok-2 Vision', 0, 240, 240, 1200) ON CONFLICT DO NOTHING;

-- Step 3: Gemini 3 Pro Preview 추가
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, is_default, credits_per_1k_tokens, credits_per_1k_input, credits_per_1k_output)
VALUES ('gemini', 'gemini-3-pro-preview', 'Gemini 3 Pro (최신)', 0, 1200, 1200, 4800) ON CONFLICT DO NOTHING;

-- Step 4: GPT-5.2 시리즈 추가 (2025년 12월 11일 출시)
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, is_default, credits_per_1k_tokens, credits_per_1k_input, credits_per_1k_output)
VALUES
  ('gpt', 'gpt-5.2', 'GPT-5.2 (최신)', 0, 2100, 2100, 16800),
  ('gpt', 'gpt-5.2-pro', 'GPT-5.2 Pro', 0, 2100, 2100, 16800),
  ('gpt', 'gpt-5.2-chat-latest', 'GPT-5.2 Instant', 0, 2100, 2100, 16800) ON CONFLICT DO NOTHING;

-- Step 5: o3-mini, o3-pro 추가
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, is_default, credits_per_1k_tokens, credits_per_1k_input, credits_per_1k_output)
VALUES
  ('gpt', 'o3-mini', 'o3-mini (소형 추론)', 0, 1200, 1200, 4800),
  ('gpt', 'o3-pro', 'o3-pro (최고 추론)', 0, 2400, 2400, 9600) ON CONFLICT DO NOTHING;

-- Step 6: Claude 3.7 Sonnet 추가
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, is_default, credits_per_1k_tokens, credits_per_1k_input, credits_per_1k_output)
VALUES ('claude', 'claude-3-7-sonnet-20250219', 'Claude 3.7 Sonnet', 0, 360, 360, 1800) ON CONFLICT DO NOTHING;

-- Step 7: Grok 기본 모델 설정 (grok-2를 기본으로)
UPDATE ai_model_pricing SET is_default = 0 WHERE ai_service = 'grok';
UPDATE ai_model_pricing SET is_default = 1 WHERE ai_service = 'grok' AND model_name = 'grok-2';

-- 마이그레이션 기록은 migrate.js에서 자동 처리됨

-- 검증 쿼리 (실행 후 확인용)
-- SELECT ai_service, model_name, display_name, is_default FROM ai_model_pricing WHERE ai_service IN ('grok', 'gemini') ORDER BY ai_service, model_name;

-- PostgreSQL version of 022_add_gemini_image_model.sql
-- Auto-converted from SQLite

-- Migration: 022_add_gemini_image_model.sql
-- Description: Gemini 3 Pro Image Preview 모델 추가
-- Date: 2025-12-25
--
-- 변경 사항:
-- 1. gemini-3-pro-image-preview 이미지 생성 모델 추가
-- 2. gemini-3-flash-preview 모델 추가

-- Step 1: Gemini 3 이미지 생성 모델 추가
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, is_default, credits_per_1k_tokens, credits_per_1k_input, credits_per_1k_output)
VALUES ('gemini', 'gemini-3-pro-image-preview', 'Gemini 3 Pro Image (이미지 생성)', 0, 2400, 2400, 9600) ON CONFLICT DO NOTHING;

-- Step 2: Gemini 3 Flash Preview 추가
INSERT INTO ai_model_pricing (ai_service, model_name, display_name, is_default, credits_per_1k_tokens, credits_per_1k_input, credits_per_1k_output)
VALUES ('gemini', 'gemini-3-flash-preview', 'Gemini 3 Flash (빠른 응답)', 0, 600, 600, 2400) ON CONFLICT DO NOTHING;

-- 검증 쿼리
-- SELECT ai_service, model_name, display_name FROM ai_model_pricing WHERE ai_service = 'gemini' ORDER BY model_name;

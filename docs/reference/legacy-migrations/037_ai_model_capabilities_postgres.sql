-- PostgreSQL version of 037_ai_model_capabilities.sql
-- Auto-converted from SQLite

-- AI 모델 Capabilities 테이블
-- 모델별 Input/Output 타입 관리

CREATE TABLE IF NOT EXISTS ai_model_capabilities (
    id SERIAL PRIMARY KEY,
    ai_service TEXT NOT NULL,           -- gpt, claude, gemini, grok
    model_name TEXT NOT NULL,           -- 모델명
    input_types TEXT NOT NULL,          -- JSON 배열 ['text', 'image']
    output_types TEXT NOT NULL,         -- JSON 배열 ['text']
    input_icons TEXT,                   -- 📝🖼️
    output_icons TEXT,                  -- 📝
    description TEXT,                   -- 모델 설명
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(ai_service, model_name)
);

-- 기본 capabilities 데이터 삽입
-- GPT 모델
INSERT INTO ai_model_capabilities (ai_service, model_name, input_types, output_types, input_icons, output_icons, description) VALUES
    ('gpt', 'gpt-4o', '["text","image"]', '["text"]', '📝🖼️', '📝', 'GPT-4o 멀티모달'),
    ('gpt', 'gpt-4o-mini', '["text","image"]', '["text"]', '📝🖼️', '📝', 'GPT-4o Mini'),
    ('gpt', 'gpt-4-turbo', '["text","image"]', '["text"]', '📝🖼️', '📝', 'GPT-4 Turbo'),
    ('gpt', 'gpt-4', '["text"]', '["text"]', '📝', '📝', 'GPT-4'),
    ('gpt', 'gpt-3.5-turbo', '["text"]', '["text"]', '📝', '📝', 'GPT-3.5 Turbo'),
    ('gpt', 'o1', '["text"]', '["text"]', '📝', '📝', 'o1 추론 모델'),
    ('gpt', 'o1-mini', '["text"]', '["text"]', '📝', '📝', 'o1 Mini'),
    ('gpt', 'o1-preview', '["text"]', '["text"]', '📝', '📝', 'o1 Preview'),
    ('gpt', 'o3-mini', '["text"]', '["text"]', '📝', '📝', 'o3 Mini'),
    ('gpt', 'dall-e-3', '["text"]', '["image"]', '📝', '🖼️', 'DALL-E 3 이미지 생성');

-- Claude 모델
INSERT INTO ai_model_capabilities (ai_service, model_name, input_types, output_types, input_icons, output_icons, description) VALUES
    ('claude', 'claude-sonnet-4-20250514', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Claude Sonnet 4'),
    ('claude', 'claude-3-5-sonnet-20241022', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Claude 3.5 Sonnet'),
    ('claude', 'claude-3-5-haiku-20241022', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Claude 3.5 Haiku'),
    ('claude', 'claude-3-opus-20240229', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Claude 3 Opus'),
    ('claude', 'claude-3-sonnet-20240229', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Claude 3 Sonnet'),
    ('claude', 'claude-3-haiku-20240307', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Claude 3 Haiku'),
    ('claude', 'claude-opus-4-20250514', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Claude Opus 4');

-- Gemini 모델
INSERT INTO ai_model_capabilities (ai_service, model_name, input_types, output_types, input_icons, output_icons, description) VALUES
    ('gemini', 'gemini-2.0-flash', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Gemini 2.0 Flash'),
    ('gemini', 'gemini-2.0-flash-lite', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Gemini 2.0 Flash Lite'),
    ('gemini', 'gemini-1.5-pro', '["text","image","audio","video"]', '["text"]', '📝🖼️🔊🎬', '📝', 'Gemini 1.5 Pro'),
    ('gemini', 'gemini-1.5-flash', '["text","image","audio","video"]', '["text"]', '📝🖼️🔊🎬', '📝', 'Gemini 1.5 Flash'),
    ('gemini', 'gemini-1.5-flash-8b', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Gemini 1.5 Flash 8B'),
    ('gemini', 'gemini-exp-1206', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Gemini Experimental'),
    ('gemini', 'imagen-3.0-generate-002', '["text"]', '["image"]', '📝', '🖼️', 'Imagen 3 이미지 생성');

-- Grok 모델
INSERT INTO ai_model_capabilities (ai_service, model_name, input_types, output_types, input_icons, output_icons, description) VALUES
    ('grok', 'grok-3', '["text"]', '["text"]', '📝', '📝', 'Grok 3'),
    ('grok', 'grok-3-fast', '["text"]', '["text"]', '📝', '📝', 'Grok 3 Fast'),
    ('grok', 'grok-2', '["text"]', '["text"]', '📝', '📝', 'Grok 2'),
    ('grok', 'grok-2-vision', '["text","image"]', '["text"]', '📝🖼️', '📝', 'Grok 2 Vision'),
    ('grok', 'grok-beta', '["text"]', '["text"]', '📝', '📝', 'Grok Beta');

CREATE INDEX IF NOT EXISTS idx_model_caps_service ON ai_model_capabilities(ai_service);

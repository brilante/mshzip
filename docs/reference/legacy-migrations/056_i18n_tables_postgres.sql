-- i18n 다국어 지원 테이블 (PostgreSQL)

-- 지원 언어 테이블
CREATE TABLE IF NOT EXISTS i18n_languages (
  lang_code VARCHAR(10) PRIMARY KEY,
  lang_name VARCHAR(50) NOT NULL,
  native_name VARCHAR(50) NOT NULL,
  is_rtl BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 번역 데이터 테이블
CREATE TABLE IF NOT EXISTS i18n_translations (
  id SERIAL PRIMARY KEY,
  translation_key VARCHAR(255) NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  translation_text TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  source_type VARCHAR(20) DEFAULT 'client',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(translation_key, lang_code),
  FOREIGN KEY (lang_code) REFERENCES i18n_languages(lang_code)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_i18n_translations_lang ON i18n_translations(lang_code);
CREATE INDEX IF NOT EXISTS idx_i18n_translations_category ON i18n_translations(category);
CREATE INDEX IF NOT EXISTS idx_i18n_translations_key_lang ON i18n_translations(translation_key, lang_code);

-- 기본 언어 데이터
INSERT INTO i18n_languages (lang_code, lang_name, native_name, is_rtl, is_active, sort_order) VALUES
  ('ko', 'Korean', '한국어', FALSE, TRUE, 1),
  ('en', 'English', 'English', FALSE, TRUE, 2),
  ('zh-CN', 'Chinese (Simplified)', '简体中文', FALSE, TRUE, 3),
  ('es', 'Spanish', 'Español', FALSE, TRUE, 4),
  ('hi', 'Hindi', 'हिन्दी', FALSE, TRUE, 5),
  ('ar', 'Arabic', 'العربية', TRUE, TRUE, 6),
  ('pt', 'Portuguese', 'Português', FALSE, TRUE, 7),
  ('fr', 'French', 'Français', FALSE, TRUE, 8),
  ('ru', 'Russian', 'Русский', FALSE, TRUE, 9),
  ('ja', 'Japanese', '日本語', FALSE, TRUE, 10),
  ('de', 'German', 'Deutsch', FALSE, TRUE, 11)
ON CONFLICT (lang_code) DO NOTHING;

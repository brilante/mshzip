-- i18n 단위 환경설정 테이블 (PostgreSQL)
-- 각 언어/지역별 단위 시스템 기본값 관리

-- 단위 환경설정 테이블
CREATE TABLE IF NOT EXISTS i18n_unit_preferences (
  lang_code VARCHAR(10) PRIMARY KEY,
  temperature_unit VARCHAR(10) NOT NULL DEFAULT 'celsius',
  distance_unit VARCHAR(10) NOT NULL DEFAULT 'km',
  weight_unit VARCHAR(10) NOT NULL DEFAULT 'kg',
  volume_unit VARCHAR(10) NOT NULL DEFAULT 'L',
  speed_unit VARCHAR(10) NOT NULL DEFAULT 'km/h',
  area_unit VARCHAR(10) NOT NULL DEFAULT 'm2',
  currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
  date_format VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format VARCHAR(5) NOT NULL DEFAULT '24h',
  number_decimal CHAR(1) NOT NULL DEFAULT '.',
  number_grouping CHAR(1) NOT NULL DEFAULT ',',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (lang_code) REFERENCES i18n_languages(lang_code)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_i18n_unit_prefs_lang ON i18n_unit_preferences(lang_code);

-- 11개 지원 언어 기본 단위 데이터
INSERT INTO i18n_unit_preferences (lang_code, temperature_unit, distance_unit, weight_unit, volume_unit, speed_unit, area_unit, currency_code, date_format, time_format, number_decimal, number_grouping) VALUES
  ('ko', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'KRW', 'YYYY.MM.DD', '24h', '.', ','),
  ('en', 'fahrenheit', 'mi', 'lb', 'gal', 'mph',  'ft2', 'USD', 'MM/DD/YYYY', '12h', '.', ','),
  ('zh-CN', 'celsius', 'km', 'kg', 'L',   'km/h', 'm2',  'CNY', 'YYYY-MM-DD', '24h', '.', ','),
  ('es', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'EUR', 'DD/MM/YYYY', '24h', ',', '.'),
  ('hi', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'USD', 'DD-MM-YYYY', '12h', '.', ','),
  ('ar', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'USD', 'DD/MM/YYYY', '12h', '.', ','),
  ('pt', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'EUR', 'DD/MM/YYYY', '24h', ',', '.'),
  ('fr', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'EUR', 'DD/MM/YYYY', '24h', ',', ' '),
  ('ru', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'USD', 'DD.MM.YYYY', '24h', ',', ' '),
  ('ja', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'JPY', 'YYYY/MM/DD', '24h', '.', ','),
  ('de', 'celsius',    'km', 'kg', 'L',   'km/h', 'm2',  'EUR', 'DD.MM.YYYY', '24h', ',', '.')
ON CONFLICT (lang_code) DO NOTHING;

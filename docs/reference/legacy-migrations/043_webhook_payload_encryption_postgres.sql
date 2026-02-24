-- ================================================
-- Stripe Webhook Payload 암호화 마이그레이션 (PostgreSQL)
-- 버전: 1.0
-- 날짜: 2026-01-20
-- 설명: stripe_webhook_events payload 암호화를 위한 컬럼 추가
-- ================================================

-- 1. 암호화 관련 컬럼 추가
ALTER TABLE stripe_webhook_events ADD COLUMN IF NOT EXISTS payload_encrypted TEXT;
ALTER TABLE stripe_webhook_events ADD COLUMN IF NOT EXISTS encryption_iv TEXT;
ALTER TABLE stripe_webhook_events ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- 2. 기존 payload 데이터 마이그레이션은 애플리케이션에서 처리
-- (암호화 키가 필요하므로 SQL에서 직접 처리 불가)

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_webhook_encryption_version
  ON stripe_webhook_events(encryption_version);

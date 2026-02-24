-- PostgreSQL version of 019_daily_credit_limit.sql
-- Auto-converted from SQLite

-- ============================================
-- 하루 크레딧 제한 시스템 (v6.6)
-- 구독 상품: 총 크레딧 / 30 = 일일 한도
-- 미사용 크레딧은 익일 자정 소멸
-- ============================================

-- 1. users_credits 테이블에 일일 한도 관련 컬럼 추가
DO $$ BEGIN
  ALTER TABLE users_credits ADD COLUMN total_service_credits INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
-- 구독 시 지급된 총 크레딧 (일일 한도 계산용)

DO $$ BEGIN
  ALTER TABLE users_credits ADD COLUMN daily_service_usage INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
-- 오늘 사용한 서비스 크레딧

DO $$ BEGIN
  ALTER TABLE users_credits ADD COLUMN daily_limit_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
-- 일일 사용량 기준 날짜 (자정 리셋 시 갱신)

DO $$ BEGIN
  ALTER TABLE users_credits ADD COLUMN daily_unused_expired INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
-- 누적 소멸된 미사용 크레딧 (통계용)

-- 2. 일일 크레딧 소멸 로그 테이블
CREATE TABLE IF NOT EXISTS daily_credit_expiry_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- 소멸 정보
  expiry_date DATE NOT NULL,              -- 소멸 기준일
  daily_limit INTEGER NOT NULL,           -- 일일 한도
  daily_used INTEGER NOT NULL,            -- 사용량
  expired_amount INTEGER NOT NULL,        -- 소멸량 (한도 - 사용량)

  -- 잔액 정보
  before_credits INTEGER NOT NULL,        -- 소멸 전 잔액
  after_credits INTEGER NOT NULL,         -- 소멸 후 잔액

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users_credits(user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_daily_expiry_user ON daily_credit_expiry_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_expiry_date ON daily_credit_expiry_logs(expiry_date);

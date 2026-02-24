-- =============================================
-- Migration 046: Performance Indexes (PostgreSQL)
-- Phase 5.2: DB 최적화 - 성능 향상 인덱스 추가
-- 2026-01-23
-- =============================================

-- 1. credit_usage_logs 테이블
CREATE INDEX IF NOT EXISTS idx_credit_usage_status ON credit_usage_logs(status);
CREATE INDEX IF NOT EXISTS idx_credit_usage_date ON credit_usage_logs(created_at);

-- 2. credit_purchase_logs 테이블
CREATE INDEX IF NOT EXISTS idx_credit_purchase_status ON credit_purchase_logs(payment_status);
CREATE INDEX IF NOT EXISTS idx_credit_purchase_type ON credit_purchase_logs(purchase_type);

-- 3. users 테이블
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 4. error_logs 테이블
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);

-- 5. token_usage 테이블
CREATE INDEX IF NOT EXISTS idx_token_usage_user_date ON token_usage(user_id, created_at);

-- 6. ai_model_pricing 테이블
CREATE INDEX IF NOT EXISTS idx_ai_model_name ON ai_model_pricing(model_name);

-- 7. 복합 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_users_credits_type_status ON users_credits(user_type, subscription_status);
CREATE INDEX IF NOT EXISTS idx_credit_usage_service_date ON credit_usage_logs(ai_service, created_at);

-- PostgreSQL 부분 인덱스 (조건부)
-- 활성 구독만 인덱싱 (자주 조회되는 데이터)
CREATE INDEX IF NOT EXISTS idx_users_credits_active_sub
ON users_credits(subscription_status)
WHERE subscription_status = 'active';

-- 최근 7일 에러 로그 인덱스
-- CREATE INDEX IF NOT EXISTS idx_error_logs_recent
-- ON error_logs(created_at)
-- WHERE created_at > NOW() - INTERVAL '7 days';

-- =============================================
-- PostgreSQL 인덱스 통계
-- =============================================
-- 인덱스 크기 확인:
-- SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid))
-- FROM pg_stat_user_indexes ORDER BY pg_relation_size(indexrelid) DESC;
--
-- 인덱스 사용 통계:
-- SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
-- =============================================

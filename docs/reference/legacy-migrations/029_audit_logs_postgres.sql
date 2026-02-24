-- =====================================================
-- 감사 로그 테이블 (PostgreSQL)
-- 보안 강화: 모든 중요 활동 기록
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event VARCHAR(100) NOT NULL,
    sensitivity VARCHAR(20) NOT NULL DEFAULT 'low',
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    ip VARCHAR(45),
    user_agent TEXT,
    resource VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(50),
    status VARCHAR(20) DEFAULT 'success',
    details TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sensitivity ON audit_logs(sensitivity);

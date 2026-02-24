-- =====================================================
-- 사용자 ID 해시 매핑 테이블 (PostgreSQL)
-- 보안 강화: Base64 폴더명 → SHA256 해시 폴더명 전환용
-- =====================================================

CREATE TABLE IF NOT EXISTS user_id_mapping (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    user_id_hash VARCHAR(32) NOT NULL UNIQUE,
    legacy_folder VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_id_mapping_hash ON user_id_mapping(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_user_id_mapping_legacy ON user_id_mapping(legacy_folder);

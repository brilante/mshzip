-- 062_drive_backup_only.sql
-- Google Drive를 백업 전용으로 전환
-- 생성일: 2026-02-22

-- 1. backup_history에 백업 위치 컬럼 추가
-- 값: 'local' (서버 로컬), 'drive' (Google Drive)
ALTER TABLE backup_history
  ADD COLUMN IF NOT EXISTS backup_location VARCHAR(20) DEFAULT 'local';

-- 2. user_drive_settings에 로컬 전환 완료 플래그 추가
-- 기존 Drive primary storage 사용자가 로컬로 전환되었는지 여부
ALTER TABLE user_drive_settings
  ADD COLUMN IF NOT EXISTS migrated_to_local INTEGER DEFAULT 0;

-- 3. backup_history에 Drive 파일 ID 컬럼 추가 (Drive 백업 복원 시 필요)
ALTER TABLE backup_history
  ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(255);

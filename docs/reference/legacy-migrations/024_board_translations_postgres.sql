-- PostgreSQL version of 024_board_translations.sql
-- Auto-converted from SQLite

-- 게시판 다중언어 지원 마이그레이션
-- 생성일: 2025-12-26
-- 설명: 게시판 이름과 설명의 다중 언어 번역본을 저장하는 컬럼 추가

-- ============================================
-- boards 테이블에 번역 컬럼 추가
-- ============================================

-- 게시판 이름 번역 (JSON 형식)
-- 예: {"ko":"공지사항","en":"Announcements","ja":"お知らせ","zh-TW":"公告","zh-CN":"公告"}
DO $$ BEGIN
  ALTER TABLE boards ADD COLUMN name_translations TEXT DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 게시판 설명 번역 (JSON 형식)
DO $$ BEGIN
  ALTER TABLE boards ADD COLUMN description_translations TEXT DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- 기존 데이터 초기화 (한국어를 기본값으로)
-- ============================================
UPDATE boards
SET name_translations = json_object('ko', name)
WHERE name_translations IS NULL AND name IS NOT NULL;

UPDATE boards
SET description_translations = json_object('ko', description)
WHERE description_translations IS NULL AND description IS NOT NULL;

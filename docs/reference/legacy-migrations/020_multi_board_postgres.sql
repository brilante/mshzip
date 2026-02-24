-- 다중게시판 시스템 마이그레이션 (PostgreSQL)
-- 생성일: 2025-12-21
-- PostgreSQL 버전: 2026-01-02
-- 버전: v1.3

-- ============================================
-- 1. 게시판 정의 테이블 (boards)
-- ============================================
CREATE TABLE IF NOT EXISTS boards (
  id SERIAL PRIMARY KEY,
  board_key VARCHAR(50) UNIQUE NOT NULL,      -- URL용 키 (예: 'notice', 'free', 'qna')
  name VARCHAR(100) NOT NULL,                  -- 게시판 이름 (예: '공지사항')
  description TEXT,                            -- 게시판 설명
  icon VARCHAR(50) DEFAULT '📋',               -- 아이콘 (이모지)
  is_public BOOLEAN DEFAULT false,             -- 공개 여부 (Settings 메뉴에 표시)
  allow_file_upload BOOLEAN DEFAULT true,      -- 파일 업로드 허용
  allow_comment BOOLEAN DEFAULT true,          -- 댓글 허용
  max_file_size INTEGER DEFAULT 10485760,      -- 최대 파일 크기 (기본 10MB)
  allowed_extensions TEXT DEFAULT 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip',
  sort_order INTEGER DEFAULT 0,                -- 메뉴 표시 순서
  write_permission VARCHAR(20) DEFAULT 'user', -- 글쓰기 권한: 'admin', 'user', 'all'
  read_permission VARCHAR(20) DEFAULT 'all',   -- 읽기 권한: 'admin', 'user', 'all'
  created_by VARCHAR(100),                     -- 생성한 관리자 ID
  name_translations TEXT DEFAULT NULL,         -- 이름 다국어 번역 (JSON)
  description_translations TEXT DEFAULT NULL,  -- 설명 다국어 번역 (JSON)
  key_translations TEXT DEFAULT NULL,          -- 키 다국어 번역 (JSON)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 게시판 인덱스
CREATE INDEX IF NOT EXISTS idx_boards_key ON boards(board_key);
CREATE INDEX IF NOT EXISTS idx_boards_public ON boards(is_public);
CREATE INDEX IF NOT EXISTS idx_boards_sort ON boards(sort_order);

-- ============================================
-- 2. 게시글 테이블 (board_posts)
-- ============================================
CREATE TABLE IF NOT EXISTS board_posts (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL,                   -- 게시판 ID (FK)
  title VARCHAR(200) NOT NULL,                 -- 글 제목
  content TEXT NOT NULL,                       -- 글 내용 (HTML 또는 Markdown)
  author_id VARCHAR(100) NOT NULL,             -- 작성자 ID (Google ID)
  author_name VARCHAR(100),                    -- 작성자 표시 이름
  author_email VARCHAR(200),                   -- 작성자 이메일
  view_count INTEGER DEFAULT 0,                -- 조회수
  is_pinned BOOLEAN DEFAULT false,             -- 상단 고정
  is_notice BOOLEAN DEFAULT false,             -- 공지글 여부
  status VARCHAR(20) DEFAULT 'active',         -- 상태: 'active', 'hidden', 'deleted'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- 게시글 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_board ON board_posts(board_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON board_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON board_posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON board_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_notice ON board_posts(is_notice);
CREATE INDEX IF NOT EXISTS idx_posts_created ON board_posts(created_at);

-- ============================================
-- 3. 첨부파일 테이블 (board_files)
-- ============================================
CREATE TABLE IF NOT EXISTS board_files (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,                    -- 게시글 ID (FK)
  original_name VARCHAR(255) NOT NULL,         -- 원본 파일명
  stored_name VARCHAR(255) NOT NULL,           -- 저장된 파일명 (UUID)
  file_path VARCHAR(500) NOT NULL,             -- 저장 경로
  file_size INTEGER NOT NULL,                  -- 파일 크기 (bytes)
  mime_type VARCHAR(100),                      -- MIME 타입
  download_count INTEGER DEFAULT 0,            -- 다운로드 횟수
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES board_posts(id) ON DELETE CASCADE
);

-- 첨부파일 인덱스
CREATE INDEX IF NOT EXISTS idx_files_post ON board_files(post_id);

-- ============================================
-- 4. 댓글 테이블 (board_comments) - 비공개 댓글
-- ============================================
CREATE TABLE IF NOT EXISTS board_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,                    -- 게시글 ID (FK)
  parent_id INTEGER DEFAULT NULL,              -- 대댓글용 부모 댓글 ID (관리자 답변용)
  content TEXT NOT NULL,                       -- 댓글 내용
  author_id VARCHAR(100) NOT NULL,             -- 작성자 ID (본인만 조회 가능)
  author_name VARCHAR(100),                    -- 작성자 표시 이름
  status VARCHAR(20) DEFAULT 'active',         -- 상태: 'active', 'deleted'
  admin_reply TEXT DEFAULT NULL,               -- 관리자 답변 (선택적)
  admin_replied_at TIMESTAMP DEFAULT NULL,     -- 관리자 답변 시간
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES board_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES board_comments(id) ON DELETE CASCADE
);

-- 댓글 인덱스
CREATE INDEX IF NOT EXISTS idx_comments_post ON board_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON board_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON board_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON board_comments(status);

-- ============================================
-- 5. 기본 게시판 생성 (공지사항)
-- ============================================
INSERT INTO boards (board_key, name, description, icon, is_public, allow_comment, write_permission, read_permission, sort_order)
VALUES ('notice', '공지사항', '서비스 관련 공지사항을 안내합니다.', '📢', true, false, 'admin', 'all', 1)
ON CONFLICT (board_key) DO NOTHING;

/**
 * 다중게시판 서비스
 * 게시판 CRUD 및 권한 관리
 *
 * @updated 2025-12-31 - PostgreSQL 모드 지원 추가
 * @updated 2026-02-18 - db/index.js 공통 API로 전환 (C1 DummyDB 수정)
 */

const errorLogger = require('./errorLogger');
const TranslationService = require('./translationService');
const fs = require('fs');
const path = require('path');

// db/index.js 공통 API 사용 (PostgreSQL)
const db = require('../db');

class BoardService {
  /**
   * 게시판 생성
   */
  static async createBoard(boardData, adminUserId) {
    try {
      // 기본 번역 (원본 언어만 저장, 비동기 번역은 나중에)
      const nameTranslations = boardData.name ? JSON.stringify({ ko: boardData.name }) : null;
      const descTranslations = boardData.description ? JSON.stringify({ ko: boardData.description }) : null;

      const result = await db.run(`
        INSERT INTO boards (
          board_key, name, description, icon, is_public,
          allow_file_upload, allow_comment, max_file_size,
          allowed_extensions, sort_order, write_permission,
          read_permission, created_by, name_translations, description_translations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        boardData.board_key,
        boardData.name,
        boardData.description || null,
        boardData.icon || '',
        boardData.is_public ? 1 : 0,
        boardData.allow_file_upload !== false ? 1 : 0,
        boardData.allow_comment !== false ? 1 : 0,
        boardData.max_file_size || 10485760,
        boardData.allowed_extensions || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip',
        boardData.sort_order || 0,
        boardData.write_permission || 'user',
        boardData.read_permission || 'all',
        adminUserId,
        nameTranslations,
        descTranslations
      ]);

      const boardId = result.lastInsertRowid || result.id;

      // 게시판 디렉토리 생성
      this.createBoardDirectory(boardData.board_key);

      // 비동기로 AI 번역 수행 (백그라운드)
      this.translateBoardAsync(boardId, boardData.name, boardData.description, boardData.board_key).catch(err => {
        errorLogger.warning('게시판 비동기 번역 실패', err, {
          source: 'BoardService.createBoard.translateAsync',
          extra: { boardId }
        });
      });

      return {
        success: true,
        data: {
          id: boardId,
          board_key: boardData.board_key,
          name: boardData.name
        }
      };
    } catch (error) {
      errorLogger.error('게시판 생성 실패', error, {
        source: 'BoardService.createBoard',
        extra: { boardData, adminUserId }
      });

      if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key')) {
        return { success: false, error: '이미 존재하는 게시판 키입니다.' };
      }
      throw error;
    }
  }

  /**
   * 게시판 수정
   */
  static async updateBoard(boardId, boardData) {
    try {
      const result = await db.run(`
        UPDATE boards SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          icon = COALESCE(?, icon),
          is_public = COALESCE(?, is_public),
          allow_file_upload = COALESCE(?, allow_file_upload),
          allow_comment = COALESCE(?, allow_comment),
          max_file_size = COALESCE(?, max_file_size),
          allowed_extensions = COALESCE(?, allowed_extensions),
          sort_order = COALESCE(?, sort_order),
          write_permission = COALESCE(?, write_permission),
          read_permission = COALESCE(?, read_permission),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        boardData.name || null,
        boardData.description,
        boardData.icon || null,
        boardData.is_public !== undefined ? !!boardData.is_public : null,
        boardData.allow_file_upload !== undefined ? (boardData.allow_file_upload ? 1 : 0) : null,
        boardData.allow_comment !== undefined ? (boardData.allow_comment ? 1 : 0) : null,
        boardData.max_file_size || null,
        boardData.allowed_extensions || null,
        boardData.sort_order !== undefined ? boardData.sort_order : null,
        boardData.write_permission || null,
        boardData.read_permission || null,
        boardId
      ]);

      const changes = result.changes;

      // 이름이나 설명이 변경되면 비동기로 번역 업데이트
      if (changes > 0 && (boardData.name || boardData.description !== undefined)) {
        const existingBoard = await this.getBoardById(boardId);
        const boardKey = existingBoard?.board_key || null;
        this.translateBoardAsync(boardId, boardData.name, boardData.description, boardKey).catch(err => {
          errorLogger.warning('게시판 비동기 번역 업데이트 실패', err, {
            source: 'BoardService.updateBoard.translateAsync',
            extra: { boardId }
          });
        });
      }

      return {
        success: changes > 0,
        data: { id: boardId }
      };
    } catch (error) {
      errorLogger.error('게시판 수정 실패', error, {
        source: 'BoardService.updateBoard',
        extra: { boardId, boardData }
      });
      throw error;
    }
  }

  /**
   * 게시판 삭제
   */
  static async deleteBoard(boardId) {
    try {
      const board = await this.getBoardById(boardId);
      if (!board) {
        return { success: false, error: '게시판을 찾을 수 없습니다.' };
      }

      const result = await db.run('DELETE FROM boards WHERE id = ?', [boardId]);
      const changes = result.changes;

      if (changes > 0 && board.board_key) {
        this.deleteBoardDirectory(board.board_key);
      }

      return { success: changes > 0 };
    } catch (error) {
      errorLogger.error('게시판 삭제 실패', error, {
        source: 'BoardService.deleteBoard',
        extra: { boardId }
      });
      throw error;
    }
  }

  /**
   * 게시판 ID로 조회
   */
  static async getBoardById(boardId) {
    return db.get('SELECT * FROM boards WHERE id = ?', [boardId]);
  }

  /**
   * 게시판 키로 조회
   */
  static async getBoardByKey(boardKey) {
    return db.get('SELECT * FROM boards WHERE board_key = ?', [boardKey]);
  }

  /**
   * 전체 게시판 목록 조회
   */
  static async getAllBoards() {
    try {
      return await db.all(`
        SELECT *,
          (SELECT COUNT(*) FROM board_posts WHERE board_id = boards.id AND status = 'active') as post_count
        FROM boards
        ORDER BY sort_order ASC, created_at ASC
      `);
    } catch (error) {
      // 테이블이 없는 경우 빈 배열 반환
      if (error.code === '42P01' || error.message?.includes('no such table')) {
        console.warn('[BoardService.getAllBoards] boards 테이블이 존재하지 않습니다.');
        return [];
      }
      throw error;
    }
  }

  /**
   * 공개 게시판 목록 조회
   */
  static async getPublicBoards() {
    try {
      return await db.all(`
        SELECT id, board_key, name, description, icon, sort_order,
          allow_file_upload, allow_comment, write_permission, read_permission,
          name_translations, description_translations
        FROM boards
        WHERE is_public = true
        ORDER BY sort_order ASC, created_at ASC
      `);
    } catch (error) {
      if (error.code === '42P01' || error.message?.includes('no such table')) {
        console.warn('[BoardService.getPublicBoards] boards 테이블이 존재하지 않습니다.');
        return [];
      }
      throw error;
    }
  }

  /**
   * 공개/비공개 토글
   */
  static async togglePublic(boardId) {
    try {
      const result = await db.run(`
        UPDATE boards SET
          is_public = NOT is_public,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [boardId]);

      if (result.changes > 0) {
        const board = await this.getBoardById(boardId);
        return {
          success: true,
          data: { id: boardId, is_public: board.is_public }
        };
      }

      return { success: false, error: '게시판을 찾을 수 없습니다.' };
    } catch (error) {
      errorLogger.error('게시판 공개 토글 실패', error, {
        source: 'BoardService.togglePublic',
        extra: { boardId }
      });
      throw error;
    }
  }

  /**
   * 글쓰기 권한 확인
   */
  static async canWrite(boardKey, userId, isAdmin) {
    const board = await this.getBoardByKey(boardKey);
    if (!board) return false;

    switch (board.write_permission) {
      case 'admin':
        return isAdmin;
      case 'user':
        return !!userId;
      case 'all':
        return true;
      default:
        return false;
    }
  }

  /**
   * 읽기 권한 확인
   */
  static async canRead(boardKey, userId, isAdmin) {
    const board = await this.getBoardByKey(boardKey);
    if (!board) return false;

    switch (board.read_permission) {
      case 'admin':
        return isAdmin;
      case 'user':
        return !!userId;
      case 'all':
        return true;
      default:
        return false;
    }
  }

  /**
   * 게시판 디렉토리 생성
   */
  static createBoardDirectory(boardKey) {
    const boardPath = path.join(__dirname, '../../board', boardKey, 'save');
    if (!fs.existsSync(boardPath)) {
      fs.mkdirSync(boardPath, { recursive: true });
    }
  }

  /**
   * 게시판 디렉토리 삭제
   */
  static deleteBoardDirectory(boardKey) {
    const boardPath = path.join(__dirname, '../../board', boardKey);
    if (fs.existsSync(boardPath)) {
      fs.rmSync(boardPath, { recursive: true, force: true });
    }
  }

  /**
   * 게시판 통계
   */
  static async getBoardStats(boardId) {
    return db.get(`
      SELECT
        (SELECT COUNT(*) FROM board_posts WHERE board_id = ? AND status = 'active') as post_count,
        (SELECT COUNT(*) FROM board_comments WHERE post_id IN
          (SELECT id FROM board_posts WHERE board_id = ?) AND status = 'active') as comment_count,
        (SELECT COUNT(*) FROM board_files WHERE post_id IN
          (SELECT id FROM board_posts WHERE board_id = ?)) as file_count
    `, [boardId, boardId, boardId]);
  }

  // ============================================
  // 다중 언어 번역 관련 메서드
  // ============================================

  /**
   * 게시판 키/이름/설명 비동기 번역
   */
  static async translateBoardAsync(boardId, name, description, boardKey = null) {
    try {
      let keyTranslations = null;
      if (boardKey) {
        keyTranslations = await TranslationService.translateToAllLanguages(boardKey, 'en');
      }

      let nameTranslations = null;
      if (name) {
        nameTranslations = await TranslationService.translateToAllLanguages(name, 'ko');
      }

      let descTranslations = null;
      if (description) {
        descTranslations = await TranslationService.translateToAllLanguages(description, 'ko');
      }

      await db.run(`
        UPDATE boards SET
          key_translations = COALESCE(?, key_translations),
          name_translations = COALESCE(?, name_translations),
          description_translations = COALESCE(?, description_translations),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        keyTranslations ? JSON.stringify(keyTranslations) : null,
        nameTranslations ? JSON.stringify(nameTranslations) : null,
        descTranslations ? JSON.stringify(descTranslations) : null,
        boardId
      ]);

      return { success: true };
    } catch (error) {
      errorLogger.error('게시판 번역 업데이트 실패', error, {
        source: 'BoardService.translateBoardAsync',
        extra: { boardId, name, description, boardKey }
      });
      throw error;
    }
  }

  /**
   * 선택된 게시판 일괄 번역
   */
  static async translateSelectedBoardsAsync(boardIds, force = false) {
    const results = [];

    for (const boardId of boardIds) {
      const board = await this.getBoardById(boardId);
      if (!board) {
        results.push({ id: boardId, success: false, error: '게시판을 찾을 수 없습니다.' });
        continue;
      }

      try {
        if (!force && board.name_translations && board.key_translations) {
          try {
            const nameTranslations = JSON.parse(board.name_translations);
            const keyTranslations = JSON.parse(board.key_translations);
            const requiredLangs = ['ko', 'en', 'ja', 'zh-TW', 'zh-CN'];
            const allNameTranslated = requiredLangs.every(lang => nameTranslations[lang]);
            const allKeyTranslated = requiredLangs.every(lang => keyTranslations[lang]);

            if (allNameTranslated && allKeyTranslated) {
              results.push({ id: boardId, name: board.name, success: true, skipped: true });
              continue;
            }
          } catch (e) {
            // 파싱 실패하면 번역 진행
          }
        }

        await this.translateBoardAsync(boardId, board.name, board.description, board.board_key);
        results.push({
          id: boardId,
          key: board.board_key,
          name: board.name,
          success: true
        });
      } catch (error) {
        results.push({
          id: boardId,
          name: board.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 게시판 이름 가져오기 (다국어 지원)
   */
  static getBoardName(board, lang = 'ko') {
    if (!board) return '';

    if (board.name_translations) {
      try {
        const translations = typeof board.name_translations === 'string'
          ? JSON.parse(board.name_translations)
          : board.name_translations;
        return TranslationService.getLocalizedText(translations, lang, board.name);
      } catch (e) {
        // JSON 파싱 실패 시 기본 이름 반환
      }
    }
    return board.name || '';
  }

  /**
   * 게시판 설명 가져오기 (다국어 지원)
   */
  static getBoardDescription(board, lang = 'ko') {
    if (!board) return '';

    if (board.description_translations) {
      try {
        const translations = typeof board.description_translations === 'string'
          ? JSON.parse(board.description_translations)
          : board.description_translations;
        return TranslationService.getLocalizedText(translations, lang, board.description);
      } catch (e) {
        // JSON 파싱 실패 시 기본 설명 반환
      }
    }
    return board.description || '';
  }

  /**
   * 기존 게시판 일괄 번역 (마이그레이션 용도)
   */
  static async translateAllBoardsAsync() {
    const boards = await this.getAllBoards();
    const results = [];

    for (const board of boards) {
      try {
        await this.translateBoardAsync(board.id, board.name, board.description);
        results.push({ id: board.id, success: true });
      } catch (error) {
        results.push({ id: board.id, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = BoardService;

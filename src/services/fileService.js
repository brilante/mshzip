/**
 * 게시판 파일 서비스
 * 파일 업로드, 다운로드, 삭제 처리
 *
 * @version 1.0.0
 * @date 2025-12-21
 * @updated 2025-12-31 - PostgreSQL 모드 지원 추가
 * @updated 2026-02-18 - db/index.js 공통 API로 전환 (C1 DummyDB 수정)
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const errorLogger = require('./errorLogger');

// db/index.js 공통 API 사용 (PostgreSQL)
const db = require('../db');

// 프로젝트 루트 경로
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

class FileService {
  /**
   * 파일 저장 디렉토리 생성
   */
  static ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
  }

  /**
   * 파일 저장 경로 생성
   */
  static getFilePath(boardKey, postId) {
    const basePath = path.join(PROJECT_ROOT, 'board', boardKey, 'save', String(postId));
    return this.ensureDirectory(basePath);
  }

  /**
   * 허용된 확장자 검증
   */
  static isAllowedExtension(filename, allowedExtensions) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const allowed = allowedExtensions.split(',').map(e => e.trim().toLowerCase());
    return allowed.includes(ext);
  }

  /**
   * MIME 타입 검증
   */
  static isAllowedMimeType(mimeType) {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'text/plain',
      'text/csv',
      'application/json'
    ];
    return allowedMimeTypes.includes(mimeType);
  }

  /**
   * 파일 저장
   */
  static saveFile(file, boardKey, postId, boardConfig) {
    try {
      const allowedExtensions = boardConfig.allowed_extensions || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip';
      if (!this.isAllowedExtension(file.originalname, allowedExtensions)) {
        return { success: false, error: '허용되지 않은 파일 형식입니다.' };
      }

      if (!this.isAllowedMimeType(file.mimetype)) {
        return { success: false, error: '허용되지 않은 파일 타입입니다.' };
      }

      const maxFileSize = boardConfig.max_file_size || 3145728;
      if (file.size > maxFileSize) {
        return { success: false, error: `파일 크기는 ${Math.floor(maxFileSize / 1024 / 1024)}MB를 초과할 수 없습니다.` };
      }

      const savePath = this.getFilePath(boardKey, postId);
      const ext = path.extname(file.originalname);
      const storedName = `${uuidv4()}${ext}`;
      const fullPath = path.join(savePath, storedName);

      fs.writeFileSync(fullPath, file.buffer);

      return {
        success: true,
        data: {
          originalName: file.originalname,
          storedName: storedName,
          filePath: fullPath,
          relativePath: `board/${boardKey}/save/${postId}/${storedName}`,
          fileSize: file.size,
          mimeType: file.mimetype
        }
      };
    } catch (error) {
      errorLogger.error('파일 저장 실패', error, {
        source: 'FileService.saveFile',
        extra: { boardKey, postId, filename: file.originalname }
      });
      return { success: false, error: '파일 저장 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 파일 정보 DB 저장
   */
  static async createFileRecord(postId, fileData) {
    try {
      const result = await db.run(`
        INSERT INTO board_files (
          post_id, original_name, stored_name, file_path, file_size, mime_type
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        postId,
        fileData.originalName,
        fileData.storedName,
        fileData.relativePath,
        fileData.fileSize,
        fileData.mimeType
      ]);

      const fileId = result.lastInsertRowid || result.id;

      return {
        success: true,
        data: {
          id: fileId,
          ...fileData
        }
      };
    } catch (error) {
      errorLogger.error('파일 레코드 생성 실패', error, {
        source: 'FileService.createFileRecord',
        extra: { postId, fileData }
      });
      throw error;
    }
  }

  /**
   * 파일 ID로 조회
   */
  static async getFileById(fileId) {
    return db.get(`
      SELECT f.*, p.board_id, b.board_key
      FROM board_files f
      JOIN board_posts p ON f.post_id = p.id
      JOIN boards b ON p.board_id = b.id
      WHERE f.id = ?
    `, [fileId]);
  }

  /**
   * 게시글의 파일 목록 조회
   */
  static async getFilesByPostId(postId) {
    return db.all(`
      SELECT id, original_name, file_size, mime_type, download_count, uploaded_at
      FROM board_files
      WHERE post_id = ?
      ORDER BY uploaded_at ASC
    `, [postId]);
  }

  /**
   * 파일 다운로드 카운트 증가
   */
  static async incrementDownloadCount(fileId) {
    return db.run(`
      UPDATE board_files SET download_count = download_count + 1 WHERE id = ?
    `, [fileId]);
  }

  /**
   * 파일 삭제
   */
  static async deleteFile(fileId, userId, isAdmin) {
    try {
      const file = await this.getFileById(fileId);
      if (!file) {
        return { success: false, error: '파일을 찾을 수 없습니다.' };
      }

      const post = await db.get('SELECT author_id FROM board_posts WHERE id = ?', [file.post_id]);

      if (post.author_id !== userId && !isAdmin) {
        return { success: false, error: '삭제 권한이 없습니다.' };
      }

      // 실제 파일 삭제
      const fullPath = path.join(PROJECT_ROOT, file.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      // DB 레코드 삭제
      await db.run('DELETE FROM board_files WHERE id = ?', [fileId]);

      return { success: true };
    } catch (error) {
      errorLogger.error('파일 삭제 실패', error, {
        source: 'FileService.deleteFile',
        extra: { fileId }
      });
      return { success: false, error: '파일 삭제 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 게시글 삭제 시 모든 첨부파일 삭제
   */
  static async deleteFilesByPostId(postId) {
    try {
      const files = await this.getFilesByPostId(postId);

      // 파일 경로 조회
      const filePaths = await db.all(`
        SELECT file_path FROM board_files WHERE post_id = ?
      `, [postId]);

      // 실제 파일 삭제
      for (const file of filePaths) {
        const fullPath = path.join(PROJECT_ROOT, file.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      // DB 레코드 삭제
      await db.run('DELETE FROM board_files WHERE post_id = ?', [postId]);

      return { success: true, deletedCount: files.length };
    } catch (error) {
      errorLogger.error('게시글 파일 일괄 삭제 실패', error, {
        source: 'FileService.deleteFilesByPostId',
        extra: { postId }
      });
      return { success: false, error: '파일 삭제 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 파일 크기 포맷팅
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * MIME 타입으로 아이콘 반환
   */
  static getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'file';
    if (mimeType.includes('word')) return 'text';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bar-chart';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'film';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'package';
    return 'paperclip';
  }
}

module.exports = FileService;

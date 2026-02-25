'use strict';

/**
 * 로컬 파일 시스템 저장소 프로바이더
 * 참고: mymind3 본체의 LocalStorageProvider와 동일 구조
 *
 * save/{encodedUserId}/{마인드맵폴더}/ 기반 파일 I/O
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const UserIdEncoder = require('../../utils/userIdEncoder');
const logger = require('../../utils/logger');

class LocalStorageProvider {
  constructor() {
    this.basePath = path.resolve(__dirname, '../../../save');
    // userId → 절대 경로 캐시
    this._pathCache = new Map();
  }

  /**
   * 사용자별 저장 경로 생성 (기존 폴더 우선 탐색)
   * @param {string} userId - 사용자 ID
   * @returns {string} - 절대 경로
   */
  _getUserPath(userId) {
    const key = String(userId);
    if (this._pathCache.has(key)) {
      return this._pathCache.get(key);
    }
    const folder = UserIdEncoder.findUserFolderSync(userId, this.basePath);
    const userPath = path.join(this.basePath, folder);
    this._pathCache.set(key, userPath);
    return userPath;
  }

  /**
   * 파일 저장
   * @param {string} userId - 사용자 ID
   * @param {string} filePath - 상대 경로
   * @param {string|Buffer} content - 저장할 내용
   * @returns {Promise<{success: boolean, path: string}>}
   */
  async saveFile(userId, filePath, content) {
    const fullPath = path.join(this._getUserPath(userId), filePath);
    const dir = path.dirname(fullPath);

    // 디렉토리 생성
    await fs.mkdir(dir, { recursive: true });

    // 파일 저장 (Buffer는 바이너리로, 문자열은 utf8로)
    if (Buffer.isBuffer(content)) {
      await fs.writeFile(fullPath, content);
    } else {
      await fs.writeFile(fullPath, content, 'utf8');
    }

    return { success: true, path: fullPath };
  }

  /**
   * 파일 불러오기
   * @param {string} userId - 사용자 ID
   * @param {string} filePath - 상대 경로
   * @param {Object} options - 옵션 { binary: true }면 Buffer 반환
   * @returns {Promise<string|Buffer>} - 파일 내용
   */
  async loadFile(userId, filePath, options = {}) {
    const fullPath = path.join(this._getUserPath(userId), filePath);
    if (options.binary) {
      return fs.readFile(fullPath);
    }
    return fs.readFile(fullPath, 'utf8');
  }

  /**
   * 파일 삭제
   * @param {string} userId - 사용자 ID
   * @param {string} filePath - 상대 경로
   * @returns {Promise<{success: boolean}>}
   */
  async deleteFile(userId, filePath) {
    const fullPath = path.join(this._getUserPath(userId), filePath);
    await fs.unlink(fullPath);
    return { success: true };
  }

  /**
   * 디렉토리 내 파일/폴더 목록 조회
   * @param {string} userId - 사용자 ID
   * @param {string} directory - 상대 경로
   * @returns {Promise<Array<{name: string, isDirectory: boolean, mtime: Date}>>}
   */
  async listFiles(userId, directory = '') {
    const dirPath = path.join(this._getUserPath(userId), directory);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const results = await Promise.all(entries.map(async (e) => {
        const fullPath = path.join(dirPath, e.name);
        try {
          const stat = await fs.stat(fullPath);
          return {
            name: e.name,
            isDirectory: e.isDirectory(),
            mtime: stat.mtime
          };
        } catch {
          return {
            name: e.name,
            isDirectory: e.isDirectory(),
            mtime: new Date(0)
          };
        }
      }));
      return results;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      logger.warn('로컬 스토리지 디렉토리 읽기 실패', { userId, directory, error: error.message });
      throw error;
    }
  }

  /**
   * 파일/폴더 존재 여부 확인
   * @param {string} userId - 사용자 ID
   * @param {string} filePath - 상대 경로
   * @returns {Promise<boolean>}
   */
  async exists(userId, filePath) {
    const fullPath = path.join(this._getUserPath(userId), filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 사용자 저장소 사용량 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise<{totalSize: number, fileCount: number}>}
   */
  async getUsage(userId) {
    const userPath = this._getUserPath(userId);
    let totalSize = 0;
    let fileCount = 0;

    const calcSize = async (dir) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await calcSize(fullPath);
          } else {
            const stat = await fs.stat(fullPath);
            totalSize += stat.size;
            fileCount++;
          }
        }
      } catch (e) {
        if (e.code !== 'ENOENT') {
          logger.warn('로컬 스토리지 사용량 계산 실패', { userId, dir, error: e.message });
        }
      }
    };

    await calcSize(userPath);
    return { totalSize, fileCount };
  }

  /**
   * 디렉토리 삭제 (재귀적)
   * @param {string} userId - 사용자 ID
   * @param {string} directory - 상대 경로
   * @returns {Promise<{success: boolean}>}
   */
  async deleteDirectory(userId, directory) {
    const fullPath = path.join(this._getUserPath(userId), directory);

    try {
      await fs.access(fullPath);
    } catch {
      return { success: true, existed: false };
    }

    await fs.rm(fullPath, { recursive: true, force: true });
    return { success: true, existed: true };
  }

  /**
   * 파일/폴더 복사
   * @param {string} userId - 사용자 ID
   * @param {string} sourcePath - 소스 경로
   * @param {string} targetPath - 대상 경로
   * @returns {Promise<{success: boolean}>}
   */
  async copy(userId, sourcePath, targetPath) {
    const srcFull = path.join(this._getUserPath(userId), sourcePath);
    const tgtFull = path.join(this._getUserPath(userId), targetPath);

    const stat = await fs.stat(srcFull);

    if (stat.isDirectory()) {
      await this._copyDirectory(srcFull, tgtFull);
    } else {
      await fs.mkdir(path.dirname(tgtFull), { recursive: true });
      await fs.copyFile(srcFull, tgtFull);
    }

    return { success: true };
  }

  /**
   * 디렉토리 재귀 복사 (내부 헬퍼)
   */
  async _copyDirectory(src, tgt) {
    await fs.mkdir(tgt, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const tgtPath = path.join(tgt, entry.name);
      if (entry.isDirectory()) {
        await this._copyDirectory(srcPath, tgtPath);
      } else {
        await fs.copyFile(srcPath, tgtPath);
      }
    }
  }

  /**
   * 파일/폴더 이동 (이름 변경)
   * @param {string} userId - 사용자 ID
   * @param {string} sourcePath - 소스 경로
   * @param {string} targetPath - 대상 경로
   * @returns {Promise<{success: boolean}>}
   */
  async move(userId, sourcePath, targetPath) {
    const srcFull = path.join(this._getUserPath(userId), sourcePath);
    const tgtFull = path.join(this._getUserPath(userId), targetPath);

    await fs.mkdir(path.dirname(tgtFull), { recursive: true });
    await fs.rename(srcFull, tgtFull);

    return { success: true };
  }

  /**
   * 파일의 처음 N바이트만 읽기
   * @param {string} userId - 사용자 ID
   * @param {string} filePath - 상대 경로
   * @param {number} bytes - 읽을 바이트 수 (기본 512)
   * @returns {Promise<string>}
   */
  async readFilePartial(userId, filePath, bytes = 512) {
    const fullPath = path.join(this._getUserPath(userId), filePath);
    const fd = await fs.open(fullPath, 'r');
    try {
      const buffer = Buffer.alloc(bytes);
      const { bytesRead } = await fd.read(buffer, 0, bytes, 0);
      return buffer.toString('utf8', 0, bytesRead);
    } finally {
      await fd.close();
    }
  }

  /**
   * 파일 정보 조회
   * @param {string} userId - 사용자 ID
   * @param {string} filePath - 상대 경로
   * @returns {Promise<{size: number, mtime: Date, isDirectory: boolean}>}
   */
  async getFileInfo(userId, filePath) {
    const fullPath = path.join(this._getUserPath(userId), filePath);
    const stat = await fs.stat(fullPath);
    return {
      size: stat.size,
      mtime: stat.mtime,
      isDirectory: stat.isDirectory()
    };
  }
}

module.exports = LocalStorageProvider;

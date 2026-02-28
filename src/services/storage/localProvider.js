'use strict';

/**
 * 로컬 파일 시스템 저장소 프로바이더
 * 참고: mymind3 본체의 LocalStorageProvider와 동일 구조
 *
 * 경로 구조 (신규): save/{yyyy}/{yyyyMM}/{yyyyMMdd}/{userHash}/
 * 경로 구조 (레거시): save/{userHash}/
 *
 * DB user_id_mapping.date_path 값을 읽어 경로를 결정합니다.
 * date_path 없으면 findUserFolderSync 폴백으로 기존 폴더를 탐색합니다.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const UserIdEncoder = require('../../utils/userIdEncoder');
const logger = require('../../utils/logger');

class LocalStorageProvider {
  constructor() {
    this.basePath = path.resolve(__dirname, '../../../save');
    // userId → 절대 경로 캐시 (비동기 조회 결과 재사용)
    this._pathCache = new Map();
  }

  /**
   * 사용자별 저장 경로 확인 (DB 기반 date_path 우선)
   *
   * 1순위: DB user_id_mapping.date_path + user_id_hash
   *   → save/{yyyy}/{yyyyMM}/{yyyyMMdd}/{hash}
   * 2순위: 기존 .userid 마커 탐색 (findUserFolderSync 폴백)
   *
   * @param {string} userId - 사용자 ID
   * @returns {Promise<string>} - 절대 경로
   */
  async _getUserPath(userId) {
    const key = String(userId);
    if (this._pathCache.has(key)) {
      return this._pathCache.get(key);
    }
    // DB에서 date_path 포함 상대경로 조회
    const relativePath = await UserIdEncoder.resolveUserPath(userId, this.basePath);
    const userPath = path.join(this.basePath, relativePath);
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
    const userPath = await this._getUserPath(userId);
    const fullPath = path.join(userPath, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });

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
   * @returns {Promise<string|Buffer>}
   */
  async loadFile(userId, filePath, options = {}) {
    const userPath = await this._getUserPath(userId);
    const fullPath = path.join(userPath, filePath);
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
    const userPath = await this._getUserPath(userId);
    const fullPath = path.join(userPath, filePath);
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
    const userPath = await this._getUserPath(userId);
    const dirPath = path.join(userPath, directory);

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
    const userPath = await this._getUserPath(userId);
    const fullPath = path.join(userPath, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 사용자 저장소 사용량 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise<{totalSize: number, fileCount: number}>}
   */
  async getUsage(userId) {
    const userPath = await this._getUserPath(userId);
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
    const userPath = await this._getUserPath(userId);
    const fullPath = path.join(userPath, directory);

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
    const userPath = await this._getUserPath(userId);
    const srcFull = path.join(userPath, sourcePath);
    const tgtFull = path.join(userPath, targetPath);

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
    const userPath = await this._getUserPath(userId);
    const srcFull = path.join(userPath, sourcePath);
    const tgtFull = path.join(userPath, targetPath);

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
    const userPath = await this._getUserPath(userId);
    const fullPath = path.join(userPath, filePath);
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
    const userPath = await this._getUserPath(userId);
    const fullPath = path.join(userPath, filePath);
    const stat = await fs.stat(fullPath);
    return {
      size: stat.size,
      mtime: stat.mtime,
      isDirectory: stat.isDirectory()
    };
  }
}

module.exports = LocalStorageProvider;

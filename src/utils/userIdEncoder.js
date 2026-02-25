'use strict';

/**
 * 사용자 ID 인코딩 유틸리티
 * 참고: mymind3 본체의 userIdEncoder.js와 동일 구현
 *
 * Base64 → SHA256 해시 → bcrypt+Base64(100자) 전환
 *
 * @description
 * - 신규 사용자: bcrypt + Base64 해시 (100자) 사용
 * - 레거시 사용자: HMAC-SHA256 (32자) 또는 Base64 인코딩
 * - 매핑 캐시로 조회 성능 최적화
 * - 자동 마이그레이션 지원
 */
const EncryptionService = require('../services/encryptionService');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// 마이그레이션 중 호환성을 위한 매핑 캐시
const idMappingCache = new Map();

// 기존 폴더 탐색 결과 캐시 (userId → 폴더명)
const _folderCache = new Map();

class UserIdEncoder {
  /**
   * 사용자 ID를 폴더명으로 변환 V2 (신규 방식: bcrypt + Base64, 100자)
   * @param {string} userId - 사용자 ID
   * @returns {Promise<string|null>} - 폴더명 (100자) 또는 null
   */
  static async encodeV2(userId) {
    return EncryptionService.hashUserIdV2(userId);
  }

  /**
   * 사용자 ID를 폴더명으로 변환 (V2: bcrypt + Base64, 100자)
   * @param {string} userId - 사용자 ID
   * @returns {string|null} - 폴더명 (100자) 또는 null
   */
  static encode(userId) {
    return EncryptionService.hashUserIdV2Sync(userId);
  }

  /**
   * 사용자 ID를 폴더명으로 변환 (V1: HMAC-SHA256, 32자) - 레거시 호환용
   * @param {string} userId - 사용자 ID
   * @returns {string|null} - 폴더명 (32자 해시) 또는 null
   */
  static encodeV1(userId) {
    return EncryptionService.hashUserId(userId);
  }

  /**
   * 레거시 Base64 인코딩 (마이그레이션용)
   * @param {string} userId - 사용자 ID
   * @returns {string} - Base64 인코딩된 폴더명
   */
  static encodeLegacy(userId) {
    if (!userId) return null;
    return Buffer.from(userId).toString('base64');
  }

  /**
   * 사용자의 실제 폴더 경로 찾기 (호환성 우선순위 적용)
   * @param {string} userId - 사용자 ID
   * @param {string} saveDir - 저장 디렉토리 경로
   * @returns {Promise<{folder: string, version: number}>} - 폴더명과 버전
   */
  static async findUserFolder(userId, saveDir) {
    if (!userId || !saveDir) return { folder: null, version: 0 };

    const found = this.findUserFolderSync(userId, saveDir);
    if (!found) return { folder: null, version: 0 };

    const version = this.getFolderVersion(found);
    return { folder: found, version };
  }

  /**
   * 사용자의 실제 폴더 경로 찾기 (동기 버전)
   * .userid 마커 파일, bcrypt 비교, 단일 폴더 휴리스틱으로 기존 폴더 재사용
   *
   * @param {string} userId - 사용자 ID
   * @param {string} saveDir - 저장 디렉토리 경로 (예: config.paths.save)
   * @returns {string} - 폴더명 (기존 폴더 또는 새 V2 해시)
   */
  static findUserFolderSync(userId, saveDir) {
    if (!userId || !saveDir) return this.encode(userId);

    const key = String(userId);

    // 캐시 확인
    if (_folderCache.has(key)) {
      return _folderCache.get(key);
    }

    // 1. 현재 V2 해시로 폴더가 존재하는지 확인
    const currentHash = this.encode(userId);
    if (currentHash && fs.existsSync(path.join(saveDir, currentHash))) {
      this._ensureUserMarker(saveDir, currentHash, userId);
      _folderCache.set(key, currentHash);
      return currentHash;
    }

    // 2. .userid 마커 파일로 기존 폴더 탐색
    const markerFound = this._findByUserMarker(userId, saveDir);
    if (markerFound) {
      console.log(`[UserIdEncoder] .userid 마커로 기존 폴더 발견: ${markerFound}`);
      _folderCache.set(key, markerFound);
      return markerFound;
    }

    // 3. V1 폴더 (HMAC-SHA256, 32자) 확인
    const v1Folder = this.encodeV1(userId);
    if (v1Folder && fs.existsSync(path.join(saveDir, v1Folder))) {
      console.log(`[UserIdEncoder] V1 폴더 발견: ${v1Folder}`);
      this._ensureUserMarker(saveDir, v1Folder, userId);
      _folderCache.set(key, v1Folder);
      return v1Folder;
    }

    // 4. Legacy 폴더 (Base64) 확인
    const legacyFolder = this.encodeLegacy(userId);
    if (legacyFolder && fs.existsSync(path.join(saveDir, legacyFolder))) {
      console.log(`[UserIdEncoder] Legacy 폴더 발견: ${legacyFolder}`);
      this._ensureUserMarker(saveDir, legacyFolder, userId);
      _folderCache.set(key, legacyFolder);
      return legacyFolder;
    }

    // 5. bcrypt 매칭 스캔 (동일 ENCRYPTION_KEY로 생성된 폴더)
    const bcryptFound = this._scanV2FolderSync(userId, saveDir, currentHash);
    if (bcryptFound) {
      this._ensureUserMarker(saveDir, bcryptFound, userId);
      _folderCache.set(key, bcryptFound);
      return bcryptFound;
    }

    // 6. 마커 없는 V2 폴더가 단 1개이고, 해당 사용자 외 다른 매칭이 없으면 사용
    const orphanFolder = this._findOrphanV2Folder(saveDir, currentHash);
    if (orphanFolder) {
      console.log(`[UserIdEncoder] 마커 없는 단일 V2 폴더 발견, 사용자에게 할당: ${orphanFolder}`);
      this._ensureUserMarker(saveDir, orphanFolder, userId);
      _folderCache.set(key, orphanFolder);
      return orphanFolder;
    }

    // 7. 기존 폴더 없음 - 새 V2 해시 사용
    _folderCache.set(key, currentHash);
    return currentHash;
  }

  /**
   * .userid 마커 파일로 기존 폴더 탐색 (내부 헬퍼)
   * @param {string} userId - 사용자 ID
   * @param {string} saveDir - 저장 디렉토리 경로
   * @returns {string|null} - 매칭된 폴더명 또는 null
   */
  static _findByUserMarker(userId, saveDir) {
    try {
      const entries = fs.readdirSync(saveDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('_')) continue;

        const markerPath = path.join(saveDir, entry.name, '.userid');
        try {
          const stored = fs.readFileSync(markerPath, 'utf8').trim();
          if (stored === userId) return entry.name;
        } catch (e) {
          // 마커 파일 없음 - 무시
        }
      }
    } catch (e) {
      // save 디렉토리가 없으면 무시
    }
    return null;
  }

  /**
   * .userid 마커가 없는 단일 V2 폴더 찾기 (내부 헬퍼)
   * 마커 없는 V2 폴더가 정확히 1개만 있을 때만 반환
   * @param {string} saveDir - 저장 디렉토리 경로
   * @param {string} skipFolder - 스킵할 폴더명
   * @returns {string|null}
   */
  static _findOrphanV2Folder(saveDir, skipFolder) {
    try {
      const entries = fs.readdirSync(saveDir, { withFileTypes: true });
      const orphans = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === skipFolder) continue;
        if (entry.name.startsWith('_')) continue;
        if (!EncryptionService.isV2Format(entry.name)) continue;

        // .userid 마커가 없는 폴더만
        const markerPath = path.join(saveDir, entry.name, '.userid');
        if (!fs.existsSync(markerPath)) {
          orphans.push(entry.name);
        }
      }
      return orphans.length === 1 ? orphans[0] : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * .userid 마커 파일 생성 (내부 헬퍼)
   * 폴더에 소유자 userId를 기록하여 향후 빠른 탐색 지원
   * @param {string} saveDir - 저장 디렉토리 경로
   * @param {string} folder - 폴더명
   * @param {string} userId - 사용자 ID
   */
  static _ensureUserMarker(saveDir, folder, userId) {
    const markerPath = path.join(saveDir, folder, '.userid');
    try {
      if (!fs.existsSync(markerPath)) {
        fs.mkdirSync(path.join(saveDir, folder), { recursive: true });
        fs.writeFileSync(markerPath, userId, 'utf8');
        console.log(`[UserIdEncoder] .userid 마커 생성: ${folder}`);
      }
    } catch (e) {
      // 마커 생성 실패는 치명적이지 않음 - 무시
    }
  }

  /**
   * V2 형식 기존 폴더를 bcrypt.compareSync로 스캔 (내부 헬퍼)
   * 폴더명에서 bcrypt 해시를 추출하여 userId와 매칭
   *
   * @param {string} userId - 사용자 ID
   * @param {string} saveDir - 저장 디렉토리 경로
   * @param {string} skipFolder - 이미 확인한 폴더명 (스킵)
   * @returns {string|null} - 매칭된 폴더명 또는 null
   */
  static _scanV2FolderSync(userId, saveDir, skipFolder) {
    try {
      const entries = fs.readdirSync(saveDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === skipFolder) continue;
        if (entry.name.startsWith('_')) continue;
        if (!EncryptionService.isV2Format(entry.name)) continue;

        try {
          // URL-safe Base64 → 표준 Base64 → bcrypt 해시 추출
          const urlSafeBase64 = entry.name.substring(0, 80);
          const standardBase64 = urlSafeBase64
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          const bcryptHash = Buffer.from(standardBase64, 'base64').toString('utf8');

          // bcrypt 형식 검증 후 비교
          if (bcryptHash.startsWith('$2b$') && bcrypt.compareSync(userId, bcryptHash)) {
            console.log(`[UserIdEncoder] 기존 폴더 발견 (bcrypt 매칭): ${entry.name}`);
            return entry.name;
          }
        } catch (e) {
          // 디코딩/비교 실패 - 무시하고 다음 폴더 확인
        }
      }
    } catch (e) {
      // save 디렉토리가 없으면 무시
    }
    return null;
  }

  /**
   * 폴더명 버전 확인
   * @param {string} folderName - 폴더명
   * @returns {number} - 1: Base64, 2: HMAC-SHA256(32자), 3: bcrypt+Base64(100자)
   */
  static getFolderVersion(folderName) {
    if (!folderName) return 0;

    // V2: 100자 URL-safe Base64
    if (EncryptionService.isV2Format(folderName)) {
      return 3;
    }

    // V1: 32자 hex
    if (this.isHashFormat(folderName)) {
      return 2;
    }

    // Legacy: Base64
    if (this.isBase64Format(folderName)) {
      return 1;
    }

    return 0;
  }

  /**
   * 레거시 Base64 디코딩 (마이그레이션용)
   * @param {string} encoded - Base64 인코딩된 문자열
   * @returns {string|null} - 원본 userId 또는 null
   */
  static decodeLegacy(encoded) {
    if (!encoded) return null;
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      if (Buffer.from(decoded).toString('base64') === encoded) {
        return decoded;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 폴더명이 해시 형식인지 확인
   * @param {string} folderName - 폴더명
   * @returns {boolean}
   */
  static isHashFormat(folderName) {
    if (!folderName) return false;
    return /^[0-9a-fA-F]{32}$/.test(folderName);
  }

  /**
   * 폴더명이 Base64 형식인지 확인
   * @param {string} folderName - 폴더명
   * @returns {boolean}
   */
  static isBase64Format(folderName) {
    if (!folderName) return false;
    try {
      const decoded = Buffer.from(folderName, 'base64').toString('utf-8');
      return Buffer.from(decoded).toString('base64') === folderName;
    } catch {
      return false;
    }
  }

  /**
   * 캐시 초기화
   */
  static clearCache() {
    idMappingCache.clear();
    _folderCache.clear();
  }

  /**
   * 캐시 크기 조회
   * @returns {number}
   */
  static getCacheSize() {
    return idMappingCache.size;
  }
}

module.exports = UserIdEncoder;

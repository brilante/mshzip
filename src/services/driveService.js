/**
 * Google Drive 서비스 (백업 전용)
 * Drive는 마인드맵 백업 저장소로만 사용
 * 마인드맵 I/O는 항상 로컬 스토리지에서 수행
 *
 * 참고소스(mymind3) 동등 구현
 * googleapis SDK 대신 native fetch() 사용 (경량화)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const archiver = require('archiver');
const DriveSettings = require('../db/models/DriveSettings');
const EncryptionService = require('./encryptionService');
const errorLogger = require('./errorLogger');

const ROOT_DIR = path.join(__dirname, '../..');

/**
 * 동시 실행 수 제한 헬퍼 (p-limit 대체, CJS 호환)
 * @param {number} concurrency - 최대 동시 실행 수
 */
function createLimiter(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    while (active < concurrency && queue.length > 0) {
      active++;
      const { fn, resolve, reject } = queue.shift();
      fn().then(resolve, reject).finally(() => { active--; next(); });
    }
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
}

class DriveService {
  constructor() {
    // 폴더 ID 캐시: "parentId:folderName" → folderId (세션 내 재사용)
    this._folderCache = new Map();
    // 글로벌 rate limit 상태
    this._globalRateLimit = {
      count: 0,
      lastRateLimitAt: 0,
      cooldownUntil: 0
    };
  }

  /**
   * Rate limit 감지 시 글로벌 쿨다운 트리거
   */
  _triggerRateLimitCooldown() {
    const rl = this._globalRateLimit;
    rl.count++;
    rl.lastRateLimitAt = Date.now();
    const baseCooldown = Math.min(10000 * Math.pow(2, Math.floor(rl.count / 5)), 60000);
    rl.cooldownUntil = Date.now() + baseCooldown;
    if (rl.count % 10 === 1) {
      console.warn(`[DRV:RL] 글로벌 쿨다운: ${baseCooldown / 1000}s (누적 ${rl.count}회)`);
    }
  }

  /**
   * 글로벌 rate limit 쿨다운 상태 초기화
   */
  _resetRateLimitCooldown() {
    this._globalRateLimit.count = 0;
    this._globalRateLimit.lastRateLimitAt = 0;
    this._globalRateLimit.cooldownUntil = 0;
  }

  /**
   * 폴더 캐시 초기화
   */
  clearFolderCache() {
    this._folderCache.clear();
  }

  /**
   * drive_path 설정에서 basePath를 정규화
   */
  _resolveBasePath(settings) {
    let basePath = settings?.drive_path || '/MyMind3';
    basePath = basePath.replace(/\/saves\/?$/, '');
    return basePath;
  }

  // =====================================================
  // 토큰 관리 (native https, googleapis 불필요)
  // =====================================================

  /**
   * refresh_token으로 access_token 갱신
   * @param {string} refreshToken - 복호화된 refresh token
   * @returns {Promise<Object>} - { access_token, expires_in, ... }
   */
  _refreshAccessToken(refreshToken) {
    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString();

      const options = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode !== 200) {
              reject(new Error(parsed.error_description || '토큰 갱신 실패'));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error('토큰 갱신 응답 파싱 실패'));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * 인증된 access_token 가져오기 (만료 시 자동 갱신)
   * @param {string} userId - 사용자 ID
   * @returns {Promise<string>} - 유효한 access_token
   */
  async getValidAccessToken(userId) {
    const settings = await DriveSettings.getByUserId(userId);

    if (!settings || !settings.access_token_encrypted) {
      throw new Error('드라이브 연결이 필요합니다.');
    }

    let accessToken = EncryptionService.decrypt(settings.access_token_encrypted);
    const refreshToken = settings.refresh_token_encrypted
      ? EncryptionService.decrypt(settings.refresh_token_encrypted)
      : null;

    // 토큰 만료 확인
    if (settings.token_expiry && new Date(settings.token_expiry) < new Date()) {
      if (!refreshToken) {
        throw new Error('토큰 만료. 다시 연결해주세요.');
      }

      try {
        const newTokens = await this._refreshAccessToken(refreshToken);
        accessToken = newTokens.access_token;

        // DB 업데이트
        const expiryDate = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString();
        await DriveSettings.updateTokens(
          userId,
          EncryptionService.encrypt(newTokens.access_token),
          newTokens.refresh_token
            ? EncryptionService.encrypt(newTokens.refresh_token)
            : settings.refresh_token_encrypted,
          expiryDate
        );

        console.log(`[DriveService] 토큰 갱신 완료: userId=${userId}`);
      } catch (error) {
        errorLogger.error('드라이브 토큰 갱신 실패', error, {
          source: 'service.driveService.getValidAccessToken',
          userId,
          extra: { tokenExpiry: settings.token_expiry }
        });
        console.error('[DriveService] 토큰 갱신 실패:', error.message);
        throw new Error('토큰 갱신 실패. 다시 연결해주세요.');
      }
    }

    return accessToken;
  }

  // =====================================================
  // Drive API 호출 헬퍼 (native fetch)
  // =====================================================

  /**
   * Drive API GET 호출
   * @param {string} accessToken
   * @param {string} apiPath - /drive/v3/... 경로
   * @returns {Promise<Object>}
   */
  async _callDriveApi(accessToken, apiPath) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: apiPath,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            reject(new Error('Drive API 응답 파싱 실패'));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Drive API DELETE 호출
   * @param {string} accessToken
   * @param {string} fileId
   */
  async _deleteDriveFile(accessToken, fileId) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: `/drive/v3/files/${fileId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 204 || res.statusCode === 200) {
            resolve({ success: true });
          } else {
            reject(new Error(`Drive 삭제 실패: HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * 재시도 래퍼
   */
  async _withRetry(fn, maxRetries = 5, options = {}) {
    const { skipRateRetry = false } = options;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const status = error.code || error.status;
        const is429 = status === 429;
        const isRetryable = is429 || (status >= 500 && status < 600);

        if (is429 && skipRateRetry) {
          throw error;
        }

        if (isRetryable && attempt < maxRetries) {
          const delay = Math.min(Math.pow(2, attempt) * 500 + Math.random() * 500, 8000);
          console.log(`[DriveService] Rate limited (${status}), retry in ${(delay / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
  }

  // =====================================================
  // 폴더 관리
  // =====================================================

  /**
   * 폴더 생성 또는 가져오기
   * @param {string} accessToken
   * @param {string} folderName
   * @param {string|null} parentId
   * @returns {Promise<string>} - folderId
   */
  async getOrCreateFolder(accessToken, folderName, parentId = null) {
    const cacheKey = `${parentId || 'root'}:${folderName}`;
    if (this._folderCache.has(cacheKey)) {
      return this._folderCache.get(cacheKey);
    }

    // 기존 폴더 검색
    const parentFilter = parentId
      ? `'${parentId}' in parents`
      : `'root' in parents`;
    const query = encodeURIComponent(
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and ${parentFilter} and trashed=false`
    );
    const fields = encodeURIComponent('files(id,name)');

    const response = await this._callDriveApi(
      accessToken,
      `/drive/v3/files?q=${query}&fields=${fields}`
    );

    if (response.status === 200 && response.data.files && response.data.files.length > 0) {
      const folderId = response.data.files[0].id;
      this._folderCache.set(cacheKey, folderId);
      return folderId;
    }

    // 폴더 생성
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) metadata.parents = [parentId];

    const createResult = await new Promise((resolve, reject) => {
      const body = JSON.stringify(metadata);
      const options = {
        hostname: 'www.googleapis.com',
        path: '/drive/v3/files?fields=id',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200) {
              resolve(parsed);
            } else {
              reject(new Error(`폴더 생성 실패: HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error('폴더 생성 응답 파싱 실패'));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const newFolderId = createResult.id;
    this._folderCache.set(cacheKey, newFolderId);
    console.log(`[DriveService] 폴더 생성: ${folderName} (id=${newFolderId})`);
    return newFolderId;
  }

  /**
   * basePath 문자열에서 Drive 폴더 ID를 탐색/생성
   * @param {string} accessToken
   * @param {string} pathStr - 예: "/MyMind3"
   * @param {Object} options
   * @returns {Promise<string|null>} - folderId
   */
  async _resolvePathToFolderId(accessToken, pathStr, options = {}) {
    const { createIfMissing = false, throwOnNotFound = true } = options;
    const pathParts = pathStr.split('/').filter(p => p);
    let parentId = null;

    for (const part of pathParts) {
      if (createIfMissing) {
        parentId = await this.getOrCreateFolder(accessToken, part, parentId);
      } else {
        const parentFilter = parentId
          ? `'${parentId}' in parents`
          : `'root' in parents`;
        const query = encodeURIComponent(
          `name='${part}' and mimeType='application/vnd.google-apps.folder' and ${parentFilter} and trashed=false`
        );
        const fields = encodeURIComponent('files(id)');

        const response = await this._callDriveApi(
          accessToken,
          `/drive/v3/files?q=${query}&fields=${fields}`
        );

        if (!response.data.files || response.data.files.length === 0) {
          if (throwOnNotFound) {
            throw new Error(`폴더를 찾을 수 없습니다: ${part}`);
          }
          return null;
        }
        parentId = response.data.files[0].id;
      }
    }
    return parentId;
  }

  // =====================================================
  // 연결 테스트 / 해제
  // =====================================================

  /**
   * 연결 테스트
   */
  async testConnection(userId) {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      const response = await this._callDriveApi(accessToken, '/drive/v3/about?fields=user,storageQuota');

      if (response.status === 200) {
        return {
          success: true,
          user: response.data.user,
          quota: response.data.storageQuota
        };
      }
      return { success: false, error: '토큰 만료 또는 권한 부족' };
    } catch (error) {
      errorLogger.warning('드라이브 연결 테스트 실패', error, {
        source: 'service.driveService.testConnection',
        userId
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * 연결 해제
   */
  async disconnect(userId) {
    try {
      await DriveSettings.deleteByUserId(userId);
      console.log(`[DriveService] 연결 해제: userId=${userId}`);
      return { success: true };
    } catch (error) {
      errorLogger.warning('드라이브 연결 해제 실패', error, {
        source: 'service.driveService.disconnect',
        userId
      });
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // 백업 전용 기능
  // =====================================================

  /**
   * 백업 ZIP을 Drive에 업로드
   * Node.js 24.x + googleapis pipe chain 데드락 우회:
   * native fetch()로 Google Drive API를 직접 호출
   *
   * @param {string} userId - 사용자 ID
   * @param {string} zipPath - 로컬 ZIP 파일 경로
   * @param {string} fileName - Drive에 저장할 파일명 (예: "backup_2026-02-22.zip")
   * @returns {Promise<{success: boolean, fileId: string}>}
   */
  async uploadBackupZip(userId, zipPath, fileName) {
    const UPLOAD_TIMEOUT = 180000;
    const accessToken = await this.getValidAccessToken(userId);
    const settings = await DriveSettings.getByUserId(userId);
    const basePath = this._resolveBasePath(settings);

    // basePath 폴더에 직접 백업 ZIP 업로드
    const baseId = await this._resolvePathToFolderId(accessToken, basePath, { createIfMissing: true });
    console.log(`[DriveService] 백업 업로드 시작: ${fileName} → ${basePath} (folderId=${baseId})`);

    // 기존 파일 확인
    const existingQuery = encodeURIComponent(`name='${fileName}' and '${baseId}' in parents and trashed=false`);
    const existingFields = encodeURIComponent('files(id)');
    const existingRes = await this._callDriveApi(
      accessToken,
      `/drive/v3/files?q=${existingQuery}&fields=${existingFields}`
    );
    const existingId = (existingRes.data.files && existingRes.data.files.length > 0)
      ? existingRes.data.files[0].id
      : null;

    const zipBuffer = fs.readFileSync(zipPath);
    const headers = { 'Authorization': `Bearer ${accessToken}` };
    const controller = new AbortController();
    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`Drive 업로드 타임아웃 (${UPLOAD_TIMEOUT / 1000}초): ${fileName}`));
      }, UPLOAD_TIMEOUT);
    });

    try {
      if (existingId) {
        // 기존 파일 덮어쓰기 (PATCH)
        const uploadPromise = fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/zip' },
            body: zipBuffer,
            signal: controller.signal,
          }
        ).then(async (res) => {
          if (!res.ok) throw new Error(`Drive upload failed: ${res.status} ${await res.text()}`);
          return res.json();
        });

        await Promise.race([uploadPromise, timeoutPromise]);
        console.log(`[DriveService] 백업 업로드 완료 (덮어쓰기): ${fileName} (fileId=${existingId})`);
        return { success: true, fileId: existingId };
      }

      // 새 파일 생성 (POST - multipart)
      const boundary = `zip_boundary_${Date.now()}`;
      const metadata = JSON.stringify({ name: fileName, parents: [baseId] });
      const preamble = Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/zip\r\n\r\n`
      );
      const epilogue = Buffer.from(`\r\n--${boundary}--`);
      const body = Buffer.concat([preamble, zipBuffer, epilogue]);

      const uploadPromise = fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
          signal: controller.signal,
        }
      ).then(async (res) => {
        if (!res.ok) throw new Error(`Drive upload failed: ${res.status} ${await res.text()}`);
        return res.json();
      });

      const data = await Promise.race([uploadPromise, timeoutPromise]);
      console.log(`[DriveService] 백업 업로드 완료 (신규): ${fileName} (fileId=${data.id})`);
      return { success: true, fileId: data.id };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Drive 백업 ZIP 다운로드
   * @param {string} userId - 사용자 ID
   * @param {string} fileId - Drive 파일 ID
   * @param {string} destPath - 저장할 로컬 경로
   */
  async downloadBackupZip(userId, fileId, destPath) {
    const accessToken = await this.getValidAccessToken(userId);
    console.log(`[DriveService] 백업 다운로드 시작: fileId=${fileId} → ${destPath}`);
    await this.downloadFile(accessToken, fileId, destPath);
    console.log(`[DriveService] 백업 다운로드 완료: ${destPath}`);
  }

  /**
   * 단일 파일 다운로드 (크기/무결성 검증 포함)
   * native fetch() 사용 (Node.js 24.x + gaxios 7.x hang 방지)
   *
   * @param {string} accessToken
   * @param {string} fileId
   * @param {string} destPath
   * @param {number} expectedSize
   */
  async downloadFile(accessToken, fileId, destPath, expectedSize = 0) {
    const API_TIMEOUT = 120000;
    const fileName = path.basename(destPath);
    const dlStart = Date.now();

    console.log(`[DRV:DL] ▶ ${fileName} (id=${fileId}, expected=${expectedSize > 0 ? expectedSize + 'B' : '미지정'})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    let buffer;
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (err) {
      clearTimeout(timeoutId);
      const elapsed = ((Date.now() - dlStart) / 1000).toFixed(2);
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (e) { /* ignore */ }
      }
      const msg = err.name === 'AbortError' ? `타임아웃 (${API_TIMEOUT / 1000}초)` : err.message;
      console.error(`[DRV:DL] ❌ ${fileName}: 다운로드 실패 (${elapsed}s): ${msg}`);
      throw new Error(`다운로드 실패 (${fileId}): ${msg}`);
    }

    const bytesReceived = buffer.length;
    const apiElapsed = ((Date.now() - dlStart) / 1000).toFixed(2);

    // Rate limit 감지 (HTML 에러 페이지 또는 8192바이트 응답)
    const RATE_LIMIT_HTML_SIZE = 8192;
    if (bytesReceived > 0) {
      const firstBytes = buffer.slice(0, 20).toString('utf8').trim();
      const isHtmlBody = firstBytes.startsWith('<') || firstBytes.startsWith('<!');

      const sizeNotMatch = expectedSize > 0 && bytesReceived !== expectedSize;
      const is8192Mismatch = bytesReceived === RATE_LIMIT_HTML_SIZE && expectedSize !== RATE_LIMIT_HTML_SIZE && expectedSize > 0;
      const isRateLimitResponse = (isHtmlBody && sizeNotMatch) || is8192Mismatch || (isHtmlBody && expectedSize === 0);

      if (isRateLimitResponse) {
        console.error(`[DRV:DL] ⚠ ${fileName}: Rate limit! 예상 ${expectedSize || '미지정'}B, 수신 ${bytesReceived}B (${apiElapsed}s)`);
        const err = new Error(
          `Drive API rate limit (${fileName}): 예상 ${expectedSize || '미지정'}B, 수신 ${bytesReceived}B`
        );
        err.isRateLimit = true;
        throw err;
      }
    }

    // 크기 검증
    if (expectedSize > 0) {
      if (bytesReceived === 0) {
        console.error(`[DRV:DL] ❌ ${fileName}: 0바이트 수신 (예상 ${expectedSize}B) (${apiElapsed}s)`);
        throw new Error(`다운로드 파일 0바이트 (${fileName}): 원본 ${expectedSize}바이트인데 수신 데이터 없음`);
      }
      if (bytesReceived !== expectedSize) {
        console.error(`[DRV:DL] ❌ ${fileName}: 크기 불일치 (예상 ${expectedSize}B vs 수신 ${bytesReceived}B) (${apiElapsed}s)`);
        throw new Error(
          `파일 크기 불일치 (${fileName}): 예상 ${expectedSize} vs 수신 ${bytesReceived} 바이트`
        );
      }
    }

    // 디스크에 쓰기
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const writeStart = Date.now();
    fs.writeFileSync(destPath, buffer);

    // 디스크 기록 검증
    const localSize = fs.statSync(destPath).size;
    if (localSize !== bytesReceived) {
      console.error(`[DRV:DL] ❌ ${fileName}: 디스크 기록 불일치 (수신 ${bytesReceived}B vs 디스크 ${localSize}B)`);
      try { fs.unlinkSync(destPath); } catch (e) { /* ignore */ }
      throw new Error(
        `디스크 기록 불일치 (${fileName}): 수신 ${bytesReceived} vs 디스크 ${localSize} 바이트`
      );
    }

    const totalElapsed = ((Date.now() - dlStart) / 1000).toFixed(2);
    const writeElapsed = ((Date.now() - writeStart) / 1000).toFixed(2);
    const speedKBs = bytesReceived > 0 ? ((bytesReceived / 1024) / (parseFloat(totalElapsed) || 0.01)).toFixed(1) : '0';
    console.log(`[DRV:DL] ✓ ${fileName}: ${bytesReceived}B, API ${apiElapsed}s + 디스크 ${writeElapsed}s = 총 ${totalElapsed}s (${speedKBs} KB/s)`);
  }

  /**
   * Drive 백업 삭제
   * @param {string} userId - 사용자 ID
   * @param {string} fileId - Drive 파일 ID
   */
  async deleteBackup(userId, fileId) {
    const accessToken = await this.getValidAccessToken(userId);
    await this._deleteDriveFile(accessToken, fileId);
    console.log(`[DriveService] 백업 삭제: fileId=${fileId}`);
  }

  /**
   * Drive 백업 목록 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise<Array<{id: string, name: string, size: number, createdTime: string}>>}
   */
  async listBackups(userId) {
    const accessToken = await this.getValidAccessToken(userId);
    const settings = await DriveSettings.getByUserId(userId);
    const basePath = this._resolveBasePath(settings);

    try {
      const baseId = await this._resolvePathToFolderId(accessToken, basePath, { throwOnNotFound: false });
      if (!baseId) return [];

      const query = encodeURIComponent(
        `'${baseId}' in parents and name contains 'backup_' and mimeType='application/zip' and trashed=false`
      );
      const fields = encodeURIComponent('files(id,name,size,createdTime,modifiedTime)');

      const response = await this._callDriveApi(
        accessToken,
        `/drive/v3/files?q=${query}&fields=${fields}&orderBy=createdTime%20desc`
      );

      if (response.status !== 200) return [];

      return (response.data.files || []).map(f => ({
        id: f.id,
        name: f.name,
        size: parseInt(f.size || '0', 10),
        createdTime: f.createdTime || f.modifiedTime
      }));
    } catch (error) {
      errorLogger.warning('Drive 백업 목록 조회 실패', error, {
        source: 'service.driveService.listBackups',
        userId
      });
      throw error;
    }
  }

  // =====================================================
  // 마인드맵 관련 (원본소스 동등 구현)
  // =====================================================

  /**
   * Drive 마인드맵 목록 조회
   */
  async listDriveMindmaps(userId) {
    const accessToken = await this.getValidAccessToken(userId);
    const settings = await DriveSettings.getByUserId(userId);
    const basePath = this._resolveBasePath(settings);

    try {
      const parentId = await this._resolvePathToFolderId(accessToken, basePath, { throwOnNotFound: false });
      if (!parentId) return [];

      const query = encodeURIComponent(
        `'${parentId}' in parents and (mimeType='application/vnd.google-apps.folder' or name contains '.zip') and trashed=false`
      );
      const fields = encodeURIComponent('files(id,name,modifiedTime,size,mimeType)');

      const response = await this._callDriveApi(
        accessToken,
        `/drive/v3/files?q=${query}&fields=${fields}&orderBy=name`
      );

      if (response.status !== 200) return [];

      const mindmapMap = new Map();
      for (const f of (response.data.files || [])) {
        const isZip = f.name.endsWith('.zip');
        const name = isZip ? f.name.replace(/\.zip$/, '') : f.name;
        if (name.startsWith('_')) continue;
        const existing = mindmapMap.get(name);
        if (!existing || isZip) {
          mindmapMap.set(name, { id: f.id, name, modifiedTime: f.modifiedTime, isZip });
        }
      }

      return [...mindmapMap.values()].map(f => ({
        id: f.id,
        name: f.name,
        modifiedTime: f.modifiedTime
      }));
    } catch (error) {
      errorLogger.warning('드라이브 마인드맵 목록 조회 실패', error, {
        source: 'service.driveService.listDriveMindmaps',
        userId,
        extra: { basePath }
      });
      throw error;
    }
  }

  /**
   * 드라이브 파일/폴더 삭제
   */
  async deleteFile(userId, fileId) {
    const accessToken = await this.getValidAccessToken(userId);
    await this._deleteDriveFile(accessToken, fileId);
    console.log(`[DriveService] 파일 삭제: fileId=${fileId}`);
  }

  /**
   * 마인드맵 폴더 삭제
   */
  async deleteMindmap(userId, mindmapName) {
    console.log(`[DRV:DEL] ▶ deleteMindmap: ${mindmapName}`);
    const delStart = Date.now();
    const accessToken = await this.getValidAccessToken(userId);
    const settings = await DriveSettings.getByUserId(userId);
    const basePath = this._resolveBasePath(settings);

    const parentId = await this._resolvePathToFolderId(accessToken, basePath);

    const query = encodeURIComponent(
      `(name='${mindmapName}' or name='${mindmapName}.zip') and '${parentId}' in parents and trashed=false`
    );
    const fields = encodeURIComponent('files(id,name,mimeType,size)');

    const response = await this._callDriveApi(
      accessToken,
      `/drive/v3/files?q=${query}&fields=${fields}`
    );

    if (!response.data.files || response.data.files.length === 0) {
      throw new Error(`마인드맵을 찾을 수 없습니다: ${mindmapName}`);
    }

    let deleted = 0;
    for (const file of response.data.files) {
      await this._deleteDriveFile(accessToken, file.id);
      deleted++;
    }

    const delElapsed = ((Date.now() - delStart) / 1000).toFixed(2);
    console.log(`[DRV:DEL] ✓ ${mindmapName}: ${deleted}개 항목 삭제 완료 (${delElapsed}s)`);
    return { success: true, deleted };
  }
}

module.exports = new DriveService();

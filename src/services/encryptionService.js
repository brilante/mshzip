'use strict';

/**
 * 개인정보 암호화 서비스
 * 참고: mymind3 본체의 encryptionService.js와 동일 구현
 *
 * AES-256-GCM 사용 (인증된 암호화)
 * - 사용자 ID를 폴더명용 해시로 변환 (V1: HMAC-SHA256, V2: bcrypt + Base64)
 * - 이메일, OAuth 토큰 등 민감한 개인정보 암호화/복호화
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// 환경변수에서 마스터 키 로드
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

// bcrypt 설정
const BCRYPT_COST = 10;
const FOLDER_NAME_LENGTH = 100; // 고정 100자
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// bcrypt 해시 결과 캐시 (userId → 폴더명)
const _hashCache = new Map();

class EncryptionService {
  /**
   * 마스터 키 검증
   * @returns {Buffer|null} - 키 버퍼 또는 null
   */
  static validateKey() {
    if (!ENCRYPTION_KEY) {
      return null;
    }
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }

  /**
   * 데이터 암호화 (AES-256-GCM)
   * @param {string} plainText - 평문
   * @returns {string} - 암호문 (base64, iv:authTag:encrypted)
   */
  static encrypt(plainText) {
    if (!plainText) return plainText;

    const key = this.validateKey();
    if (!key) return plainText;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * 데이터 복호화 (AES-256-GCM)
   * @param {string} encryptedData - 암호문
   * @returns {string} - 평문
   */
  static decrypt(encryptedData) {
    if (!encryptedData) return encryptedData;

    const key = this.validateKey();
    if (!key) return encryptedData;

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) return encryptedData;

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      return encryptedData;
    }
  }

  /**
   * 사용자 ID를 폴더명용 해시로 변환 (단방향) - V1 레거시
   * @param {string} userId - 사용자 ID
   * @returns {string|null} - SHA256 해시 (첫 32자) 또는 null
   */
  static hashUserId(userId) {
    if (!userId) return null;

    const key = this.validateKey();
    if (!key) {
      return Buffer.from(userId).toString('base64').replace(/[/+=]/g, '_');
    }

    const hmac = crypto.createHmac('sha256', key);
    hmac.update(userId);
    return hmac.digest('hex').substring(0, 32);
  }

  /**
   * 사용자 ID를 폴더명용 해시로 변환 V2 (bcrypt + Base64, 100자)
   * @param {string} userId - 사용자 ID
   * @returns {Promise<string|null>} - 100자 고정 길이 해시 또는 null
   */
  static async hashUserIdV2(userId) {
    if (!userId) return null;

    const cacheKey = String(userId);
    if (_hashCache.has(cacheKey)) {
      return _hashCache.get(cacheKey);
    }

    const key = this.validateKey();
    if (!key) {
      const result = this.hashUserId(userId);
      _hashCache.set(cacheKey, result);
      return result;
    }

    try {
      // 1. ENCRYPTION_KEY에서 고정 솔트 생성 (bcrypt 솔트 형식: $2b$10$22자)
      const saltBase = crypto.createHash('sha256')
        .update(key)
        .digest('base64')
        .replace(/[+/=]/g, '')
        .substring(0, 22);
      const salt = `$2b$${String(BCRYPT_COST).padStart(2, '0')}$${saltBase}`;

      // 2. bcrypt 해싱 (60자 결과)
      const bcryptHash = await bcrypt.hash(userId, salt);

      // 3. Base64 URL-safe 인코딩
      const base64 = Buffer.from(bcryptHash)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // 4. 100자로 맞추기
      let result;
      if (base64.length >= FOLDER_NAME_LENGTH) {
        result = base64.substring(0, FOLDER_NAME_LENGTH);
      } else {
        const padding = crypto.createHmac('sha256', key)
          .update(userId + bcryptHash)
          .digest('base64')
          .replace(/[+/=]/g, '');
        result = (base64 + padding).substring(0, FOLDER_NAME_LENGTH);
      }

      _hashCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[EncryptionService] hashUserIdV2 에러:', error.message);
      const fallback = this.hashUserId(userId);
      _hashCache.set(cacheKey, fallback);
      return fallback;
    }
  }

  /**
   * 사용자 ID를 폴더명용 해시로 변환 V2 동기 버전 (bcrypt + Base64, 100자)
   * @param {string} userId - 사용자 ID
   * @returns {string|null} - 100자 고정 길이 해시 또는 null
   */
  static hashUserIdV2Sync(userId) {
    if (!userId) return null;

    const cacheKey = String(userId);
    if (_hashCache.has(cacheKey)) {
      return _hashCache.get(cacheKey);
    }

    const key = this.validateKey();
    if (!key) {
      const result = this.hashUserId(userId);
      _hashCache.set(cacheKey, result);
      return result;
    }

    try {
      // 1. ENCRYPTION_KEY에서 고정 솔트 생성
      const saltBase = crypto.createHash('sha256')
        .update(key)
        .digest('base64')
        .replace(/[+/=]/g, '')
        .substring(0, 22);
      const salt = `$2b$${String(BCRYPT_COST).padStart(2, '0')}$${saltBase}`;

      // 2. bcrypt 동기 해싱
      const bcryptHash = bcrypt.hashSync(userId, salt);

      // 3. Base64 URL-safe 인코딩
      const base64 = Buffer.from(bcryptHash)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // 4. 100자로 맞추기
      let result;
      if (base64.length >= FOLDER_NAME_LENGTH) {
        result = base64.substring(0, FOLDER_NAME_LENGTH);
      } else {
        const padding = crypto.createHmac('sha256', key)
          .update(userId + bcryptHash)
          .digest('base64')
          .replace(/[+/=]/g, '');
        result = (base64 + padding).substring(0, FOLDER_NAME_LENGTH);
      }

      _hashCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[EncryptionService] hashUserIdV2Sync 에러:', error.message);
      const fallback = this.hashUserId(userId);
      _hashCache.set(cacheKey, fallback);
      return fallback;
    }
  }

  /**
   * 폴더명이 V2 형식(100자)인지 확인
   * @param {string} folderName - 폴더명
   * @returns {boolean}
   */
  static isV2Format(folderName) {
    if (!folderName) return false;
    return folderName.length === FOLDER_NAME_LENGTH &&
           /^[A-Za-z0-9_-]+$/.test(folderName);
  }

  /**
   * 검색 가능한 해시 생성 (이메일 검색용)
   * @param {string} email - 이메일
   * @returns {string|null} - 검색용 해시 또는 null
   */
  static searchableHash(email) {
    if (!email) return null;
    const key = this.validateKey();
    if (!key) return null;
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(email.toLowerCase().trim());
    return hmac.digest('hex');
  }

  /**
   * 캐시 초기화
   */
  static clearCache() {
    _hashCache.clear();
  }
}

module.exports = EncryptionService;

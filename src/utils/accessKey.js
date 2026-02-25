'use strict';

/**
 * Access Key 유틸리티
 * Claude Code Agent Skills용 API 키 생성/검증
 *
 * @description
 * - 키 형식: mym3_ak_<base64url_encoded_encrypted_payload>
 * - 암호화: AES-256-GCM
 * - 환경 변수: ACCESS_KEY_SECRET (32바이트 hex)
 *
 * @created 2026-01-27
 */

const crypto = require('crypto');

// 상수
const KEY_PREFIX = 'mym3_ak_';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Access Key 전용 암호화 키 가져오기
 * ENCRYPTION_KEY가 없으면 폴백으로 기본 키 생성 (개발 환경용)
 */
function getAccessKeySecret() {
  let key = process.env.ACCESS_KEY_SECRET;

  // ACCESS_KEY_SECRET이 없으면 ENCRYPTION_KEY 사용
  if (!key) {
    key = process.env.ENCRYPTION_KEY;
  }

  // 둘 다 없으면 기본 키 생성 (개발 환경용, 프로덕션에서는 반드시 설정 필요)
  if (!key) {
    console.warn('[AccessKey] ACCESS_KEY_SECRET이 설정되지 않았습니다. 기본 키를 사용합니다.');
    // 고정된 개발용 키 (프로덕션에서는 사용 금지)
    key = 'a'.repeat(64); // 32바이트 = 64자 hex
  }

  const keyBuffer = Buffer.from(key, 'hex');

  if (keyBuffer.length !== 32) {
    throw new Error('ACCESS_KEY_SECRET은 32바이트(64자 hex)여야 합니다.');
  }

  return keyBuffer;
}

/**
 * Payload 암호화
 * @param {Object} payload - 암호화할 데이터
 * @returns {string} - base64url 인코딩된 암호문
 */
function encryptPayload(payload) {
  const key = getAccessKeySecret();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  const plaintext = JSON.stringify(payload);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // IV + authTag + encrypted 를 결합
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // base64url 인코딩
  return combined.toString('base64url');
}

/**
 * Payload 복호화
 * @param {string} encryptedBase64 - base64url 인코딩된 암호문
 * @returns {Object|null} - 복호화된 payload 또는 null
 */
function decryptPayload(encryptedBase64) {
  try {
    const key = getAccessKeySecret();
    const combined = Buffer.from(encryptedBase64, 'base64url');

    // IV, authTag, encrypted 분리
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('[AccessKey] 복호화 실패:', error.message);
    return null;
  }
}

/**
 * Access Key 생성
 *
 * @param {Object} options - 키 생성 옵션
 * @param {number} options.userId - 사용자 ID
 * @param {string} options.mindmapId - 마인드맵 ID (폴더명)
 * @param {string} options.permission - 권한 ('read' | 'readwrite')
 * @param {Date|null} options.expiresAt - 만료일 (null = 무기한)
 * @returns {{ key: string, keyId: string, keyHash: string, keyPrefix: string }}
 */
function generateAccessKey(options) {
  const { userId, mindmapId, permission, expiresAt } = options;

  // 랜덤 식별자 (DB 조회용)
  const keyId = crypto.randomBytes(8).toString('hex');

  // Payload 구성
  const payload = {
    u: userId,                                    // user_id
    m: mindmapId,                                 // mindmap_id
    p: permission === 'readwrite' ? 'rw' : 'r',   // permission
    e: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null, // expires_at (unix timestamp)
    k: keyId,                                     // key_id (DB lookup)
    c: Math.floor(Date.now() / 1000)              // created_at
  };

  // 암호화
  const encryptedPayload = encryptPayload(payload);

  // 전체 키
  const fullKey = KEY_PREFIX + encryptedPayload;

  // 해시 (DB 저장용)
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

  // 프리픽스 (표시용)
  const keyPrefix = fullKey.substring(0, 16);

  return {
    key: fullKey,
    keyId,
    keyHash,
    keyPrefix
  };
}

/**
 * Access Key 검증 및 파싱
 *
 * @param {string} accessKey - 전체 Access Key
 * @returns {{ valid: boolean, payload: Object|null, error: string|null }}
 */
function validateAccessKey(accessKey) {
  // 형식 검사
  if (!accessKey || typeof accessKey !== 'string') {
    return { valid: false, payload: null, error: 'Access Key가 제공되지 않았습니다.' };
  }

  if (!accessKey.startsWith(KEY_PREFIX)) {
    return { valid: false, payload: null, error: '잘못된 Access Key 형식입니다.' };
  }

  // Payload 추출 및 복호화
  const encryptedPayload = accessKey.substring(KEY_PREFIX.length);
  const payload = decryptPayload(encryptedPayload);

  if (!payload) {
    return { valid: false, payload: null, error: 'Access Key 복호화에 실패했습니다.' };
  }

  // 만료 검사
  if (payload.e !== null) {
    const now = Math.floor(Date.now() / 1000);
    if (payload.e < now) {
      return { valid: false, payload, error: 'Access Key가 만료되었습니다.' };
    }
  }

  // 필수 필드 검사
  if (!payload.u || !payload.m || !payload.p || !payload.k) {
    return { valid: false, payload: null, error: 'Access Key 데이터가 불완전합니다.' };
  }

  return {
    valid: true,
    payload: {
      userId: payload.u,
      mindmapId: payload.m,
      permission: payload.p === 'rw' ? 'readwrite' : 'read',
      expiresAt: payload.e ? new Date(payload.e * 1000) : null,
      keyId: payload.k,
      createdAt: payload.c ? new Date(payload.c * 1000) : null
    },
    error: null
  };
}

/**
 * Access Key 해시 생성 (DB 저장/조회용)
 *
 * @param {string} accessKey - 전체 Access Key
 * @returns {string} - SHA-256 해시
 */
function hashAccessKey(accessKey) {
  return crypto.createHash('sha256').update(accessKey).digest('hex');
}

/**
 * IP 화이트리스트 검사
 *
 * @param {string} clientIp - 클라이언트 IP
 * @param {string[]} whitelist - 허용 IP 목록
 * @returns {boolean}
 */
function checkIpWhitelist(clientIp, whitelist) {
  if (!whitelist || whitelist.length === 0) {
    return true; // 화이트리스트 없으면 통과
  }

  for (const pattern of whitelist) {
    if (matchIpPattern(clientIp, pattern.trim())) {
      return true;
    }
  }

  return false;
}

/**
 * IP 패턴 매칭
 *
 * @param {string} ip - 클라이언트 IP
 * @param {string} pattern - 허용 패턴 (단일 IP, 와일드카드, CIDR)
 * @returns {boolean}
 */
function matchIpPattern(ip, pattern) {
  // 정확히 일치
  if (ip === pattern) {
    return true;
  }

  // 와일드카드 (192.168.1.*)
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$');
    return regex.test(ip);
  }

  // CIDR (192.168.1.0/24)
  if (pattern.includes('/')) {
    return matchCidr(ip, pattern);
  }

  return false;
}

/**
 * CIDR 범위 매칭
 *
 * @param {string} ip - 클라이언트 IP
 * @param {string} cidr - CIDR 표기 (예: 192.168.1.0/24)
 * @returns {boolean}
 */
function matchCidr(ip, cidr) {
  try {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(range);

    if (ipNum === null || rangeNum === null) {
      return false;
    }

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

/**
 * IPv4를 숫자로 변환
 *
 * @param {string} ip - IPv4 주소
 * @returns {number|null}
 */
function ipToNumber(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }

  let num = 0;
  for (const part of parts) {
    const n = parseInt(part);
    if (isNaN(n) || n < 0 || n > 255) {
      return null;
    }
    num = (num << 8) + n;
  }

  return num >>> 0; // unsigned 32-bit
}

module.exports = {
  generateAccessKey,
  validateAccessKey,
  hashAccessKey,
  checkIpWhitelist,
  KEY_PREFIX
};

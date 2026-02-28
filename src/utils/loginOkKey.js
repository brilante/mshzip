'use strict';

/**
 * LOGIN_OK_ACCESSKEY 유틸리티
 *
 * 만료 시각을 토큰 내부에 AES-256-GCM으로 암호화하여 저장합니다.
 * 외부에서 만료 시각을 별도로 보관하거나 조작할 수 없습니다.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  토큰 구조                                                   │
 * │  lok_<base64url( IV[12] | AuthTag[16] | Encrypted JSON )>   │
 * │                                                             │
 * │  암호화된 JSON payload:                                      │
 * │  { u: username, e: expiresAt_unix_sec, n: random_nonce }    │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @usage
 *   const { generateLoginOkToken, validateLoginOkToken } = require('./loginOkKey');
 *
 *   // 생성 (로그인 시)
 *   const { token, expiresAt } = generateLoginOkToken(username);
 *   process.env.LOGIN_OK_ACCESSKEY = token;
 *
 *   // 검증 (API 인증 시)
 *   const result = validateLoginOkToken(process.env.LOGIN_OK_ACCESSKEY, incomingToken);
 *   if (!result.valid) throw new Error(result.reason);
 *   console.log(result.payload.username, result.remainingMs);
 *
 * @created 2026-02-26
 */

const crypto = require('crypto');

// ── 상수 ──────────────────────────────────────────────────────

const TOKEN_PREFIX = 'lok_';
const ALGORITHM    = 'aes-256-gcm';
const IV_LENGTH    = 12;
const TAG_LENGTH   = 16;
const TTL_MS       = 24 * 60 * 60 * 1000; // 24시간

// ── 암호화 키 ─────────────────────────────────────────────────

/**
 * ENCRYPTION_KEY 환경변수에서 32바이트 키 반환
 * @returns {Buffer}
 */
function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('[LoginOkKey] ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.');
  }
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) {
    throw new Error('[LoginOkKey] ENCRYPTION_KEY는 64자 hex(32바이트)여야 합니다.');
  }
  return buf;
}

// ── 내부: 암호화 / 복호화 ─────────────────────────────────────

/**
 * JSON payload → AES-256-GCM 암호화 → base64url 문자열
 * @param {object} payload
 * @returns {string}
 */
function _encrypt(payload) {
  const key = getKey();
  const iv  = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const plain  = JSON.stringify(payload);

  const enc  = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();

  // [ IV(12) | AuthTag(16) | Ciphertext ]
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

/**
 * base64url 문자열 → AES-256-GCM 복호화 → JSON payload
 * 실패 시 null 반환
 * @param {string} b64
 * @returns {object|null}
 */
function _decrypt(b64) {
  try {
    const key  = getKey();
    const buf  = Buffer.from(b64, 'base64url');

    const iv      = buf.subarray(0, IV_LENGTH);
    const tag     = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const enc     = buf.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    return JSON.parse(plain);
  } catch {
    return null;
  }
}

// ── 공개 API ──────────────────────────────────────────────────

/**
 * LOGIN_OK 토큰 생성
 *
 * @param {string} username
 * @returns {{ token: string, expiresAt: Date }}
 *
 * @example
 *   const { token, expiresAt } = generateLoginOkToken(username);
 *   // token = "lok_AAAA...base64url..."
 */
function generateLoginOkToken(username) {
  const expiresAt = new Date(Date.now() + TTL_MS);

  const payload = {
    u: username,                                  // 사용자명
    e: Math.floor(expiresAt.getTime() / 1000),   // 만료 Unix 초
    n: crypto.randomBytes(8).toString('hex')      // 매 로그인마다 다른 토큰 보장용 nonce
  };

  const token = TOKEN_PREFIX + _encrypt(payload);
  return { token, expiresAt };
}

/**
 * LOGIN_OK 토큰 검증
 *
 * 토큰 자체를 복호화하여 만료 여부를 확인합니다.
 * 외부 파일이나 별도 환경변수 없이 토큰 하나로 완결됩니다.
 *
 * @param {string} storedToken  - .env에 저장된 토큰 (process.env.LOGIN_OK_ACCESSKEY)
 * @param {string} [incomingToken] - 클라이언트가 보낸 토큰 (제공 시 일치 여부도 확인)
 * @returns {{
 *   valid: boolean,
 *   reason: string|null,
 *   payload: { username: string, expiresAt: Date }|null,
 *   remainingMs: number
 * }}
 */
function validateLoginOkToken(storedToken, incomingToken) {
  // ── 저장된 토큰 존재 확인 ──
  if (!storedToken) {
    return { valid: false, reason: 'LOGIN_OK_ACCESSKEY가 설정되지 않았습니다. 로그인이 필요합니다.', payload: null, remainingMs: 0 };
  }

  // ── 형식 확인 ──
  if (!storedToken.startsWith(TOKEN_PREFIX)) {
    return { valid: false, reason: `LOGIN_OK_ACCESSKEY 형식이 올바르지 않습니다. (접두사: ${TOKEN_PREFIX})`, payload: null, remainingMs: 0 };
  }

  // ── 클라이언트 토큰 일치 여부 (제공된 경우) ──
  if (incomingToken !== undefined && incomingToken !== storedToken) {
    return { valid: false, reason: 'LOGIN_OK_ACCESSKEY가 일치하지 않습니다.', payload: null, remainingMs: 0 };
  }

  // ── 복호화 ──
  const raw = _decrypt(storedToken.slice(TOKEN_PREFIX.length));
  if (!raw) {
    return { valid: false, reason: '토큰 복호화에 실패했습니다. (변조 또는 서버 키 불일치)', payload: null, remainingMs: 0 };
  }

  // ── 필수 필드 확인 ──
  if (!raw.u || !raw.e) {
    return { valid: false, reason: '토큰 내부 데이터가 불완전합니다. 다시 로그인하세요.', payload: null, remainingMs: 0 };
  }

  // ── 만료 검사 ──
  const expiresAt   = new Date(raw.e * 1000);
  const remainingMs = expiresAt.getTime() - Date.now();

  if (remainingMs <= 0) {
    return {
      valid:     false,
      reason:    `LOGIN_OK_ACCESSKEY가 만료되었습니다. (만료: ${expiresAt.toISOString()}) 다시 로그인하세요.`,
      payload:   { username: raw.u, expiresAt },
      remainingMs: 0
    };
  }

  return {
    valid:       true,
    reason:      null,
    payload:     { username: raw.u, expiresAt },
    remainingMs
  };
}

/**
 * 환경변수 LOGIN_OK_ACCESSKEY 유효 여부 (단순 boolean)
 * @returns {boolean}
 */
function isLoginOkKeyValid() {
  return validateLoginOkToken(process.env.LOGIN_OK_ACCESSKEY).valid;
}

/**
 * 환경변수 LOGIN_OK_ACCESSKEY 남은 유효 시간 (초)
 * @returns {number}
 */
function getLoginOkKeyRemainingSeconds() {
  const { remainingMs } = validateLoginOkToken(process.env.LOGIN_OK_ACCESSKEY);
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Express 미들웨어
 * X-Access-Key-Hash 헤더의 토큰이 LOGIN_OK_ACCESSKEY와 일치하고 유효한지 검사
 *
 * @example
 *   router.get('/secret', requireLoginOkKey, handler);
 */
function requireLoginOkKey(req, res, next) {
  const incoming = req.headers['x-access-key-hash'];

  if (!incoming) {
    return res.status(401).json({
      success: false,
      error:   'X-Access-Key-Hash 헤더가 필요합니다.',
      code:    'MISSING_KEY'
    });
  }

  const result = validateLoginOkToken(process.env.LOGIN_OK_ACCESSKEY, incoming);

  if (!result.valid) {
    return res.status(401).json({
      success: false,
      error:   result.reason,
      code:    'LOGIN_OK_KEY_INVALID'
    });
  }

  res.setHeader('X-Login-Key-Remaining-Seconds', Math.floor(result.remainingMs / 1000));
  next();
}

module.exports = {
  generateLoginOkToken,
  validateLoginOkToken,
  isLoginOkKeyValid,
  getLoginOkKeyRemainingSeconds,
  requireLoginOkKey,
  TOKEN_PREFIX
};

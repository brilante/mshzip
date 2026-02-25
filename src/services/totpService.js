/**
 * TOTP 2차 인증 서비스
 * Google Authenticator 호환 TOTP (RFC 6238) 구현
 *
 * @description
 * - TOTP Secret 생성 및 QR 코드 생성
 * - OTP 코드 검증 (30초 윈도우)
 * - 백업 코드 생성 및 검증
 * - Secret 암호화 저장 (AES-256-GCM)
 *
 * @updated 2026-01-19 - ENCRYPTION_KEY로 통합
 */
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');

// dotenv 로드
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// 환경변수에서 암호화 키 로드 (ENCRYPTION_KEY로 통합)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM 권장 IV 길이
const AUTH_TAG_LENGTH = 16;

class TOTPService {
  constructor() {
    this.issuer = 'MyMind3';
    this.totpWindow = 1; // 30초 전후 허용 (총 90초)
    this.backupCodeCount = 8;
  }

  /**
   * 암호화 키 검증
   * @returns {Buffer|null} - 키 버퍼 또는 null
   */
  validateKey() {
    if (!ENCRYPTION_KEY) {
      console.warn('[TOTPService] ENCRYPTION_KEY가 설정되지 않았습니다.');
      return null;
    }
    if (ENCRYPTION_KEY.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }

  /**
   * TOTP 기능 활성화 여부 확인
   * @returns {boolean}
   */
  isEnabled() {
    return !!ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64;
  }

  /**
   * TOTP Secret 생성
   * @param {string} email - 사용자 이메일 (또는 사용자명)
   * @returns {Promise<Object>} { secret, otpauthUrl, qrCodeDataUrl }
   */
  async generateSecret(email) {
    // Secret 생성 (base32 인코딩, 20바이트 = 160비트)
    const secret = speakeasy.generateSecret({
      name: `${this.issuer}:${email}`,
      issuer: this.issuer,
      length: 20
    });

    // QR 코드 이미지 생성 (Data URL - base64 PNG)
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return {
      secret: secret.base32,           // DB에 암호화하여 저장
      otpauthUrl: secret.otpauth_url,  // 수동 입력용 URL
      qrCodeDataUrl                    // QR 코드 이미지 (base64)
    };
  }

  /**
   * TOTP 코드 검증
   * @param {string} secret - base32 인코딩된 secret
   * @param {string} token - 사용자 입력 6자리 코드
   * @returns {boolean} 검증 결과
   */
  verifyToken(secret, token) {
    if (!secret || !token) return false;

    // 숫자만 추출 (공백, 하이픈 제거)
    const cleanToken = token.replace(/\D/g, '');

    if (cleanToken.length !== 6) {
      return false;
    }

    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: cleanToken,
        window: this.totpWindow // 30초 전후 허용
      });
    } catch (error) {
      console.error('[TOTPService] 토큰 검증 에러:', error.message);
      return false;
    }
  }

  /**
   * Secret 암호화 (DB 저장용)
   * @param {string} secret - base32 인코딩된 secret
   * @returns {string} 암호화된 문자열
   */
  encryptSecret(secret) {
    const key = this.validateKey();
    if (!key) {
      console.warn('[TOTPService] 키 미설정 - 평문으로 저장됩니다');
      return secret;
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // iv + authTag + encrypted 합성 (base64 인코딩)
    return Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]).toString('base64');
  }

  /**
   * Secret 복호화 (검증용)
   * @param {string} encryptedSecret - 암호화된 secret
   * @returns {string} 복호화된 secret (base32)
   */
  decryptSecret(encryptedSecret) {
    const key = this.validateKey();
    if (!key) {
      // 키가 없으면 원본 반환 (개발 환경)
      return encryptedSecret;
    }

    try {
      const data = Buffer.from(encryptedSecret, 'base64');

      const iv = data.subarray(0, IV_LENGTH);
      const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('[TOTPService] 복호화 실패:', error.message);
      // 복호화 실패 시 원본 반환 (평문일 수 있음)
      return encryptedSecret;
    }
  }

  /**
   * 백업 코드 생성
   * @param {number} count - 생성할 코드 개수 (기본 8개)
   * @returns {string[]} 백업 코드 배열 (형식: XXXX-XXXX-XXXX)
   */
  generateBackupCodes(count = this.backupCodeCount) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // 형식: XXXX-XXXX-XXXX (영문대문자 + 숫자, 총 12자)
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}-${part3}`);
    }
    return codes;
  }

  /**
   * 백업 코드 해시 (DB 저장용)
   * @param {string} code - 백업 코드
   * @returns {string} SHA-256 해시
   */
  hashBackupCode(code) {
    // 하이픈 제거 후 대문자로 정규화
    const normalized = code.replace(/-/g, '').toUpperCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * 백업 코드 검증
   * @param {string} inputCode - 사용자 입력 코드
   * @param {string} storedHash - 저장된 해시
   * @returns {boolean} 일치 여부
   */
  verifyBackupCode(inputCode, storedHash) {
    const inputHash = this.hashBackupCode(inputCode);
    return crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  }

  /**
   * Secret이 암호화된 형식인지 확인
   * @param {string} data - 확인할 데이터
   * @returns {boolean}
   */
  isEncrypted(data) {
    if (!data || typeof data !== 'string') return false;

    try {
      const decoded = Buffer.from(data, 'base64');
      // 최소 길이: IV(12) + AuthTag(16) + 암호화된 데이터
      return decoded.length > IV_LENGTH + AUTH_TAG_LENGTH;
    } catch {
      return false;
    }
  }

  /**
   * 수동 입력용 Secret 포맷팅 (4자리씩 공백 구분)
   * @param {string} secret - base32 secret
   * @returns {string} 포맷된 secret (예: "JBSW Y3DP EHPK 3PXP")
   */
  formatSecretForDisplay(secret) {
    if (!secret) return '';
    return secret.match(/.{1,4}/g).join(' ');
  }
}

module.exports = new TOTPService();

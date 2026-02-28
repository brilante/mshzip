/**
 * AdminUser DB 모델
 * 관리자 사용자 인증 및 권한 관리
 *
 * 주요 기능:
 * - Argon2id 비밀번호 해싱 (최고 수준 암호화)
 * - bcrypt 레거시 지원 및 자동 마이그레이션
 * - 관리자 인증 및 검증
 * - 로그인 실패 횟수 관리
 * - 계정 잠금 (5회 실패 시 5분 잠금)
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const argon2 = require('argon2');
const fs = require('fs');
const path = require('path');
const db = require('..');

// bcrypt 설정: cost factor 12 (레거시 지원용)
const BCRYPT_ROUNDS = 12;

/**
 * Argon2id 설정 (OWASP 권장 + 강화)
 * - 최고 수준의 보안을 위한 설정
 * - Memory: 64MB (65536 KiB) - GPU 공격 방어
 * - Time: 4 iterations - 추가 연산 비용
 * - Parallelism: 4 threads - 병렬 처리
 * - Type: Argon2id - 사이드 채널 공격 및 GPU 공격 모두 방어
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,         // Argon2id (권장)
  memoryCost: 65536,              // 64 MB
  timeCost: 4,                    // 4 iterations
  parallelism: 4,                 // 4 threads
  hashLength: 64,                 // 64 bytes (512 bits)
  saltLength: 32                  // 32 bytes salt
};

// 환경변수 기반 비밀키 검증 (서버 저장 비교 텍스트)
// 클라이언트의 G:\.localkey 파일 값과 서버의 ADMIN_SECRET_TEXT 환경변수를 비교

const AdminUser = {
  /**
   * admin_users 테이블 생성 (없으면 생성)
   * 마이그레이션 013_admin_users_postgres.sql 기반
   */
  async initTable() {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          admin_password TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_verified_at TIMESTAMP,
          failed_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP
        )
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active)');
      console.log('[AdminUser] 테이블 초기화 완료');
    } catch (error) {
      console.error('[AdminUser] 테이블 초기화 실패:', error.message);
    }
  },

  /**
   * 비밀번호를 Argon2id로 해시 (최고 수준 암호화)
   * @param {string} password - 평문 비밀번호
   * @returns {Promise<string>} Argon2id 해시 문자열
   */
  async hashPassword(password) {
    try {
      const hash = await argon2.hash(password, ARGON2_OPTIONS);
      console.log('[AdminUser] Argon2id 해시 생성 완료');
      return hash;
    } catch (error) {
      console.error('[AdminUser] Argon2id 해시 생성 실패:', error.message);
      throw error;
    }
  },

  /**
   * 비밀번호를 bcrypt로 해시 (레거시 지원용)
   * @param {string} password - 평문 비밀번호
   * @returns {Promise<string>} bcrypt 해시 문자열
   */
  async hashPasswordBcrypt(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },

  /**
   * 레거시 SHA256 해시 (마이그레이션용)
   * @param {string} password - 평문 비밀번호
   * @returns {string} SHA256 해시 문자열
   */
  hashPasswordLegacy(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  },

  /**
   * Argon2 해시 여부 확인
   * @param {string} hash - 저장된 해시
   * @returns {boolean} Argon2 해시 여부
   */
  isArgon2Hash(hash) {
    return hash && hash.startsWith('$argon2');
  },

  /**
   * bcrypt 해시 여부 확인
   * @param {string} hash - 저장된 해시
   * @returns {boolean} bcrypt 해시 여부
   */
  isBcryptHash(hash) {
    return hash && hash.startsWith('$2');
  },

  /**
   * user_id로 관리자 조회
   * @param {string} userId - 사용자 ID
   * @returns {Object|null} 관리자 정보
   */
  async findByUserId(userId) {
    try {
      return await db.get('SELECT * FROM admin_users WHERE user_id = ?', [userId]);
    } catch (error) {
      console.error('[AdminUser] findByUserId error:', error.message);
      return null;
    }
  },

  /**
   * 관리자 여부 확인 (활성화 상태 포함)
   * @param {string} userId - 사용자 ID
   * @returns {boolean} 관리자 여부
   */
  async isAdmin(userId) {
    const admin = await this.findByUserId(userId);
    return admin && admin.is_active === 1;
  },

  /**
   * 관리자 비밀번호 검증 (Argon2id + bcrypt + SHA256 지원)
   * - Argon2id: 최고 수준 암호화 (권장)
   * - bcrypt: 레거시 지원 (자동 마이그레이션)
   * - SHA256: 레거시 지원 (자동 마이그레이션)
   *
   * @param {string} userId - 사용자 ID
   * @param {string} password - 평문 비밀번호
   * @returns {Object} { success: boolean, message?: string, remainingAttempts?: number, lockedUntil?: string }
   */
  async verifyPassword(userId, password) {
    const admin = await this.findByUserId(userId);

    // 관리자가 아닌 경우
    if (!admin) {
      return { success: false, message: '관리자 계정이 아닙니다.' };
    }

    // 비활성화된 경우
    if (admin.is_active !== 1) {
      return { success: false, message: '비활성화된 관리자 계정입니다.' };
    }

    // 잠금 상태 확인
    const lockStatus = await this.isLocked(userId);
    if (lockStatus.locked) {
      return {
        success: false,
        message: '계정이 잠겼습니다. 잠시 후 다시 시도하세요.',
        lockedUntil: lockStatus.lockedUntil
      };
    }

    // 비밀번호 검증 (Argon2id > bcrypt > SHA256 순서로 확인)
    let isValid = false;
    let needsMigration = false;
    let hashType = 'unknown';

    try {
      if (this.isArgon2Hash(admin.admin_password)) {
        // Argon2 검증 (최고 수준 암호화)
        hashType = 'argon2';
        isValid = await argon2.verify(admin.admin_password, password);
        console.log(`[AdminUser] Argon2id 비밀번호 검증: ${isValid ? '성공' : '실패'}`);
      } else if (this.isBcryptHash(admin.admin_password)) {
        // bcrypt 검증 (레거시)
        hashType = 'bcrypt';
        isValid = await bcrypt.compare(password, admin.admin_password);
        needsMigration = isValid; // Argon2로 마이그레이션 필요
        console.log(`[AdminUser] bcrypt 비밀번호 검증: ${isValid ? '성공' : '실패'}`);
      } else {
        // SHA256 검증 (레거시)
        hashType = 'sha256';
        const hashedInput = this.hashPasswordLegacy(password);
        isValid = (admin.admin_password === hashedInput);
        needsMigration = isValid; // Argon2로 마이그레이션 필요
        console.log(`[AdminUser] SHA256 비밀번호 검증: ${isValid ? '성공' : '실패'}`);
      }
    } catch (error) {
      console.error(`[AdminUser] 비밀번호 검증 오류 (${hashType}):`, error.message);
      return { success: false, message: '비밀번호 검증 중 오류가 발생했습니다.' };
    }

    if (isValid) {
      // 레거시 해시에서 Argon2id로 자동 마이그레이션
      if (needsMigration) {
        try {
          await this.updatePassword(userId, password);
          console.log(`[AdminUser] 비밀번호 Argon2id 마이그레이션 완료: ${userId} (${hashType} → Argon2id)`);
        } catch (migrationError) {
          console.error(`[AdminUser] 비밀번호 마이그레이션 실패:`, migrationError.message);
          // 마이그레이션 실패해도 인증은 성공으로 처리
        }
      }
      // 성공: 실패 횟수 초기화 및 인증 시간 업데이트
      await this.resetFailedAttempts(userId);
      await this.updateLastVerified(userId);
      return { success: true };
    } else {
      // 실패: 실패 횟수 증가
      const result = await this.incrementFailedAttempts(userId);
      return {
        success: false,
        message: '비밀번호가 올바르지 않습니다.',
        remainingAttempts: result.remainingAttempts,
        lockedUntil: result.lockedUntil
      };
    }
  },

  /**
   * 계정 잠금 상태 확인
   * @param {string} userId - 사용자 ID
   * @returns {Object} { locked: boolean, lockedUntil?: string }
   */
  async isLocked(userId) {
    const admin = await this.findByUserId(userId);
    if (!admin || !admin.locked_until) {
      return { locked: false };
    }

    const lockedUntil = new Date(admin.locked_until);
    const now = new Date();

    if (lockedUntil > now) {
      return { locked: true, lockedUntil: admin.locked_until };
    }

    // 잠금 시간이 지났으면 잠금 해제
    await this.resetFailedAttempts(userId);
    return { locked: false };
  },

  /**
   * 로그인 실패 횟수 증가 및 잠금 처리
   * @param {string} userId - 사용자 ID
   * @returns {Object} { failedAttempts: number, remainingAttempts: number, lockedUntil?: string }
   */
  async incrementFailedAttempts(userId) {
    const admin = await this.findByUserId(userId);
    const newAttempts = (admin?.failed_attempts || 0) + 1;
    const maxAttempts = 5;
    const lockDurationMs = 5 * 60 * 1000; // 5분

    try {
      if (newAttempts >= maxAttempts) {
        const lockUntil = new Date(Date.now() + lockDurationMs).toISOString();
        await db.run(`
          UPDATE admin_users
          SET failed_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [newAttempts, lockUntil, userId]);
        return { failedAttempts: newAttempts, remainingAttempts: 0, lockedUntil: lockUntil };
      } else {
        await db.run(`
          UPDATE admin_users
          SET failed_attempts = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [newAttempts, userId]);
        return { failedAttempts: newAttempts, remainingAttempts: maxAttempts - newAttempts };
      }
    } catch (error) {
      console.error('[AdminUser] incrementFailedAttempts error:', error.message);
      return { failedAttempts: newAttempts, remainingAttempts: maxAttempts - newAttempts };
    }
  },

  /**
   * 실패 횟수 초기화 및 잠금 해제
   * @param {string} userId - 사용자 ID
   */
  async resetFailedAttempts(userId) {
    try {
      await db.run(`
        UPDATE admin_users
        SET failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [userId]);
    } catch (error) {
      console.error('[AdminUser] resetFailedAttempts error:', error.message);
    }
  },

  /**
   * 마지막 인증 시간 업데이트
   * @param {string} userId - 사용자 ID
   */
  async updateLastVerified(userId) {
    try {
      await db.run(`
        UPDATE admin_users
        SET last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [userId]);
    } catch (error) {
      console.error('[AdminUser] updateLastVerified error:', error.message);
    }
  },

  /**
   * 새 관리자 추가
   * @param {string} userId - 사용자 ID
   * @param {string} password - 평문 비밀번호
   * @returns {Object} 생성된 관리자 정보
   */
  async create(userId, password) {
    const hashedPassword = await this.hashPassword(password);

    try {
      await db.run(`
        INSERT INTO admin_users (user_id, admin_password)
        VALUES (?, ?)
      `, [userId, hashedPassword]);
      return await this.findByUserId(userId);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed') || err.message.includes('duplicate key') || err.message.includes('unique')) {
        throw new Error('이미 존재하는 관리자 계정입니다.');
      }
      throw err;
    }
  },

  /**
   * 관리자 비밀번호 변경
   * @param {string} userId - 사용자 ID
   * @param {string} newPassword - 새 평문 비밀번호
   * @returns {boolean} 성공 여부
   */
  async updatePassword(userId, newPassword) {
    const hashedPassword = await this.hashPassword(newPassword);

    try {
      const result = await db.run(`
        UPDATE admin_users
        SET admin_password = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [hashedPassword, userId]);
      return result.changes > 0;
    } catch (error) {
      console.error('[AdminUser] updatePassword error:', error.message);
      return false;
    }
  },

  /**
   * 관리자 활성화/비활성화
   * @param {string} userId - 사용자 ID
   * @param {boolean} isActive - 활성화 여부
   * @returns {boolean} 성공 여부
   */
  async setActive(userId, isActive) {
    try {
      const result = await db.run(`
        UPDATE admin_users
        SET is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [isActive ? 1 : 0, userId]);
      return result.changes > 0;
    } catch (error) {
      console.error('[AdminUser] setActive error:', error.message);
      return false;
    }
  },

  /**
   * 관리자 삭제
   * @param {string} userId - 사용자 ID
   * @returns {boolean} 성공 여부
   */
  async delete(userId) {
    try {
      const result = await db.run('DELETE FROM admin_users WHERE user_id = ?', [userId]);
      return result.changes > 0;
    } catch (error) {
      console.error('[AdminUser] delete error:', error.message);
      return false;
    }
  },

  /**
   * 모든 활성 관리자 목록 조회
   * @returns {Array} 관리자 목록
   */
  async findAllActive() {
    try {
      return await db.all('SELECT * FROM admin_users WHERE is_active = 1');
    } catch (error) {
      console.error('[AdminUser] findAllActive error:', error.message);
      return [];
    }
  },

  /**
   * 관리자 인증 상태 확인 (세션용)
   * @param {string} userId - 사용자 ID
   * @param {Date|string} verifiedAt - 인증 시간 (ISO 문자열 또는 Date)
   * @param {number} expiryMinutes - 만료 시간 (분, 기본값: 60)
   * @returns {boolean} 인증 유효 여부
   */
  isVerificationValid(userId, verifiedAt, expiryMinutes = 60) {
    if (!verifiedAt) return false;

    let verifiedDate;
    if (typeof verifiedAt === 'string') {
      if (!verifiedAt.includes('T') && !verifiedAt.includes('Z')) {
        verifiedDate = new Date(verifiedAt.replace(' ', 'T') + 'Z');
      } else {
        verifiedDate = new Date(verifiedAt);
      }
    } else {
      verifiedDate = verifiedAt;
    }

    const now = new Date();
    const diffMs = now - verifiedDate;
    const diffMinutes = diffMs / (1000 * 60);

    return diffMinutes >= 0 && diffMinutes < expiryMinutes;
  },

  // ===== 로컬 키 파일 기반 2단계 인증 =====
  //
  // 인증 흐름:
  // 1. 클라이언트 PC의 로컬 에이전트(127.0.0.1:19999)가 G:\.localkey 파일 읽기
  // 2. 브라우저가 에이전트에서 비밀키 조회 후 AES-256-GCM으로 암호화
  // 3. 서버로 암호화된 비밀키 전송
  // 4. 서버에서 복호화 후 환경변수(ADMIN_SECRET_TEXT)와 비교

  /**
   * 환경변수에서 관리자 비밀키 비교 텍스트 읽기
   * @returns {string|null} 비밀키 비교 텍스트 또는 null
   */
  getAdminSecretText() {
    const secretText = process.env.ADMIN_SECRET_TEXT;
    if (!secretText || secretText.trim().length === 0) {
      console.warn('[AdminUser] ADMIN_SECRET_TEXT 환경변수가 설정되지 않았습니다.');
      return null;
    }
    return secretText.trim();
  },

  /**
   * 로컬 키 파일 인증 사용 여부 확인
   * ADMIN_SECRET_TEXT 환경변수가 설정되어 있으면 로컬 키 인증 활성화
   * @returns {boolean} 로컬 키 인증 활성화 여부
   */
  isLocalKeyEnabled() {
    const secretText = this.getAdminSecretText();
    const enabled = secretText !== null && secretText.length > 0;
    if (enabled) {
      console.log('[AdminUser] 로컬 키 파일 기반 2단계 인증 활성화');
    }
    return enabled;
  },

  /**
   * 비밀키 검증 (Argon2id + bcrypt 지원)
   *
   * 인증 흐름:
   * 1. 클라이언트 G:\.localkey 파일에는 Argon2id 또는 bcrypt 해시가 저장되어 있음
   * 2. 클라이언트가 해시를 AES 암호화하여 서버로 전송
   * 3. 서버가 AES 복호화하여 해시 획득
   * 4. 서버 환경변수(평문)를 해시와 비교 (argon2.verify 또는 bcrypt.compare)
   *
   * @param {string} decryptedHash - AES 복호화된 해시 (클라이언트 G:\.localkey에서 읽은 값)
   * @returns {Promise<Object>} { success: boolean, message?: string }
   */
  async verifySecretKey(decryptedHash) {
    if (!decryptedHash) {
      return { success: false, message: '비밀키가 전송되지 않았습니다.' };
    }

    const serverSecretText = this.getAdminSecretText();

    // 환경변수가 설정되지 않은 경우 비밀키 검증 건너뛰기
    if (!serverSecretText) {
      console.log('[AdminUser] ADMIN_SECRET_TEXT 환경변수 없음 - 비밀키 검증 건너뜀');
      return { success: true, message: '환경변수 없음 (검증 건너뜀)' };
    }

    try {
      let isMatch = false;

      // Argon2 해시인지 확인
      if (this.isArgon2Hash(decryptedHash)) {
        isMatch = await argon2.verify(decryptedHash, serverSecretText);
        if (isMatch) {
          console.log('[AdminUser] 비밀키 검증 성공 (Argon2id)');
          return { success: true };
        }
      } else if (this.isBcryptHash(decryptedHash)) {
        // bcrypt 해시인 경우 (레거시 지원)
        isMatch = await bcrypt.compare(serverSecretText, decryptedHash);
        if (isMatch) {
          console.log('[AdminUser] 비밀키 검증 성공 (bcrypt - 레거시)');
          return { success: true };
        }
      } else {
        console.log('[AdminUser] 비밀키 검증 실패 - 유효하지 않은 해시 형식');
        return { success: false, message: '유효하지 않은 비밀키 형식입니다.' };
      }

      console.log('[AdminUser] 비밀키 검증 실패 - 해시 불일치');
      return { success: false, message: '비밀키가 올바르지 않습니다.' };
    } catch (error) {
      console.error('[AdminUser] 비밀키 검증 오류:', error.message);
      return { success: false, message: '비밀키 검증 중 오류가 발생했습니다.' };
    }
  },

  /**
   * 비밀키 Argon2id 해시 생성 (최고 수준 암호화)
   * @param {string} secretKey - 비밀키 평문
   * @returns {Promise<string>} Argon2id 해시
   */
  async hashSecretKey(secretKey) {
    try {
      const hash = await argon2.hash(secretKey, ARGON2_OPTIONS);
      console.log('[AdminUser] 비밀키 Argon2id 해시 생성 완료');
      return hash;
    } catch (error) {
      console.error('[AdminUser] 비밀키 해시 생성 실패:', error.message);
      throw error;
    }
  },

  /**
   * 비밀키 bcrypt 해시 생성 (레거시 지원용)
   * @param {string} secretKey - 비밀키 평문
   * @returns {Promise<string>} bcrypt 해시
   */
  async hashSecretKeyBcrypt(secretKey) {
    return bcrypt.hash(secretKey, BCRYPT_ROUNDS);
  }
};

module.exports = AdminUser;

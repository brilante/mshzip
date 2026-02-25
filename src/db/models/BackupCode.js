/**
 * BackupCode DB 모델
 * TOTP 2차 인증 백업 코드 관리
 *
 * 주요 기능:
 * - 백업 코드 생성/저장 (SHA-256 해시)
 * - 백업 코드 검증 (1회 사용)
 * - 코드 사용 처리
 */
const crypto = require('crypto');
const db = require('..');

const BackupCode = {
  /**
   * 테이블 초기화
   */
  async initTable() {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS backup_codes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        code_hash VARCHAR(64) NOT NULL,
        used SMALLINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON backup_codes(user_id)
    `);

    console.log('[BackupCode] 테이블 초기화 완료');
  },

  /**
   * 백업 코드 해시 생성 (SHA-256)
   * @param {string} code - 평문 백업 코드 (XXXX-XXXX-XXXX 형식)
   * @returns {string} SHA-256 해시
   */
  hashCode(code) {
    if (!code) return null;
    /* 하이픈 제거 후 대문자로 정규화 */
    const normalized = code.replace(/-/g, '').toUpperCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  },

  /**
   * 사용자의 모든 백업 코드 저장
   * @param {string} userId - 사용자 ID
   * @param {string[]} codes - 평문 백업 코드 배열
   * @returns {Promise<Object>} 저장 결과
   */
  async saveAll(userId, codes) {
    if (!userId || !codes || !Array.isArray(codes)) {
      return { success: false, error: 'Invalid parameters' };
    }

    /* 기존 코드 삭제 후 새로 저장 */
    await this.deleteAllByUserId(userId);

    const hashedCodes = codes.map(code => ({
      userId,
      codeHash: this.hashCode(code)
    }));

    try {
      for (const { userId: uid, codeHash } of hashedCodes) {
        await db.run(
          `INSERT INTO backup_codes (user_id, code_hash, used, created_at)
           VALUES ($1, $2, 0, CURRENT_TIMESTAMP)`,
          [uid, codeHash]
        );
      }
      console.log(`[BackupCode Model] 사용자 ${userId}의 백업 코드 ${codes.length}개 저장 완료`);
      return { success: true, count: codes.length };
    } catch (error) {
      console.error('[BackupCode Model] saveAll 오류:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 백업 코드 검증 및 사용 처리
   * @param {string} userId - 사용자 ID
   * @param {string} code - 입력된 백업 코드
   * @returns {Promise<Object>} { success: boolean, message?: string }
   */
  async verifyAndUse(userId, code) {
    if (!userId || !code) {
      return { success: false, message: '잘못된 요청입니다.' };
    }

    const codeHash = this.hashCode(code);

    try {
      /* 미사용 코드 찾기 (used = 0) */
      const row = await db.get(
        `SELECT id FROM backup_codes
         WHERE user_id = $1 AND code_hash = $2 AND used = 0`,
        [userId, codeHash]
      );

      if (!row) {
        return { success: false, message: '유효하지 않은 백업 코드입니다.' };
      }

      /* 코드 사용 처리 (used = 1) */
      await db.run(
        `UPDATE backup_codes
         SET used = 1, used_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.id]
      );

      console.log(`[BackupCode Model] 사용자 ${userId}의 백업 코드 사용 처리 완료`);
      return { success: true };
    } catch (error) {
      console.error('[BackupCode Model] verifyAndUse 오류:', error.message);
      return { success: false, message: error.message };
    }
  },

  /**
   * 사용자의 남은 백업 코드 개수 조회
   * @param {string} userId - 사용자 ID
   * @returns {Promise<number>} 미사용 코드 개수 (used = 0)
   */
  async getRemainingCount(userId) {
    if (!userId) return 0;

    try {
      const result = await db.get(
        `SELECT COUNT(*) as count FROM backup_codes
         WHERE user_id = $1 AND used = 0`,
        [userId]
      );
      return parseInt(result?.count, 10) || 0;
    } catch (error) {
      console.error('[BackupCode Model] getRemainingCount 오류:', error.message);
      return 0;
    }
  },

  /**
   * 사용자의 모든 백업 코드 삭제
   * @param {string} userId - 사용자 ID
   * @returns {Promise<Object>} 삭제 결과
   */
  async deleteAllByUserId(userId) {
    if (!userId) return { success: false, error: 'User ID required' };

    try {
      const result = await db.run('DELETE FROM backup_codes WHERE user_id = $1', [userId]);
      return { success: true, changes: result.changes };
    } catch (error) {
      console.error('[BackupCode Model] deleteAllByUserId 오류:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 백업 코드 존재 여부 확인
   * @param {string} userId - 사용자 ID
   * @returns {Promise<boolean>}
   */
  async hasBackupCodes(userId) {
    const count = await this.getRemainingCount(userId);
    return count > 0;
  }
};

module.exports = BackupCode;

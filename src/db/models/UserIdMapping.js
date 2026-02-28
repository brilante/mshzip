'use strict';

/**
 * UserIdMapping DB 모델
 * 사용자 ID와 해시된 폴더명 매핑 관리
 *
 * @description
 * - 사용자 ID → 해시 폴더명 매핑 (V2: bcrypt+Base64 100자)
 * - 레거시 Base64 폴더명 저장 (마이그레이션용)
 * - user_id_mapping 테이블 사용 (028_user_id_mapping_postgres.sql)
 *
 * @reference G:\MyWrok\mymind3\src\db\models\UserIdMapping.js (143줄)
 */
const db = require('..');

const UserIdMapping = {
  /**
   * 테이블 초기화 (마이그레이션용)
   * 이미 028_user_id_mapping_postgres.sql로 생성된 테이블이 있으면 스킵
   */
  async initTable() {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS user_id_mapping (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL UNIQUE,
          user_id_hash VARCHAR(255) NOT NULL,
          legacy_folder VARCHAR(255),
          date_path VARCHAR(30) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // user_id_hash UNIQUE → INDEX 전환 (동일 폴더를 여러 계정이 공유 가능)
      try {
        await db.exec('ALTER TABLE user_id_mapping DROP CONSTRAINT IF EXISTS user_id_mapping_user_id_hash_key');
      } catch (e) {
        // 제약조건 이미 없으면 무시
      }
      await db.exec('CREATE INDEX IF NOT EXISTS idx_user_id_mapping_hash ON user_id_mapping(user_id_hash)');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_user_id_mapping_legacy ON user_id_mapping(legacy_folder)');
      // date_path 컬럼 추가 (기존 테이블 업그레이드)
      try {
        await db.exec('ALTER TABLE user_id_mapping ADD COLUMN IF NOT EXISTS date_path VARCHAR(30) DEFAULT NULL');
      } catch (e) { /* 이미 존재하면 무시 */ }
      return true;
    } catch (error) {
      console.error('[UserIdMapping] initTable 오류:', error.message);
      return false;
    }
  },

  /**
   * 매핑 생성 (중복 시 해시 갱신)
   * @param {string} userId - 사용자 ID
   * @param {string} hash - 해시된 폴더명 (V2: 100자)
   * @param {string} legacyFolder - 레거시 Base64 폴더명
   * @returns {Object|null} 생성된 매핑
   */
  async create(userId, hash, legacyFolder = null, datePath = null) {
    try {
      const result = await db.run(
        `INSERT INTO user_id_mapping (user_id, user_id_hash, legacy_folder, date_path)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET user_id_hash = ?,
           legacy_folder = ?,
           date_path = COALESCE(user_id_mapping.date_path, ?)`,
        [userId, hash, legacyFolder, datePath, hash, legacyFolder, datePath]
      );
      return { id: result.lastInsertRowid, user_id: userId, user_id_hash: hash, legacy_folder: legacyFolder, date_path: datePath };
    } catch (error) {
      console.error('[UserIdMapping] create 오류:', error.message);
      return null;
    }
  },

  /**
   * 사용자 ID로 매핑 조회
   * @param {string} userId - 사용자 ID
   * @returns {Object|null} 매핑 정보 { id, user_id, user_id_hash, legacy_folder, created_at }
   */
  async findByUserId(userId) {
    try {
      return await db.get('SELECT * FROM user_id_mapping WHERE user_id = ?', [userId]);
    } catch (error) {
      console.error('[UserIdMapping] findByUserId 오류:', error.message);
      return null;
    }
  },

  /**
   * 해시로 매핑 조회 (폴더명 → 사용자 역조회)
   * @param {string} hash - 해시된 폴더명
   * @returns {Object|null} 매핑 정보
   */
  async findByHash(hash) {
    try {
      return await db.get('SELECT * FROM user_id_mapping WHERE user_id_hash = ?', [hash]);
    } catch (error) {
      console.error('[UserIdMapping] findByHash 오류:', error.message);
      return null;
    }
  },

  /**
   * 레거시 폴더명으로 매핑 조회
   * @param {string} legacyFolder - Base64 폴더명
   * @returns {Object|null} 매핑 정보
   */
  async findByLegacyFolder(legacyFolder) {
    try {
      return await db.get('SELECT * FROM user_id_mapping WHERE legacy_folder = ?', [legacyFolder]);
    } catch (error) {
      console.error('[UserIdMapping] findByLegacyFolder 오류:', error.message);
      return null;
    }
  },

  /**
   * 모든 매핑 조회
   * @returns {Array} 매핑 목록
   */
  async findAll() {
    try {
      return await db.all('SELECT * FROM user_id_mapping ORDER BY created_at DESC', []);
    } catch (error) {
      console.error('[UserIdMapping] findAll 오류:', error.message);
      return [];
    }
  },

  /**
   * 매핑 삭제
   * @param {string} userId - 사용자 ID
   * @returns {boolean} 삭제 성공 여부
   */
  async delete(userId) {
    try {
      await db.run('DELETE FROM user_id_mapping WHERE user_id = ?', [userId]);
      return true;
    } catch (error) {
      console.error('[UserIdMapping] delete 오류:', error.message);
      return false;
    }
  },

  /**
   * 매핑 개수 조회
   * @returns {number} 매핑 개수
   */
  async count() {
    try {
      const result = await db.get('SELECT COUNT(*) as count FROM user_id_mapping', []);
      return result?.count || 0;
    } catch (error) {
      console.error('[UserIdMapping] count 오류:', error.message);
      return 0;
    }
  }
};

module.exports = UserIdMapping;

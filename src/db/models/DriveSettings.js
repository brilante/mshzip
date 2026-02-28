'use strict';

/**
 * DriveSettings 모델
 * 사용자 드라이브 설정 관리
 * 참고소스(mymind3) 동등 구현
 *
 * @module db/models/DriveSettings
 */

const db = require('..');

class DriveSettings {
  /**
   * 테이블 초기화
   */
  static async initTable() {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_drive_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        drive_enabled INTEGER DEFAULT 0,
        drive_path TEXT DEFAULT '/MyMind3/saves',
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        token_expiry TIMESTAMP,
        last_sync TIMESTAMP,
        sync_mode TEXT DEFAULT 'two-way-manual',
        migrated_to_local INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * 사용자 ID로 드라이브 설정 조회
   */
  static async getByUserId(userId) {
    return await db.get(
      'SELECT * FROM user_drive_settings WHERE user_id = ?',
      [userId]
    );
  }

  /**
   * 새 드라이브 설정 생성
   */
  static async create(userId, settings = {}) {
    const result = await db.run(
      `INSERT INTO user_drive_settings (user_id, drive_enabled, drive_path)
       VALUES (?, ?, ?)`,
      [
        userId,
        settings.enabled || 0,
        settings.path || '/MyMind3/saves'
      ]
    );
    return result.lastInsertRowid;
  }

  /**
   * 토큰 정보 업데이트
   */
  static async updateTokens(userId, accessToken, refreshToken, expiry) {
    const now = new Date().toISOString();
    return await db.run(
      `UPDATE user_drive_settings
       SET access_token_encrypted = ?, refresh_token_encrypted = ?,
           token_expiry = ?, updated_at = ?
       WHERE user_id = ?`,
      [accessToken, refreshToken, expiry, now, userId]
    );
  }

  /**
   * 드라이브 활성화 상태 설정
   */
  static async setEnabled(userId, enabled) {
    const now = new Date().toISOString();
    return await db.run(
      `UPDATE user_drive_settings
       SET drive_enabled = ?, updated_at = ?
       WHERE user_id = ?`,
      [enabled ? 1 : 0, now, userId]
    );
  }

  /**
   * 마지막 동기화 시간 업데이트
   */
  static async updateLastSync(userId) {
    const now = new Date().toISOString();
    return await db.run(
      `UPDATE user_drive_settings
       SET last_sync = ?, updated_at = ?
       WHERE user_id = ?`,
      [now, now, userId]
    );
  }

  /**
   * 드라이브 경로 설정
   */
  static async setDrivePath(userId, drivePath) {
    const now = new Date().toISOString();
    return await db.run(
      `UPDATE user_drive_settings
       SET drive_path = ?, updated_at = ?
       WHERE user_id = ?`,
      [drivePath, now, userId]
    );
  }

  /**
   * 설정 삭제 (연결 해제 시)
   */
  static async deleteByUserId(userId) {
    return await db.run(
      'DELETE FROM user_drive_settings WHERE user_id = ?',
      [userId]
    );
  }

  /**
   * 활성화된 드라이브 사용자 목록 조회
   */
  static async getEnabledUsers() {
    return await db.all(
      'SELECT * FROM user_drive_settings WHERE drive_enabled = 1',
      []
    );
  }

  /**
   * 로컬 전환 완료 플래그 설정
   */
  static async setMigratedToLocal(userId, migrated) {
    const now = new Date().toISOString();
    return await db.run(
      `UPDATE user_drive_settings
       SET migrated_to_local = ?, updated_at = ?
       WHERE user_id = ?`,
      [migrated ? 1 : 0, now, userId]
    );
  }

  /**
   * Drive 연결 여부 확인 (백업용 — 토큰 + enabled 모두 필요)
   */
  static async isDriveConnected(userId) {
    const settings = await this.getByUserId(userId);
    return !!(settings?.drive_enabled && settings?.access_token_encrypted);
  }
}

module.exports = DriveSettings;

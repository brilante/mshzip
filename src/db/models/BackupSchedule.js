/**
 * BackupSchedule 및 BackupHistory 모델
 * 백업 스케줄 및 히스토리 관리
 *
 * @module db/models/BackupSchedule
 */

const db = require('..');

class BackupSchedule {
  /**
   * 테이블 초기화
   */
  static async initTable() {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_backup_schedule (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        first_login TIMESTAMP,
        next_backup TIMESTAMP,
        last_backup TIMESTAMP,
        backup_count INTEGER DEFAULT 0,
        backup_interval INTEGER DEFAULT 86400000,
        max_backups INTEGER DEFAULT 7,
        is_drive_user INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await db.exec('CREATE INDEX IF NOT EXISTS idx_backup_schedule_user ON user_backup_schedule(user_id)');
    } catch (e) {
      // 이미 존재
    }
  }

  /**
   * 사용자 ID로 백업 스케줄 조회
   */
  static async getByUserId(userId) {
    return await db.get(
      'SELECT * FROM user_backup_schedule WHERE user_id = ?',
      [userId]
    );
  }

  /**
   * 새 백업 스케줄 생성
   */
  static async create(userId, firstLogin) {
    // 다음 백업 시각: firstLogin + 1일
    const nextBackup = new Date(new Date(firstLogin).getTime() + 86400000).toISOString();
    const result = await db.run(
      `INSERT INTO user_backup_schedule (user_id, first_login, next_backup)
       VALUES (?, ?, ?)`,
      [userId, firstLogin, nextBackup]
    );
    return result.lastInsertRowid;
  }

  /**
   * 백업이 필요한 스케줄 조회 (Drive 사용자 포함 — Drive는 백업 전용)
   */
  static async getDueBackups() {
    const now = new Date().toISOString();
    return await db.all(
      `SELECT * FROM user_backup_schedule
       WHERE next_backup <= ?`,
      [now]
    );
  }

  /**
   * 백업 완료 후 스케줄 업데이트 (다음 백업: 현재 시각 + 1일)
   */
  static async updateAfterBackup(userId) {
    const now = new Date().toISOString();
    const nextBackup = new Date(Date.now() + 86400000).toISOString();
    return await db.run(
      `UPDATE user_backup_schedule
       SET last_backup = ?, next_backup = ?, backup_count = backup_count + 1, updated_at = ?
       WHERE user_id = ?`,
      [now, nextBackup, now, userId]
    );
  }

  /**
   * 드라이브 사용자 여부 설정
   */
  static async setDriveUser(userId, isDriveUser) {
    const now = new Date().toISOString();
    return await db.run(
      `UPDATE user_backup_schedule
       SET is_drive_user = ?, updated_at = ?
       WHERE user_id = ?`,
      [isDriveUser ? 1 : 0, now, userId]
    );
  }

  /**
   * 최대 백업 수 설정
   */
  static async setMaxBackups(userId, maxBackups) {
    const now = new Date().toISOString();
    return await db.run(
      `UPDATE user_backup_schedule
       SET max_backups = ?, updated_at = ?
       WHERE user_id = ?`,
      [maxBackups, now, userId]
    );
  }
}

class BackupHistory {
  /**
   * 테이블 초기화
   */
  static async initTable() {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        backup_path TEXT,
        backup_size INTEGER,
        mindmap_count INTEGER,
        node_count INTEGER,
        status TEXT,
        error_message TEXT,
        backup_location VARCHAR(20) DEFAULT 'local',
        drive_file_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);
    try {
      await db.exec('CREATE INDEX IF NOT EXISTS idx_backup_history_user ON backup_history(user_id)');
    } catch (e) {
      // 이미 존재
    }
  }

  /**
   * 백업 히스토리 생성
   */
  static async create(data) {
    const {
      user_id,
      backup_path,
      backup_size,
      mindmap_count,
      node_count,
      status,
      error_message,
      backup_location = 'local',
      drive_file_id = null
    } = data;

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO backup_history (
        user_id, backup_path, backup_size, mindmap_count,
        node_count, status, error_message, backup_location, drive_file_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        backup_path,
        backup_size || 0,
        mindmap_count || 0,
        node_count || 0,
        status,
        error_message || null,
        backup_location,
        drive_file_id,
        now
      ]
    );
    return result.lastInsertRowid;
  }

  /**
   * 사용자별 백업 히스토리 조회
   */
  static async getByUserId(userId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    return await db.all(
      `SELECT * FROM backup_history
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
  }

  /**
   * 백업 ID로 조회
   */
  static async getById(id) {
    return await db.get(
      'SELECT * FROM backup_history WHERE id = ?',
      [id]
    );
  }

  /**
   * 백업 삭제 (소프트 삭제)
   */
  static async softDelete(id) {
    const now = new Date().toISOString();
    return await db.run(
      `UPDATE backup_history
       SET deleted_at = ?, status = 'deleted'
       WHERE id = ?`,
      [now, id]
    );
  }

  /**
   * 사용자의 총 백업 수 조회
   */
  static async getBackupCount(userId) {
    const row = await db.get(
      `SELECT COUNT(*) as count FROM backup_history
       WHERE user_id = ? AND deleted_at IS NULL AND status = 'success'`,
      [userId]
    );
    return parseInt(row?.count) || 0;
  }

  /**
   * 오래된 백업 조회 (삭제 대상: maxBackups 이후 항목)
   */
  static async getOldBackups(userId, maxBackups) {
    return await db.all(
      `SELECT * FROM backup_history
       WHERE user_id = ? AND deleted_at IS NULL AND status = 'success'
       ORDER BY created_at DESC
       LIMIT 999999 OFFSET ?`,
      [userId, maxBackups]
    );
  }
}

module.exports = { BackupSchedule, BackupHistory };

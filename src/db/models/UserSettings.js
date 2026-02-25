'use strict';

/**
 * 사용자 개인 설정 관리 모델
 * 참고소스(mymind3) 동등 구현 + todoRootNodeId 추가
 *
 * @module db/models/UserSettings
 */

const db = require('..');

// 허용된 설정 키 목록
const ALLOWED_KEYS = [
  // 기존 (테마, 언어)
  'theme', 'language',
  // Basic Settings (기본 설정)
  'autoSaveInterval',
  'defaultNodeExpanded',
  'confirmDelete',
  'agentSkillsEnabled',
  'editorFontSize',
  // AI Settings (AI 설정)
  'defaultService',
  'multiAiEnabled',
  'paymentCurrency',
  'treeGenService',
  'treeGenModel',
  'treeGenSecondaryService',
  'treeGenSecondaryModel',
  'aiServices',
  // TODO 마인드맵 설정
  'todoRootNodeId',
  // 2FA (TOTP) 설정
  'totp_secret',
  'totp_enabled'
];

const UserSettings = {
  /**
   * 테이블 초기화
   */
  async initTable() {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, setting_key)
      )
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)
    `);

    console.log('[UserSettings] 테이블 초기화 완료');
  },

  /**
   * 사용자의 모든 설정 조회
   */
  async getAll(userId) {
    if (!userId) return {};

    const rows = await db.all(
      'SELECT setting_key, setting_value FROM user_settings WHERE user_id = $1',
      [userId]
    );

    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  },

  /**
   * 특정 설정 조회
   */
  async get(userId, key) {
    if (!userId || !ALLOWED_KEYS.includes(key)) return null;

    const row = await db.get(
      'SELECT setting_value FROM user_settings WHERE user_id = $1 AND setting_key = $2',
      [userId, key]
    );

    return row?.setting_value || null;
  },

  /**
   * 설정 저장 (단일, UPSERT)
   */
  async set(userId, key, value) {
    if (!userId || !ALLOWED_KEYS.includes(key)) {
      console.warn(`[UserSettings] 허용되지 않는 키: ${key}`);
      return false;
    }

    await db.run(`
      INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, key, value]);

    return true;
  },

  /**
   * 여러 설정 저장
   */
  async setMany(userId, settings) {
    if (!userId) return 0;

    let saved = 0;
    for (const [key, value] of Object.entries(settings)) {
      if (ALLOWED_KEYS.includes(key) && value !== undefined) {
        await this.set(userId, key, value);
        saved++;
      }
    }
    return saved;
  },

  /**
   * 사용자의 모든 설정 삭제
   */
  async deleteAll(userId) {
    if (!userId) return;
    await db.run('DELETE FROM user_settings WHERE user_id = $1', [userId]);
  },

  /**
   * 특정 설정 삭제
   */
  async delete(userId, key) {
    if (!userId || !ALLOWED_KEYS.includes(key)) return;
    await db.run(
      'DELETE FROM user_settings WHERE user_id = $1 AND setting_key = $2',
      [userId, key]
    );
  }
};

module.exports = UserSettings;

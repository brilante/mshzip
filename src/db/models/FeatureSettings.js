/**
 * 기능 설정 관리 모델
 * PPT/PDF 등 기능별 활성화/비활성화 설정 관리
 * 환경별(local/development/production) 독립 설정 지원
 *
 * @module db/models/FeatureSettings
 * @created 2026-01-05
 */

const db = require('..');

// 지원하는 환경 목록
const ENVIRONMENTS = ['local', 'development', 'production'];

// 기본 설정값
const DEFAULT_SETTINGS = {
  enableNodeRestructure: true,
  enablePpt: true,
  enablePdf: true
};

/**
 * 기능 설정 모델
 */
const FeatureSettings = {
  /**
   * 테이블 초기화 (PostgreSQL 전용)
   */
  async initTable() {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS feature_settings (
        id SERIAL PRIMARY KEY,
        environment TEXT NOT NULL,
        feature_name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(environment, feature_name)
      )
    `);
    console.log('[FeatureSettings] Table initialized');
  },

  /**
   * 특정 환경의 모든 기능 설정 조회
   * @param {string} environment - 환경 (local/development/production)
   * @returns {Promise<Object>} - { enableNodeRestructure: boolean, enablePpt: boolean, enablePdf: boolean }
   */
  async getAll(environment = 'local') {
    if (!ENVIRONMENTS.includes(environment)) {
      environment = 'local';
    }

    const rows = await db.all(
      'SELECT feature_name, enabled FROM feature_settings WHERE environment = ?',
      [environment]
    );

    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.feature_name === 'nodeRestructure') {
        settings.enableNodeRestructure = row.enabled === 1;
      } else if (row.feature_name === 'ppt') {
        settings.enablePpt = row.enabled === 1;
      } else if (row.feature_name === 'pdf') {
        settings.enablePdf = row.enabled === 1;
      }
    }
    return settings;
  },

  /**
   * 모든 환경의 기능 설정 조회
   * @returns {Promise<Object>} - { local: {...}, development: {...}, production: {...} }
   */
  async getAllEnvironments() {
    const result = {};
    for (const env of ENVIRONMENTS) {
      result[env] = await this.getAll(env);
    }
    return result;
  },

  /**
   * 특정 환경의 기능 설정 저장
   * @param {string} environment - 환경
   * @param {Object} settings - { enableNodeRestructure: boolean, enablePpt: boolean, enablePdf: boolean }
   * @returns {Promise<number>} - 업데이트된 행 수
   */
  async save(environment, settings) {
    if (!ENVIRONMENTS.includes(environment)) {
      throw new Error(`Invalid environment: ${environment}`);
    }

    const features = [
      { name: 'nodeRestructure', enabled: settings.enableNodeRestructure !== false ? 1 : 0 },
      { name: 'ppt', enabled: settings.enablePpt !== false ? 1 : 0 },
      { name: 'pdf', enabled: settings.enablePdf !== false ? 1 : 0 }
    ];

    let updated = 0;
    for (const feature of features) {
      await db.run(`
        INSERT INTO feature_settings (environment, feature_name, enabled, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(environment, feature_name) DO UPDATE SET
          enabled = excluded.enabled,
          updated_at = CURRENT_TIMESTAMP
      `, [environment, feature.name, feature.enabled]);
      updated++;
    }

    console.log(`[FeatureSettings] Saved ${updated} features for ${environment}`);
    return updated;
  },

  /**
   * 모든 환경의 기능 설정 저장
   * @param {Object} allSettings - { local: {...}, development: {...}, production: {...} }
   * @returns {Promise<number>} - 업데이트된 총 행 수
   */
  async saveAll(allSettings) {
    let totalUpdated = 0;
    for (const [env, settings] of Object.entries(allSettings)) {
      if (ENVIRONMENTS.includes(env)) {
        totalUpdated += await this.save(env, settings);
      }
    }
    return totalUpdated;
  },

  /**
   * 설정 초기화 (기본값으로 복원)
   * @param {string|null} environment - 환경 (null이면 모든 환경)
   */
  async reset(environment = null) {
    if (environment) {
      await db.run('DELETE FROM feature_settings WHERE environment = ?', [environment]);
    } else {
      await db.run('DELETE FROM feature_settings');
    }

    console.log(`[FeatureSettings] Reset ${environment || 'all'} environments`);
  }
};

// 테이블 자동 초기화
FeatureSettings.initTable().catch(err => {
  console.error('[FeatureSettings] Table init error:', err.message);
});

module.exports = FeatureSettings;

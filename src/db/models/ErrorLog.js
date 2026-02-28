/**
 * ErrorLog 모델
 * 에러 로그 DB 관리
 *
 * @module db/models/ErrorLog
 */

const db = require('..');

// 로그 레벨 상수
const LOG_LEVELS = {
  INFO:     { num: 0, retention: 7    }, // 7일 보관
  WARNING:  { num: 1, retention: 30   }, // 30일 보관
  ERROR:    { num: 2, retention: 90   }, // 90일 보관
  CRITICAL: { num: 3, retention: null }  // 영구 보관
};

class ErrorLog {
  /**
   * 에러 로그 생성
   * @param {Object} data 로그 데이터
   * @returns {number|null} 생성된 로그 ID
   */
  static async create(data) {
    const {
      error_id,
      level,
      level_num,
      message,
      stack,
      source,
      user_id,
      request_id,
      request_path,
      extra,
      retention_days
    } = data;

    // 만료일 계산 (retention_days가 null이면 영구 보관)
    let expires_at = null;
    if (retention_days !== null && retention_days !== undefined) {
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + retention_days);
      expires_at = expiresDate.toISOString();
    }

    const now = new Date().toISOString();
    const extraJson = extra ? JSON.stringify(extra) : null;

    const result = await db.run(`
      INSERT INTO error_logs (
        error_id, level, level_num, message, stack, source,
        user_id, request_id, request_path, extra,
        retention_days, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      error_id,
      level,
      level_num,
      message,
      stack || null,
      source || null,
      user_id || null,
      request_id || null,
      request_path || null,
      extraJson,
      retention_days,
      expires_at,
      now
    ]);

    return result?.lastInsertRowid || result?.id || null;
  }

  /**
   * 만료된 로그 삭제 (CRITICAL 레벨 제외)
   * @returns {number} 삭제된 로그 수
   */
  static async deleteExpired() {
    const now = new Date().toISOString();

    const result = await db.run(`
      DELETE FROM error_logs
      WHERE expires_at IS NOT NULL
        AND expires_at < ?
        AND level_num < ?
    `, [now, LOG_LEVELS.CRITICAL.num]);

    return result?.changes || 0;
  }

  /**
   * 로그 검색 (동적 필터)
   * queryAdapter가 PG 모드에서 ? → $N 자동 변환
   * @param {Object} filters 검색 필터
   * @param {number} limit 최대 결과 수
   * @param {number} offset 시작 위치
   * @returns {Array} 검색 결과
   */
  static async search(filters = {}, limit = 100, offset = 0) {
    const { level, level_num, source, user_id, start_date, end_date, is_resolved } = filters;
    let sql = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];

    if (level !== undefined)       { sql += ' AND level = ?';          params.push(level); }
    if (level_num !== undefined)   { sql += ' AND level_num >= ?';     params.push(level_num); }
    if (source !== undefined)      { sql += ' AND source = ?';         params.push(source); }
    if (user_id !== undefined)     { sql += ' AND user_id = ?';        params.push(user_id); }
    if (start_date !== undefined)  { sql += ' AND created_at >= ?';    params.push(start_date); }
    if (end_date !== undefined)    { sql += ' AND created_at <= ?';    params.push(end_date); }
    if (is_resolved !== undefined) { sql += ' AND is_resolved = ?';    params.push(is_resolved ? 1 : 0); }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await db.all(sql, params);
  }

  /**
   * 로그 통계 조회 (전체·소스별·일별)
   * @param {number} days 통계 기간 (일)
   * @returns {Object} { period_days, total, by_source, by_day }
   */
  static async getStats(days = 7) {
    // 기준 날짜를 JS에서 미리 계산
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // 전체 통계
    const total = await db.get(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN level = 'ERROR'    THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN level = 'WARNING'  THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN level = 'INFO'     THEN 1 ELSE 0 END) as info_count,
        SUM(CASE WHEN is_resolved = 1    THEN 1 ELSE 0 END) as resolved_count
      FROM error_logs
      WHERE created_at >= ?
    `, [startDateStr]);

    // 소스별 통계 (상위 10개)
    const by_source = await db.all(`
      SELECT
        source,
        COUNT(*) as count,
        MAX(level_num) as max_level
      FROM error_logs
      WHERE created_at >= ?
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `, [startDateStr]);

    // 일별 통계
    const by_day = await db.all(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(CASE WHEN level_num >= 2 THEN 1 ELSE 0 END) as error_count
      FROM error_logs
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDateStr]);

    return { period_days: days, total, by_source, by_day };
  }

  /**
   * 에러 ID로 단일 로그 조회
   * @param {string} errorId 에러 UUID
   * @returns {Object|null} 로그 데이터
   */
  static async findById(errorId) {
    return await db.get(
      'SELECT * FROM error_logs WHERE error_id = ?',
      [errorId]
    );
  }

  /**
   * 로그 해결 상태 업데이트
   * @param {string} errorId 에러 UUID
   * @param {boolean} resolved 해결 여부
   * @returns {number} 변경된 행 수
   */
  static async setResolved(errorId, resolved = true) {
    const result = await db.run(
      'UPDATE error_logs SET is_resolved = ? WHERE error_id = ?',
      [resolved ? 1 : 0, errorId]
    );
    return result?.changes || 0;
  }

  /**
   * 로그 개수 조회 (페이지네이션용, 동적 필터)
   * queryAdapter가 PG 모드에서 ? → $N 자동 변환
   * @param {Object} filters 검색 필터
   * @param {string|null} messageFilter 메시지 LIKE 필터
   * @returns {number} 로그 개수
   */
  static async count(filters = {}, messageFilter = null) {
    const { level, level_num, source, user_id, start_date, end_date, is_resolved } = filters;
    let sql = 'SELECT COUNT(*) as count FROM error_logs WHERE 1=1';
    const params = [];

    if (level !== undefined)       { sql += ' AND level = ?';          params.push(level); }
    if (level_num !== undefined)   { sql += ' AND level_num >= ?';     params.push(level_num); }
    if (source !== undefined)      { sql += ' AND source = ?';         params.push(source); }
    if (user_id !== undefined)     { sql += ' AND user_id = ?';        params.push(user_id); }
    if (start_date !== undefined)  { sql += ' AND created_at >= ?';    params.push(start_date); }
    if (end_date !== undefined)    { sql += ' AND created_at <= ?';    params.push(end_date); }
    if (is_resolved !== undefined) { sql += ' AND is_resolved = ?';    params.push(is_resolved ? 1 : 0); }

    if (messageFilter) {
      sql += ' AND LOWER(message) LIKE ?';
      params.push(`%${messageFilter.toLowerCase()}%`);
    }

    const row = await db.get(sql, params);
    return row?.count || 0;
  }

  /**
   * 로그 레벨 상수
   */
  static get LOG_LEVELS() {
    return LOG_LEVELS;
  }
}

module.exports = ErrorLog;

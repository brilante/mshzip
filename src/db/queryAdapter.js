/**
 * SQL 쿼리 어댑터 (PostgreSQL 전용)
 * 레거시 SQL 문법(datetime(), strftime() 등)을 PostgreSQL 문법으로 자동 변환
 *
 * @module db/queryAdapter
 * @created 2025-12-17
 * @updated 2026-02-18 - PostgreSQL 전용
 */

/**
 * SQL 쿼리를 PostgreSQL 문법으로 변환
 *
 * @param {string} sql - 원본 SQL 쿼리
 * @returns {string} - PostgreSQL 변환된 SQL 쿼리
 */
function adaptQuery(sql) {
  let paramIndex = 0;
  let adaptedSql = sql;

  // 1. datetime() 함수를 PostgreSQL NOW()로 변환
  adaptedSql = adaptedSql
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/datetime\('now',\s*'localtime'\)/gi, 'NOW()')
    .replace(/datetime\('now',\s*'(-?\d+)\s*(day|days|hour|hours|minute|minutes|second|seconds)'\)/gi,
      (match, num, unit) => `NOW() + INTERVAL '${num} ${unit}'`
    )
    .replace(/datetime\(\s*\?\s*,\s*'unixepoch'\)/gi, 'TO_TIMESTAMP(?)');

  // 2. strftime() 함수를 PostgreSQL to_char()로 변환
  adaptedSql = adaptedSql
    .replace(/strftime\(\s*'%Y-%m'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM')")
    .replace(/strftime\(\s*'%Y-%m-%d'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM-DD')")
    .replace(/strftime\(\s*'%Y-%m-%d %H:%M:%S'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM-DD HH24:MI:SS')")
    .replace(/strftime\(\s*'%H:%M'\s*,\s*([^)]+)\)/gi, "to_char($1, 'HH24:MI')");

  // 3. date() 함수를 PostgreSQL로 변환
  adaptedSql = adaptedSql
    .replace(/\bdate\('now',\s*'start of month'\)/gi, "date_trunc('month', CURRENT_DATE)")
    .replace(/\bdate\('now'\)/gi, 'CURRENT_DATE')
    .replace(/\bdate\('now',\s*'([+-]?\d+)\s*(day|days|hour|hours|minute|minutes|second|seconds)'\)/gi,
      (match, num, unit) => `CURRENT_DATE + INTERVAL '${num} ${unit}'`
    )
    .replace(/\bdate\(([^)]+)\)/gi, '$1::date');

  // 4. IFNULL을 PostgreSQL COALESCE로 변환
  adaptedSql = adaptedSql.replace(/IFNULL\(/gi, 'COALESCE(');

  // 5. AUTOINCREMENT를 PostgreSQL SERIAL로 변환 (DDL 쿼리용)
  adaptedSql = adaptedSql.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

  // 6. ? placeholder를 PostgreSQL $1, $2, ... 로 변환
  adaptedSql = adaptedSql.replace(/\?/g, () => `$${++paramIndex}`);

  // 7. GLOB을 PostgreSQL LIKE로 변환
  adaptedSql = adaptedSql.replace(/\sGLOB\s/gi, ' LIKE ');

  // 8. GROUP_CONCAT을 STRING_AGG로 변환
  adaptedSql = adaptedSql
    .replace(/GROUP_CONCAT\(\s*([^,)]+)\s*,\s*('[^']*')\s*\)/gi, 'STRING_AGG($1::text, $2)')
    .replace(/GROUP_CONCAT\(\s*([^,)]+)\s*\)/gi, "STRING_AGG($1::text, ',')");

  // 9. INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
  adaptedSql = adaptedSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  if (/INSERT\s+OR\s+IGNORE/i.test(sql)) {
    adaptedSql = adaptedSql.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING');
  }

  // 10. INSERT OR REPLACE → INSERT ... ON CONFLICT DO UPDATE (경고 + 기본 변환)
  if (/INSERT\s+OR\s+REPLACE/i.test(adaptedSql)) {
    console.warn('[QueryAdapter] INSERT OR REPLACE 감지 - ON CONFLICT DO UPDATE로 변환 시도');
    adaptedSql = adaptedSql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');
  }

  // 11. 스칼라 MAX(a, b) → PostgreSQL GREATEST(a, b) 변환
  adaptedSql = adaptedSql.replace(/\bMAX\s*\(\s*([^,)]+)\s*,\s*([^)]+)\)/gi, 'GREATEST($1, $2)');

  // 12. PRAGMA → 무시 (PostgreSQL에서 PRAGMA 미지원)
  if (/^\s*PRAGMA\s/i.test(adaptedSql)) {
    console.warn('[QueryAdapter] PRAGMA 문은 PostgreSQL에서 지원되지 않습니다:', adaptedSql.trim());
    return 'SELECT 1';
  }

  return adaptedSql;
}

/**
 * 쿼리 파라미터를 PostgreSQL 형식으로 변환
 *
 * @param {Array|Object} params - 원본 파라미터
 * @returns {Array} - 변환된 파라미터 배열
 */
function adaptParams(params) {
  if (params === null || params === undefined) return [];
  if (Array.isArray(params)) return params.map(convertValue);
  if (typeof params === 'object') return Object.values(params).map(convertValue);
  return [convertValue(params)];
}

/**
 * JavaScript 값을 PostgreSQL 타입으로 변환
 *
 * @param {*} value - 원본 값
 * @returns {*} - 변환된 값
 */
function convertValue(value) {
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return value;
}

/**
 * INSERT 쿼리에서 RETURNING 절 추가
 *
 * @param {string} sql - 원본 INSERT 쿼리
 * @returns {string} - RETURNING 절이 추가된 쿼리
 */
function addReturning(sql) {
  if (/^\s*INSERT\s+INTO/i.test(sql) && !/RETURNING/i.test(sql)) {
    return sql.replace(/;?\s*$/, ' RETURNING id;');
  }
  return sql;
}

/**
 * 테이블명에 스키마 접두사 추가
 *
 * @param {string} tableName - 테이블명
 * @returns {string} - 스키마가 포함된 테이블명
 */
function withSchema(tableName) {
  if (tableName.includes('.')) return tableName;
  const schema = process.env.PG_SCHEMA || 'mymind3';
  return `${schema}.${tableName}`;
}

/**
 * LIMIT OFFSET 구문 변환 (PostgreSQL 표준 문법이므로 변환 불필요)
 */
function adaptLimitOffset(sql) {
  return sql;
}

/**
 * UPSERT 쿼리 변환 안내
 *
 * @param {string} sql - 원본 SQL
 * @returns {string} - 변환된 SQL
 */
function adaptUpsert(sql) {
  if (/INSERT\s+OR\s+REPLACE/i.test(sql)) {
    console.warn('[QueryAdapter] INSERT OR REPLACE는 ON CONFLICT DO UPDATE 구문으로 직접 작성해주세요.');
  }
  return sql;
}

module.exports = {
  adaptQuery,
  adaptParams,
  addReturning,
  withSchema,
  adaptLimitOffset,
  adaptUpsert,
  convertValue
};

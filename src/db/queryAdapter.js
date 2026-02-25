/**
 * SQL 쿼리 어댑터 (PostgreSQL 전용)
 * 레거시 SQL 문법(datetime(), strftime() 등)을 PostgreSQL 문법으로 자동 변환
 *
 * @module db/queryAdapter
 * @created 2025-12-17
 * @updated 2026-02-18 - PostgreSQL 전용으로 전환
 */

/**
 * SQL 쿼리를 PostgreSQL 문법으로 변환
 * 레거시 SQL 함수(datetime, strftime, IFNULL 등)를 PostgreSQL 네이티브 문법으로 변환
 *
 * @param {string} sql - 원본 SQL 쿼리
 * @returns {string} - PostgreSQL 변환된 SQL 쿼리
 *
 * @example
 * // 입력: SELECT * FROM users WHERE created_at > datetime('now', '-7 days')
 * // 출력: SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'
 */
function adaptQuery(sql) {
  let paramIndex = 0;
  let adaptedSql = sql;

  // 1. datetime() 함수를 PostgreSQL NOW()로 변환
  adaptedSql = adaptedSql
    // datetime('now') -> NOW()
    .replace(/datetime\('now'\)/gi, 'NOW()')
    // datetime('now', 'localtime') -> NOW()
    .replace(/datetime\('now',\s*'localtime'\)/gi, 'NOW()')
    // datetime('now', '-N days') -> NOW() - INTERVAL 'N days'
    .replace(/datetime\('now',\s*'(-?\d+)\s*(day|days|hour|hours|minute|minutes|second|seconds)'\)/gi,
      (match, num, unit) => `NOW() + INTERVAL '${num} ${unit}'`
    )
    // datetime(?, 'unixepoch') -> TO_TIMESTAMP(?)
    .replace(/datetime\(\s*\?\s*,\s*'unixepoch'\)/gi, 'TO_TIMESTAMP(?)');

  // 2. strftime() 함수를 PostgreSQL to_char()로 변환
  adaptedSql = adaptedSql
    // strftime('%Y-%m', column) -> to_char(column, 'YYYY-MM')
    .replace(/strftime\(\s*'%Y-%m'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM')")
    // strftime('%Y-%m-%d', column) -> to_char(column, 'YYYY-MM-DD')
    .replace(/strftime\(\s*'%Y-%m-%d'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM-DD')")
    // strftime('%Y-%m-%d %H:%M:%S', column) -> to_char(column, 'YYYY-MM-DD HH24:MI:SS')
    .replace(/strftime\(\s*'%Y-%m-%d %H:%M:%S'\s*,\s*([^)]+)\)/gi, "to_char($1, 'YYYY-MM-DD HH24:MI:SS')")
    // strftime('%H:%M', column) -> to_char(column, 'HH24:MI')
    .replace(/strftime\(\s*'%H:%M'\s*,\s*([^)]+)\)/gi, "to_char($1, 'HH24:MI')");

  // 3. date() 함수를 PostgreSQL로 변환
  adaptedSql = adaptedSql
    // date('now', 'start of month') -> date_trunc('month', CURRENT_DATE)
    .replace(/\bdate\('now',\s*'start of month'\)/gi, "date_trunc('month', CURRENT_DATE)")
    // date('now') -> CURRENT_DATE
    .replace(/\bdate\('now'\)/gi, 'CURRENT_DATE')
    // date('now', '±N unit') -> CURRENT_DATE + INTERVAL '±N unit'
    .replace(/\bdate\('now',\s*'([+-]?\d+)\s*(day|days|hour|hours|minute|minutes|second|seconds)'\)/gi,
      (match, num, unit) => `CURRENT_DATE + INTERVAL '${num} ${unit}'`
    )
    // date(column) -> column::date (나머지 date() 호출만 대상)
    .replace(/\bdate\(([^)]+)\)/gi, '$1::date');

  // 4. IFNULL을 PostgreSQL COALESCE로 변환
  adaptedSql = adaptedSql
    .replace(/IFNULL\(/gi, 'COALESCE(');

  // 5. || 문자열 연결은 PostgreSQL에서도 동일하게 동작

  // 6. AUTOINCREMENT를 PostgreSQL SERIAL로 변환 (DDL 쿼리용)
  adaptedSql = adaptedSql
    .replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');

  // 7. ? placeholder를 PostgreSQL $1, $2, ... 로 변환
  adaptedSql = adaptedSql.replace(/\?/g, () => `$${++paramIndex}`);

  // 8. GLOB을 PostgreSQL LIKE로 변환
  adaptedSql = adaptedSql
    .replace(/\sGLOB\s/gi, ' LIKE ');

  // 9. GROUP_CONCAT을 STRING_AGG로 변환
  // GROUP_CONCAT(column) → STRING_AGG(column::text, ',')
  // GROUP_CONCAT(column, separator) → STRING_AGG(column::text, separator)
  adaptedSql = adaptedSql
    .replace(/GROUP_CONCAT\(\s*([^,)]+)\s*,\s*('[^']*')\s*\)/gi,
      'STRING_AGG($1::text, $2)')
    .replace(/GROUP_CONCAT\(\s*([^,)]+)\s*\)/gi,
      "STRING_AGG($1::text, ',')");

  // 10. INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
  adaptedSql = adaptedSql
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  if (/INSERT\s+OR\s+IGNORE/i.test(sql)) {
    // 원래 SQL에 OR IGNORE가 있었으면 ON CONFLICT DO NOTHING 추가
    adaptedSql = adaptedSql.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING');
  }

  // 11. INSERT OR REPLACE → INSERT ... ON CONFLICT DO UPDATE (경고 + 기본 변환)
  if (/INSERT\s+OR\s+REPLACE/i.test(adaptedSql)) {
    console.warn('[QueryAdapter] INSERT OR REPLACE 감지 - ON CONFLICT DO UPDATE로 변환 시도');
    adaptedSql = adaptedSql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');
    // 뒤에 ON CONFLICT 절이 없으면 경고만 출력 (호출부에서 수동 처리 필요)
  }

  // 12. sqlite_master → information_schema 변환 (레거시 쿼리 호환)
  if (/sqlite_master/i.test(adaptedSql)) {
    adaptedSql = adaptedSql
      .replace(
        /SELECT\s+name\s+FROM\s+sqlite_master\s+WHERE\s+type\s*=\s*'table'\s+AND\s+name\s*=\s*/gi,
        "SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = "
      );
    if (/sqlite_master/i.test(adaptedSql)) {
      console.warn('[QueryAdapter] sqlite_master 참조가 완전히 변환되지 않음:', adaptedSql.substring(0, 80));
    }
  }

  // 13. 스칼라 MAX(a, b) → PostgreSQL GREATEST(a, b) 변환
  // 2개 이상 인자를 가진 MAX()만 GREATEST()로 변환 (집계 MAX(col)은 그대로 유지)
  adaptedSql = adaptedSql.replace(/\bMAX\s*\(\s*([^,)]+)\s*,\s*([^)]+)\)/gi, 'GREATEST($1, $2)');

  // 14. PRAGMA → 무시 (PostgreSQL에서 PRAGMA 미지원)
  if (/^\s*PRAGMA\s/i.test(adaptedSql)) {
    console.warn('[QueryAdapter] PRAGMA 문은 PostgreSQL에서 무시됩니다:', adaptedSql.trim());
    return 'SELECT 1'; // PRAGMA를 무해한 쿼리로 대체
  }

  // 14. BOOLEAN 값 처리
  // 이 부분은 쿼리에서 직접 값을 사용할 때만 적용
  // 파라미터로 전달되는 경우는 adaptParams에서 처리

  return adaptedSql;
}

/**
 * 쿼리 파라미터를 PostgreSQL 형식으로 변환
 *
 * @param {Array|Object} params - 원본 파라미터
 * @returns {Array} - 변환된 파라미터 배열
 *
 * @example
 * // 객체 파라미터를 배열로 변환
 * adaptParams({ user_id: '123', name: 'test' }) -> ['123', 'test']
 */
function adaptParams(params) {
  // null/undefined 처리
  if (params === null || params === undefined) {
    return [];
  }

  // 이미 배열인 경우 그대로 반환 (boolean 변환 포함)
  if (Array.isArray(params)) {
    return params.map(convertValue);
  }

  // 객체인 경우 값들을 배열로 변환
  if (typeof params === 'object') {
    return Object.values(params).map(convertValue);
  }

  // 단일 값인 경우 배열로 감싸기
  return [convertValue(params)];
}

/**
 * JavaScript 값을 PostgreSQL 타입으로 변환
 *
 * @param {*} value - 원본 값
 * @returns {*} - 변환된 값
 */
function convertValue(value) {
  // Boolean -> PostgreSQL boolean
  if (typeof value === 'boolean') {
    return value;
  }

  // Date 객체 -> ISO 문자열
  if (value instanceof Date) {
    return value.toISOString();
  }

  // 객체/배열 -> JSON 문자열 (JSONB 컬럼용)
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return value;
}

/**
 * INSERT 쿼리에서 RETURNING 절 추가
 * PostgreSQL에서 삽입된 행의 ID를 가져오기 위함
 *
 * @param {string} sql - 원본 INSERT 쿼리
 * @returns {string} - RETURNING 절이 추가된 쿼리
 */
function addReturning(sql) {
  // INSERT 쿼리이고 RETURNING이 없으면 추가
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
  // 이미 스키마가 있으면 그대로
  if (tableName.includes('.')) {
    return tableName;
  }

  const schema = process.env.PG_SCHEMA || 'mymind3';
  return `${schema}.${tableName}`;
}

/**
 * LIMIT OFFSET 구문 변환
 * LIMIT OFFSET은 PostgreSQL 표준 문법이므로 변환 불필요
 */
function adaptLimitOffset(sql) {
  return sql;
}

/**
 * UPSERT 쿼리 변환 (INSERT OR REPLACE -> ON CONFLICT)
 *
 * @param {string} sql - 원본 SQL
 * @returns {string} - 변환된 SQL
 */
function adaptUpsert(sql) {
  // INSERT OR REPLACE -> INSERT ... ON CONFLICT DO UPDATE
  // 이 변환은 복잡하므로 수동으로 처리 권장
  if (/INSERT\s+OR\s+REPLACE/i.test(sql)) {
    console.warn('[QueryAdapter] INSERT OR REPLACE는 수동으로 ON CONFLICT 구문으로 변환해야 합니다.');
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

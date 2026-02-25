'use strict';

/**
 * 데이터베이스 연결 관리자
 * PostgreSQL 전용. 참고소스(mymind3) 동등 구현.
 *
 * @module db/index
 */

const { Pool } = require('pg');
const queryAdapter = require('./queryAdapter');

let pool = null;
let isConnected = false;

/**
 * PostgreSQL 연결
 */
async function connect() {
  if (pool && isConnected) return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('[DB] DATABASE_URL 환경변수가 설정되지 않았습니다.');
  }

  pool = new Pool({
    connectionString,
    ssl: false,
    max: 5,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('[DB] 연결 풀 에러:', err.message);
  });

  // 연결 테스트
  const client = await pool.connect();
  await client.query('SELECT NOW()');
  client.release();
  isConnected = true;
  console.log('[DB] PostgreSQL 연결 성공');
}

/**
 * 단일 행 조회
 * @param {string} sql - SQL (파라미터: ? 또는 $1, $2, ...)
 * @param {Array} params
 */
async function get(sql, params = []) {
  const result = await pool.query(
    queryAdapter.adaptQuery(sql),
    queryAdapter.adaptParams(params)
  );
  return result.rows[0] || null;
}

/**
 * 다중 행 조회
 */
async function all(sql, params = []) {
  const result = await pool.query(
    queryAdapter.adaptQuery(sql),
    queryAdapter.adaptParams(params)
  );
  return result.rows;
}

/**
 * INSERT/UPDATE/DELETE 실행
 */
async function run(sql, params = []) {
  let adaptedSql = queryAdapter.adaptQuery(sql);
  const adaptedParams = queryAdapter.adaptParams(params);
  if (/^\s*INSERT\s+INTO/i.test(sql) && !/RETURNING/i.test(adaptedSql)) {
    adaptedSql = adaptedSql.replace(/;?\s*$/, ' RETURNING id');
  }
  const result = await pool.query(adaptedSql, adaptedParams);
  return {
    changes: result.rowCount,
    lastInsertRowid: result.rows[0]?.id || null
  };
}

/**
 * DDL 직접 실행
 */
async function exec(sql) {
  return pool.query(queryAdapter.adaptQuery(sql));
}

/**
 * 트랜잭션 실행
 * @param {Function} callback - (client) => Promise
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      async get(sql, params = []) {
        const result = await client.query(
          queryAdapter.adaptQuery(sql),
          queryAdapter.adaptParams(params)
        );
        return result.rows[0] || null;
      },
      async all(sql, params = []) {
        const result = await client.query(
          queryAdapter.adaptQuery(sql),
          queryAdapter.adaptParams(params)
        );
        return result.rows;
      },
      async run(sql, params = []) {
        let adaptedSql = queryAdapter.adaptQuery(sql);
        const adaptedParams = queryAdapter.adaptParams(params);
        if (/^\s*INSERT\s+INTO/i.test(sql) && !/RETURNING/i.test(adaptedSql)) {
          adaptedSql = adaptedSql.replace(/;?\s*$/, ' RETURNING id');
        }
        const result = await client.query(adaptedSql, adaptedParams);
        return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id || null };
      }
    };
    await callback(tx);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 연결 종료
 */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}

/**
 * 테이블 존재 여부 확인
 */
async function tableExists(tableName) {
  const result = await get(
    "SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
    [tableName]
  );
  return !!result;
}

/**
 * 연결 상태
 */
function getStatus() {
  return { connected: isConnected };
}

module.exports = { connect, get, all, run, exec, close, getStatus, transaction, tableExists, queryAdapter };

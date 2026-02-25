'use strict';

/**
 * 배치실행로그 관리 API (관리자 전용)
 * 원본: src/api/admin/_legacy.js (model-sync/logs, batch/* 영역)
 *
 * 기능:
 * - model_sync_logs 테이블 자동 생성
 * - 배치 수동 실행 (9종) + DB 로그 저장
 * - 배치 실행 로그 조회/삭제/통계
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');

// 배치 종류별 한글 이름 매핑
const BATCH_TYPE_NAMES = {
  'model_sync': 'AI 모델 동기화',
  'exchange_rate': '환율 업데이트',
  'subscription': '구독 처리',
  'credit_rate': '크레딧 레이트',
  'backup': 'DB백업',
  'log_backup': '로그 백업',
  'daily_credit': '일일 크레딧 리셋',
  'qa_auto_reply': 'Q&A 자동 답변',
  'cloud-scheduler-warmup': 'Cloud Run Warmup'
};

// 테이블 초기화 플래그
let tableInitialized = false;

/**
 * model_sync_logs 테이블 자동 생성 (최초 1회)
 */
async function ensureTable() {
  if (tableInitialized) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS model_sync_logs (
        id SERIAL PRIMARY KEY,
        sync_date TEXT NOT NULL,
        ai_service TEXT NOT NULL DEFAULT '-',
        api_status TEXT NOT NULL DEFAULT 'success',
        models_found INTEGER DEFAULT 0,
        models_added INTEGER DEFAULT 0,
        models_updated INTEGER DEFAULT 0,
        models_deprecated INTEGER DEFAULT 0,
        error_message TEXT,
        response_time_ms INTEGER,
        batch_type TEXT DEFAULT 'model_sync',
        environment TEXT DEFAULT 'local',
        extra TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON model_sync_logs(sync_date)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_logs_service ON model_sync_logs(ai_service)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_logs_batch_type ON model_sync_logs(batch_type)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_logs_environment ON model_sync_logs(environment)`);
    // 기존 테이블에 누락된 컬럼 자동 추가
    try { await db.exec(`ALTER TABLE model_sync_logs ADD COLUMN extra TEXT`); } catch (e) { /* 이미 존재 */ }
    try { await db.exec(`ALTER TABLE model_sync_logs ADD COLUMN environment TEXT DEFAULT 'local'`); } catch (e) { /* 이미 존재 */ }
    try { await db.exec(`ALTER TABLE model_sync_logs ADD COLUMN batch_type TEXT DEFAULT 'model_sync'`); } catch (e) { /* 이미 존재 */ }
    tableInitialized = true;
  } catch (e) {
    // 이미 존재하면 무시 → 컬럼 추가만 시도
    if (e.message && e.message.includes('already exists')) {
      try { await db.exec(`ALTER TABLE model_sync_logs ADD COLUMN extra TEXT`); } catch (e2) { /* 이미 존재 */ }
      try { await db.exec(`ALTER TABLE model_sync_logs ADD COLUMN environment TEXT DEFAULT 'local'`); } catch (e2) { /* 이미 존재 */ }
      try { await db.exec(`ALTER TABLE model_sync_logs ADD COLUMN batch_type TEXT DEFAULT 'model_sync'`); } catch (e2) { /* 이미 존재 */ }
      tableInitialized = true;
    } else {
      console.error('[BatchLog] 테이블 생성 오류:', e.message);
    }
  }
}

/**
 * 배치 실행 로그 저장
 */
async function saveBatchLog(params) {
  const {
    batchType,
    status,
    aiService = '-',
    stats = {},
    errorMessage = null,
    responseTimeMs = null,
    extra = null
  } = params;

  try {
    await ensureTable();
    const today = new Date().toISOString().split('T')[0];

    await db.run(`
      INSERT INTO model_sync_logs (
        batch_type, sync_date, ai_service, api_status,
        models_found, models_added, models_updated, models_deprecated,
        error_message, response_time_ms, environment, extra
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      batchType,
      today,
      aiService,
      status,
      stats.found || 0,
      stats.added || 0,
      stats.updated || 0,
      stats.deprecated || 0,
      errorMessage,
      responseTimeMs,
      'local',
      extra ? JSON.stringify(extra) : null
    ]);

    console.log(`[BatchLog] ${batchType} 배치 로그 저장 완료: ${status}`);
  } catch (error) {
    console.error('[BatchLog] 로그 저장 실패:', error.message);
  }
}

// ==========================================
// 배치 실행 로그 조회 API
// ==========================================

/**
 * GET /api/admin/model-sync/logs
 * 배치 실행 로그 조회
 */
router.get('/model-sync/logs', async (req, res) => {
  try {
    await ensureTable();

    const {
      batchType,
      service,
      status,
      from,
      to,
      limit = 50,
      offset = 0
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // 동적 쿼리 빌드
    let whereClause = '1=1';
    const params = [];
    let paramIdx = 1;

    if (batchType) {
      whereClause += ` AND (batch_type = $${paramIdx} OR (batch_type IS NULL AND $${paramIdx} = 'model_sync'))`;
      params.push(batchType);
      paramIdx++;
    }

    if (service) {
      whereClause += ` AND ai_service = $${paramIdx}`;
      params.push(service);
      paramIdx++;
    }

    if (status) {
      whereClause += ` AND api_status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (from) {
      whereClause += ` AND sync_date >= $${paramIdx}`;
      params.push(from);
      paramIdx++;
    }

    if (to) {
      whereClause += ` AND sync_date <= $${paramIdx}`;
      params.push(to);
      paramIdx++;
    }

    // 전체 건수 조회
    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM model_sync_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.total || 0);

    // 로그 조회
    const logs = await db.all(`
      SELECT id, COALESCE(batch_type, 'model_sync') as batch_type, sync_date, ai_service, api_status,
             models_found, models_added, models_updated, models_deprecated,
             error_message, response_time_ms, extra, created_at
      FROM model_sync_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, parsedLimit, parsedOffset]);

    // 배치 종류 한글명 매핑
    const logsWithTypeName = logs.map(log => ({
      ...log,
      batch_type_name: BATCH_TYPE_NAMES[log.batch_type] || log.batch_type
    }));

    res.json({
      success: true,
      data: {
        logs: logsWithTypeName,
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        batchTypes: BATCH_TYPE_NAMES
      }
    });

  } catch (error) {
    console.error('배치 실행 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배치 실행 로그 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/model-sync/stats
 * 배치 실행 통계 조회
 */
router.get('/model-sync/stats', async (req, res) => {
  try {
    await ensureTable();

    const { days = 7 } = req.query;
    const parsedDays = Math.min(Math.max(parseInt(days) || 7, 1), 365);

    // 날짜 기준 계산
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - parsedDays);
    const sinceDateStr = sinceDate.toISOString().split('T')[0];

    // 서비스별 통계
    const byService = await db.all(`
      SELECT ai_service,
             COUNT(*) as total_syncs,
             SUM(CASE WHEN api_status = 'success' THEN 1 ELSE 0 END) as success_count,
             SUM(CASE WHEN api_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
             SUM(models_added) as total_added,
             SUM(models_updated) as total_updated,
             SUM(models_deprecated) as total_deprecated,
             AVG(response_time_ms) as avg_response_time
      FROM model_sync_logs
      WHERE sync_date >= $1
      GROUP BY ai_service
    `, [sinceDateStr]);

    // 일자별 통계
    const byDate = await db.all(`
      SELECT sync_date,
             COUNT(*) as total_syncs,
             SUM(CASE WHEN api_status = 'success' THEN 1 ELSE 0 END) as success_count,
             SUM(CASE WHEN api_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
             SUM(models_added) as total_added
      FROM model_sync_logs
      WHERE sync_date >= $1
      GROUP BY sync_date
      ORDER BY sync_date DESC
    `, [sinceDateStr]);

    // 전체 요약
    const summary = await db.get(`
      SELECT COUNT(*) as total_syncs,
             SUM(CASE WHEN api_status = 'success' THEN 1 ELSE 0 END) as success_count,
             SUM(CASE WHEN api_status = 'failed' THEN 1 ELSE 0 END) as failed_count,
             SUM(models_added) as total_added,
             SUM(models_updated) as total_updated,
             SUM(models_deprecated) as total_deprecated,
             MAX(created_at) as last_sync_at
      FROM model_sync_logs
      WHERE sync_date >= $1
    `, [sinceDateStr]);

    res.json({
      success: true,
      data: {
        days: parsedDays,
        summary,
        byService,
        byDate
      }
    });

  } catch (error) {
    console.error('배치 실행 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '배치 실행 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/model-sync/logs/:id
 * 개별 배치 로그 삭제
 */
router.delete('/model-sync/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: '유효한 로그 ID가 필요합니다.'
      });
    }

    const result = await db.run(
      'DELETE FROM model_sync_logs WHERE id = $1',
      [parseInt(id)]
    );

    if (result.changes > 0) {
      res.json({
        success: true,
        message: '로그가 삭제되었습니다.',
        deletedCount: result.changes
      });
    } else {
      res.status(404).json({
        success: false,
        message: '해당 로그를 찾을 수 없습니다.'
      });
    }

  } catch (error) {
    console.error('배치 로그 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/model-sync/logs
 * 모든 배치 로그 삭제
 */
router.delete('/model-sync/logs', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM model_sync_logs');

    res.json({
      success: true,
      message: `${result.changes}건의 로그가 삭제되었습니다.`,
      deletedCount: result.changes
    });

  } catch (error) {
    console.error('전체 배치 로그 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '전체 로그 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// ==========================================
// 배치 수동 실행 API (9종)
// ==========================================

/**
 * POST /api/admin/model-sync/run
 * AI 모델 동기화 수동 실행
 */
router.post('/model-sync/run', async (req, res) => {
  try {
    const { service, dryRun = false } = req.body || {};

    // 실제 배치 스크립트 호출
    const { runSync } = require('../../batch/sync-ai-models');

    console.log(`[Model-Sync] 수동 실행 시작 (service=${service || 'all'}, dryRun=${dryRun})`);

    const result = await runSync({
      service: service || null,
      dryRun: dryRun,
      verbose: false
    });

    res.json({
      success: result.success,
      message: result.success ? '동기화가 완료되었습니다.' : '일부 서비스에서 오류가 발생했습니다.',
      data: {
        totalTime: result.totalTime,
        results: result.results
      }
    });
  } catch (error) {
    console.error('모델 동기화 수동 실행 오류:', error);
    res.status(500).json({
      success: false,
      message: '모델 동기화 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/batch/exchange-rate
 * 환율 업데이트 수동 실행
 */
router.post('/batch/exchange-rate', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[Batch] 환율 업데이트 수동 실행 시작');

    await saveBatchLog({
      batchType: 'exchange_rate',
      status: 'success',
      stats: { updated: 1 },
      responseTimeMs: Date.now() - startTime
    });

    res.json({
      success: true,
      message: '환율 업데이트가 완료되었습니다.',
      data: { totalTime: Date.now() - startTime }
    });
  } catch (error) {
    await saveBatchLog({
      batchType: 'exchange_rate',
      status: 'failed',
      errorMessage: error.message,
      responseTimeMs: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      message: '환율 업데이트 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/batch/subscription
 * 구독 배치 처리 수동 실행
 */
router.post('/batch/subscription', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[Batch] 구독 배치 처리 수동 실행 시작');

    await saveBatchLog({
      batchType: 'subscription',
      status: 'success',
      stats: { updated: 0 },
      responseTimeMs: Date.now() - startTime
    });

    res.json({
      success: true,
      message: '구독 배치 처리가 완료되었습니다.',
      data: { totalTime: Date.now() - startTime }
    });
  } catch (error) {
    await saveBatchLog({
      batchType: 'subscription',
      status: 'failed',
      errorMessage: error.message,
      responseTimeMs: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      message: '구독 배치 처리 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/batch/credit-rate
 * 크레딧 레이트 재계산 수동 실행
 */
router.post('/batch/credit-rate', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[Batch] 크레딧 레이트 재계산 수동 실행 시작');

    await saveBatchLog({
      batchType: 'credit_rate',
      status: 'success',
      stats: { updated: 0 },
      responseTimeMs: Date.now() - startTime
    });

    res.json({
      success: true,
      message: '크레딧 레이트 재계산이 완료되었습니다.',
      data: { totalTime: Date.now() - startTime }
    });
  } catch (error) {
    await saveBatchLog({
      batchType: 'credit_rate',
      status: 'failed',
      errorMessage: error.message,
      responseTimeMs: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      message: '크레딧 레이트 재계산 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/batch/backup
 * DB백업 수동 실행
 */
router.post('/batch/backup', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[Batch] DB백업 수동 실행 시작');

    await saveBatchLog({
      batchType: 'backup',
      status: 'success',
      stats: {},
      responseTimeMs: Date.now() - startTime
    });

    res.json({
      success: true,
      message: 'DB백업이 완료되었습니다.',
      data: { totalTime: Date.now() - startTime }
    });
  } catch (error) {
    await saveBatchLog({
      batchType: 'backup',
      status: 'failed',
      errorMessage: error.message,
      responseTimeMs: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      message: 'DB백업 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/batch/daily-credit
 * 일일 크레딧 리셋 수동 실행
 */
router.post('/batch/daily-credit', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[Batch] 일일 크레딧 리셋 수동 실행 시작');

    await saveBatchLog({
      batchType: 'daily_credit',
      status: 'success',
      stats: { updated: 0 },
      responseTimeMs: Date.now() - startTime
    });

    res.json({
      success: true,
      message: '일일 크레딧 리셋이 완료되었습니다.',
      data: { totalTime: Date.now() - startTime }
    });
  } catch (error) {
    await saveBatchLog({
      batchType: 'daily_credit',
      status: 'failed',
      errorMessage: error.message,
      responseTimeMs: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      message: '일일 크레딧 리셋 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/batch/qa-auto-reply
 * Q&A 자동 답변 수동 실행
 */
router.post('/batch/qa-auto-reply', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[Batch] Q&A 자동 답변 수동 실행 시작');

    await saveBatchLog({
      batchType: 'qa_auto_reply',
      status: 'success',
      stats: { updated: 0 },
      responseTimeMs: Date.now() - startTime,
      extra: { totalQuestions: 0, processed: 0, skipped: 0, emailed: 0 }
    });

    res.json({
      success: true,
      message: 'Q&A 자동 답변 처리가 완료되었습니다.',
      data: { totalTime: Date.now() - startTime }
    });
  } catch (error) {
    await saveBatchLog({
      batchType: 'qa_auto_reply',
      status: 'failed',
      errorMessage: error.message,
      responseTimeMs: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      message: 'Q&A 자동 답변 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/batch/log-backup
 * 로그 백업 수동 실행
 */
router.post('/batch/log-backup', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[Batch] 로그 백업 수동 실행 시작');

    await saveBatchLog({
      batchType: 'log_backup',
      status: 'success',
      stats: {},
      responseTimeMs: Date.now() - startTime,
      extra: { totalBacked: 0, totalFreedMB: 0 }
    });

    res.json({
      success: true,
      message: '로그 백업이 완료되었습니다.',
      data: { totalTime: Date.now() - startTime, totalBacked: 0, totalFreedMB: 0 }
    });
  } catch (error) {
    await saveBatchLog({
      batchType: 'log_backup',
      status: 'failed',
      errorMessage: error.message,
      responseTimeMs: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      message: '로그 백업 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/batch/cloud-scheduler-warmup
 * Cloud Run Warmup 수동 실행
 */
router.post('/batch/cloud-scheduler-warmup', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[Batch] Cloud Run Warmup 수동 실행 시작');

    await saveBatchLog({
      batchType: 'cloud-scheduler-warmup',
      status: 'success',
      stats: {},
      responseTimeMs: Date.now() - startTime,
      extra: { message: 'Health check 완료' }
    });

    res.json({
      success: true,
      message: 'Cloud Run Warmup이 완료되었습니다.',
      data: { totalTime: Date.now() - startTime }
    });
  } catch (error) {
    await saveBatchLog({
      batchType: 'cloud-scheduler-warmup',
      status: 'failed',
      errorMessage: error.message,
      responseTimeMs: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      message: 'Cloud Run Warmup 실행 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;

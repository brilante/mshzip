#!/usr/bin/env node
/**
 * AI 모델 리스트 동기화 배치 스크립트
 *
 * 사용법:
 *   node src/batch/sync-ai-models.js              # 전체 동기화
 *   node src/batch/sync-ai-models.js --service=openai    # 특정 서비스만
 *   node src/batch/sync-ai-models.js --dry-run           # 시뮬레이션 (DB 변경 없음)
 *   node src/batch/sync-ai-models.js --verbose           # 상세 로그
 *
 * 스케줄러 연동:
 *   cron.schedule('5 0 * * *', () => require('./sync-ai-models').runSync());
 */

require('dotenv').config();

// 통합 DB 모듈 (PostgreSQL)
const db = require('../db');

// ErrorLogger 서비스
const errorLogger = require('../services/errorLogger');

// API 프로바이더 모듈
const openaiProvider = require('./providers/openai');
const anthropicProvider = require('./providers/anthropic');
const googleProvider = require('./providers/google');
const xaiProvider = require('./providers/xai');

// DB 동기화 서비스
const syncService = require('./model-sync-service');

// 설정
const PROVIDERS = {
  gpt: openaiProvider,
  claude: anthropicProvider,
  gemini: googleProvider,
  grok: xaiProvider
};

const RETRY_DELAY_MS = 5 * 60 * 1000; // 5분
const MAX_RETRIES = 3;

// 커맨드라인 인자 파싱
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    service: null,
    dryRun: false,
    verbose: false
  };

  for (const arg of args) {
    if (arg.startsWith('--service=')) {
      options.service = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

/**
 * 로그 출력 (ErrorLogger 연동)
 * @param {string} level - 로그 레벨 (INFO, WARN, ERROR, DEBUG)
 * @param {string} message - 메시지
 * @param {Object} data - 추가 데이터
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  const context = { source: 'ModelSync', extra: data ? JSON.stringify(data) : null };

  // 콘솔 출력 (기존 유지)
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }

  // ErrorLogger를 통한 DB 저장
  switch (level) {
    case 'ERROR':
      errorLogger.error(fullMessage, null, context);
      break;
    case 'WARN':
    case 'WARNING':
      errorLogger.warning(fullMessage, null, context);
      break;
    case 'DEBUG':
      errorLogger.debug(fullMessage, context);
      break;
    case 'INFO':
    default:
      errorLogger.info(fullMessage, context);
      break;
  }
}

/**
 * 테이블의 컬럼 존재 여부 확인 (PostgreSQL)
 * @param {string} tableName - 테이블명
 * @param {string} columnName - 컬럼명
 * @returns {Promise<boolean>} 컬럼 존재 여부
 */
async function columnExists(tableName, columnName) {
  const result = await db.get(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?',
    ['public', tableName, columnName]
  );
  return !!result;
}

/**
 * 재시도 로직이 포함된 API 호출
 * @param {Object} provider - API 프로바이더 모듈
 * @param {number} retryCount - 현재 재시도 횟수
 * @returns {Promise<Object>} API 결과
 */
async function fetchWithRetry(provider, retryCount = 0) {
  const result = await provider.fetchModels();

  if (!result.success && retryCount < MAX_RETRIES) {
    const isRetryable = result.error &&
      (result.error.includes('Rate limited') ||
       result.error.includes('Server error') ||
       result.error.includes('Network error') ||
       result.error.includes('timeout'));

    if (isRetryable) {
      log('WARN', `${provider.SERVICE_NAME}: 재시도 ${retryCount + 1}/${MAX_RETRIES} - ${result.error}`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS / (MAX_RETRIES - retryCount)));
      return fetchWithRetry(provider, retryCount + 1);
    }
  }

  return result;
}

/**
 * 단일 서비스 동기화
 * @param {string} serviceName - 서비스명
 * @param {Object} options - 옵션
 * @returns {Promise<Object>} 동기화 결과
 */
async function syncService_Single(serviceName, options) {
  const provider = PROVIDERS[serviceName];
  if (!provider) {
    return {
      aiService: serviceName,
      status: 'failed',
      error: `Unknown service: ${serviceName}`,
      modelsFound: 0,
      modelsAdded: 0,
      modelsUpdated: 0,
      modelsDeprecated: 0,
      responseTime: 0
    };
  }

  log('INFO', `[${serviceName}] API 조회 시작...`);

  // API 호출
  const apiResult = await fetchWithRetry(provider);

  if (!apiResult.success) {
    const result = {
      syncDate: new Date().toISOString().split('T')[0],
      aiService: serviceName,
      status: 'failed',
      modelsFound: 0,
      modelsAdded: 0,
      modelsUpdated: 0,
      modelsDeprecated: 0,
      errorMessage: apiResult.error,
      responseTime: apiResult.responseTime
    };

    if (!options.dryRun) {
      await syncService.saveSyncLog(result);
    }

    log('ERROR', `[${serviceName}] API 호출 실패: ${apiResult.error}`);
    return result;
  }

  log('INFO', `[${serviceName}] ${apiResult.models.length}개 모델 조회됨 (${apiResult.responseTime}ms)`);

  if (options.verbose) {
    log('INFO', `[${serviceName}] 조회된 모델:`, apiResult.models.map((m) => m.modelName));
  }

  // DB 동기화
  let syncResult;
  if (options.dryRun) {
    log('INFO', `[${serviceName}] DRY-RUN 모드 - DB 변경 없음`);
    syncResult = {
      modelsFound: apiResult.models.length,
      modelsAdded: 0,
      modelsUpdated: 0,
      modelsDeprecated: 0,
      priceUpdates: 0
    };
  } else {
    syncResult = await syncService.syncModels(serviceName, apiResult.models);
    log('INFO', `[${serviceName}] 동기화 완료: 추가=${syncResult.modelsAdded}, 갱신=${syncResult.modelsUpdated}, deprecated=${syncResult.modelsDeprecated}`);
  }

  const result = {
    syncDate: new Date().toISOString().split('T')[0],
    aiService: serviceName,
    status: 'success',
    modelsFound: syncResult.modelsFound,
    modelsAdded: syncResult.modelsAdded,
    modelsUpdated: syncResult.modelsUpdated,
    modelsDeprecated: syncResult.modelsDeprecated,
    priceUpdates: syncResult.priceUpdates || 0,
    errorMessage: null,
    responseTime: apiResult.responseTime
  };

  if (!options.dryRun) {
    await syncService.saveSyncLog(result);
  }

  return result;
}

/**
 * 전체 동기화 실행
 * @param {Object} options - 옵션
 * @returns {Promise<Object>} 전체 동기화 결과
 */
async function runSync(options = {}) {
  const startTime = Date.now();
  log('INFO', '=== AI 모델 동기화 배치 시작 ===');

  if (options.dryRun) {
    log('INFO', 'DRY-RUN 모드 활성화');
  }

  const services = options.service
    ? [options.service]
    : Object.keys(PROVIDERS);

  const results = [];

  for (const service of services) {
    try {
      const result = await syncService_Single(service, options);
      results.push(result);
    } catch (e) {
      log('ERROR', `[${service}] 예외 발생: ${e.message}`);
      // ErrorLogger에 상세 에러 기록 (스택 트레이스 포함)
      errorLogger.error(`[ModelSync] ${service} 동기화 중 예외 발생`, e, {
        source: 'ModelSync',
        extra: JSON.stringify({ service, stack: e.stack })
      });
      results.push({
        aiService: service,
        status: 'failed',
        error: e.message,
        modelsFound: 0,
        modelsAdded: 0,
        modelsUpdated: 0,
        modelsDeprecated: 0,
        responseTime: 0
      });
    }
  }

  // 요약 출력
  const totalTime = Date.now() - startTime;
  const successCount = results.filter((r) => r.status === 'success').length;
  const failCount = results.filter((r) => r.status === 'failed').length;
  const totalAdded = results.reduce((sum, r) => sum + (r.modelsAdded || 0), 0);
  const totalUpdated = results.reduce((sum, r) => sum + (r.modelsUpdated || 0), 0);
  const totalDeprecated = results.reduce((sum, r) => sum + (r.modelsDeprecated || 0), 0);

  log('INFO', '=== 동기화 완료 ===');
  log('INFO', `총 소요시간: ${totalTime}ms`);
  log('INFO', `서비스: 성공=${successCount}, 실패=${failCount}`);
  log('INFO', `모델: 추가=${totalAdded}, 갱신=${totalUpdated}, deprecated=${totalDeprecated}`);

  return {
    success: failCount === 0,
    totalTime,
    results
  };
}

/**
 * DB 마이그레이션 확인 및 실행
 * 통합 DB API (db/index.js)를 사용하여 PostgreSQL 처리
 */
async function ensureMigration() {
  // model_sync_logs 테이블 존재 확인
  const syncLogsExists = await db.tableExists('model_sync_logs');

  if (!syncLogsExists) {
    log('INFO', '마이그레이션 실행: model_sync_logs 테이블 생성');

    await db.exec(`
      CREATE TABLE IF NOT EXISTS model_sync_logs (
        id SERIAL PRIMARY KEY,
        sync_date TEXT NOT NULL,
        ai_service TEXT NOT NULL,
        api_status TEXT NOT NULL,
        models_found INTEGER DEFAULT 0,
        models_added INTEGER DEFAULT 0,
        models_updated INTEGER DEFAULT 0,
        models_deprecated INTEGER DEFAULT 0,
        price_updates INTEGER DEFAULT 0,
        error_message TEXT,
        response_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec('CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON model_sync_logs(sync_date)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_sync_logs_service ON model_sync_logs(ai_service)');
  } else {
    // 기존 테이블에 price_updates 컬럼이 없으면 추가
    const hasPriceUpdates = await columnExists('model_sync_logs', 'price_updates');
    if (!hasPriceUpdates) {
      log('INFO', '마이그레이션 실행: price_updates 컬럼 추가');
      await db.exec('ALTER TABLE model_sync_logs ADD COLUMN price_updates INTEGER DEFAULT 0');
    }
  }

  // ai_model_pricing 테이블 존재 확인 (없으면 생성)
  const pricingExists = await db.tableExists('ai_model_pricing');
  if (!pricingExists) {
    log('INFO', '마이그레이션 실행: ai_model_pricing 테이블 생성');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ai_model_pricing (
        id SERIAL PRIMARY KEY,
        ai_service VARCHAR(50) NOT NULL,
        model_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        api_model_id TEXT,
        cost_per_1m_input REAL DEFAULT 0,
        cost_per_1m_output REAL DEFAULT 0,
        cost_per_1m_cached_input REAL DEFAULT 0,
        cost_per_1m_cache_write REAL DEFAULT 0,
        cost_per_image REAL,
        credits_per_1m_input INTEGER DEFAULT 0,
        credits_per_1m_output INTEGER DEFAULT 0,
        credits_per_image INTEGER,
        is_active INTEGER DEFAULT 1,
        is_default INTEGER DEFAULT 0,
        api_available INTEGER DEFAULT 1,
        needs_pricing INTEGER DEFAULT 0,
        last_api_check TEXT,
        deprecated_at TEXT,
        api_miss_count INTEGER DEFAULT 0,
        owned_by TEXT,
        model_created_at TEXT,
        input_token_limit INTEGER,
        output_token_limit INTEGER,
        sort_order INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ai_service, model_name)
      )
    `);
  } else {
    // 기존 테이블에 api_available 컬럼이 없으면 추가
    const hasApiAvailable = await columnExists('ai_model_pricing', 'api_available');
    if (!hasApiAvailable) {
      log('INFO', '마이그레이션 실행: ai_model_pricing 컬럼 추가');
      await db.exec('ALTER TABLE ai_model_pricing ADD COLUMN api_model_id TEXT');
      await db.exec('ALTER TABLE ai_model_pricing ADD COLUMN api_available INTEGER DEFAULT 1');
      await db.exec('ALTER TABLE ai_model_pricing ADD COLUMN needs_pricing INTEGER DEFAULT 0');
      await db.exec('ALTER TABLE ai_model_pricing ADD COLUMN last_api_check TEXT');
      await db.exec('ALTER TABLE ai_model_pricing ADD COLUMN deprecated_at TEXT');
      await db.exec('ALTER TABLE ai_model_pricing ADD COLUMN api_miss_count INTEGER DEFAULT 0');
      await db.run('UPDATE ai_model_pricing SET api_model_id = model_name WHERE api_model_id IS NULL');
    }
  }
}

// 메인 실행
async function main() {
  try {
    const options = parseArgs();

    // 마이그레이션 확인
    await ensureMigration();

    // 동기화 실행
    const result = await runSync(options);

    process.exit(result.success ? 0 : 1);
  } catch (e) {
    log('ERROR', `치명적 오류: ${e.message}`);
    errorLogger.critical(`[ModelSync] 치명적 오류 발생`, e, {
      source: 'ModelSync',
      extra: JSON.stringify({ stack: e.stack })
    });
    console.error(e);
    process.exit(1);
  }
}

// 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = {
  runSync,
  syncService_Single,
  ensureMigration
};

/**
 * AI 모델 동기화 서비스
 * DB와 API 모델 목록 비교 및 동기화 처리
 */

// ErrorLogger 서비스
const errorLogger = require('../services/errorLogger');

// 통합 DB API
const db = require('../db');

// 환경 목록 (ai_model_settings에 등록할 환경)
const ENVIRONMENTS = ['local', 'development', 'production'];

// 모델 설명 (신규 모델 등록 시 사용)
const { MODEL_DESCRIPTIONS } = require('../db/models/AIModelSettings');


/**
 * 동기화 결과 로그 저장
 * @param {Object} result - 동기화 결과
 */
async function saveSyncLog(result) {
  await db.run(`
    INSERT INTO model_sync_logs
    (sync_date, ai_service, api_status, models_found, models_added, models_updated, models_deprecated, price_updates, error_message, response_time_ms, batch_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    result.syncDate,
    result.aiService || null,
    result.status,
    result.modelsFound || 0,
    result.modelsAdded || 0,
    result.modelsUpdated || 0,
    result.modelsDeprecated || 0,
    result.priceUpdates || 0,
    result.errorMessage || null,
    result.responseTime || 0,
    result.batchType || 'model_sync'
  ]);
}

/**
 * 서비스별 기존 모델 조회
 * @param {string} aiService - 서비스명 (gpt, claude, gemini, grok)
 * @returns {Array} 기존 모델 목록
 */
async function getExistingModels(aiService) {
  return await db.all(`
    SELECT id, model_name, api_model_id, display_name, api_available,
           deprecated_at, api_miss_count, is_active
    FROM ai_model_pricing
    WHERE ai_service = ?
  `, [aiService]);
}

/**
 * 신규 모델 추가
 * 가격은 설정하지 않음 - 관리자가 수동으로 설정 (needs_pricing=1)
 * @param {string} aiService - 서비스명
 * @param {Object} model - 모델 정보
 * @param {Object} [client] - 트랜잭션 클라이언트 (선택)
 * @returns {boolean} 성공 여부
 */
async function addNewModel(aiService, model, client) {
  const c = client || db;

  const result = await c.run(`
    INSERT INTO ai_model_pricing
    (ai_service, model_name, api_model_id, display_name,
     cost_per_1m_input, cost_per_1m_output, credits_per_1m_input, credits_per_1m_output,
     cost_per_image, credits_per_image,
     billing_type, cost_per_1m_image_input, cost_per_1m_image_output, cost_per_second,
     is_active, is_default, api_available, needs_pricing, last_api_check,
     owned_by, model_created_at, input_token_limit, output_token_limit)
    VALUES (?, ?, ?, ?, 0, 0, 0, 0, NULL, NULL, 'token', 0, 0, 0, 1, 0, 1, 1, CURRENT_TIMESTAMP,
            ?, ?, ?, ?)
    ON CONFLICT(ai_service, model_name) DO NOTHING
  `, [
    aiService,
    model.modelName,
    model.apiModelId,
    model.displayName,
    model.ownedBy || null,
    model.createdAt || null,
    model.inputTokenLimit || null,
    model.outputTokenLimit || null
  ]);

  // ai_model_settings에도 3개 환경(local/development/production)에 등록
  if (result.changes > 0) {
    const description = MODEL_DESCRIPTIONS[model.modelName] || '';
    for (const env of ENVIRONMENTS) {
      await c.run(`
        INSERT INTO ai_model_settings (service, model, environment, enabled, sort_order, description)
        VALUES (?, ?, ?, 0, 0, ?)
        ON CONFLICT(service, model, environment) DO NOTHING
      `, [aiService, model.modelName, env, description]);
    }
  }

  return result.changes > 0;
}

/**
 * 기존 모델 상태 갱신 (API에서 조회됨)
 * 가격은 자동 업데이트하지 않음 - 관리자가 수동으로 설정
 * @param {number} modelId - 모델 ID
 * @param {Object} apiModel - API 모델 정보
 * @param {Object} [client] - 트랜잭션 클라이언트 (선택)
 */
async function updateModelFound(modelId, apiModel, client) {
  const c = client || db;

  // 모델 존재 확인 및 메타데이터만 업데이트 (가격 변경 없음)
  await c.run(`
    UPDATE ai_model_pricing
    SET api_available = 1,
        api_model_id = ?,
        api_miss_count = 0,
        deprecated_at = NULL,
        last_api_check = CURRENT_TIMESTAMP,
        owned_by = COALESCE(?, owned_by),
        model_created_at = COALESCE(?, model_created_at),
        input_token_limit = COALESCE(?, input_token_limit),
        output_token_limit = COALESCE(?, output_token_limit)
    WHERE id = ?
  `, [
    apiModel.apiModelId,
    apiModel.ownedBy || null,
    apiModel.createdAt || null,
    apiModel.inputTokenLimit || null,
    apiModel.outputTokenLimit || null,
    modelId
  ]);
}

/**
 * API에서 미조회된 모델 처리
 * @param {number} modelId - 모델 ID
 * @param {number} currentMissCount - 현재 미조회 횟수
 * @param {Object} [client] - 트랜잭션 클라이언트 (선택)
 * @returns {boolean} deprecated 처리 여부
 */
async function updateModelMissing(modelId, currentMissCount, client) {
  const c = client || db;
  const newMissCount = currentMissCount + 1;

  // 3일 연속 미조회 시 삭제 처리
  if (newMissCount >= 3) {
    // 모델명 먼저 조회 (삭제 전)
    const model = await c.all(
      'SELECT ai_service, model_name FROM ai_model_pricing WHERE id = ?',
      [modelId]
    );

    // ai_model_pricing에서 삭제
    await c.run('DELETE FROM ai_model_pricing WHERE id = ?', [modelId]);

    // ai_model_settings에서도 삭제
    if (model.length > 0) {
      await c.run(
        'DELETE FROM ai_model_settings WHERE service = ? AND model = ?',
        [model[0].ai_service, model[0].model_name]
      );
    }
    return true;
  } else {
    await c.run(`
      UPDATE ai_model_pricing
      SET api_miss_count = ?,
          last_api_check = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newMissCount, modelId]);
    return false;
  }
}

/**
 * 서비스별 모델 동기화 수행
 * @param {string} aiService - 서비스명
 * @param {Array} apiModels - API에서 조회된 모델 목록
 * @returns {Object} 동기화 결과
 */
async function syncModels(aiService, apiModels) {
  const existingModels = await getExistingModels(aiService);

  // API 모델을 정규화된 이름으로 맵핑
  const apiModelMap = new Map();
  for (const model of apiModels) {
    // 같은 정규화 이름이 여러 개일 수 있음 (날짜 버전)
    if (!apiModelMap.has(model.modelName)) {
      apiModelMap.set(model.modelName, model);
    }
  }

  let modelsAdded = 0;
  let modelsUpdated = 0;
  let modelsDeprecated = 0;

  // 트랜잭션 시작
  await db.transaction(async (tx) => {
    // 기존 모델 처리
    for (const existing of existingModels) {
      const apiModel = apiModelMap.get(existing.model_name);

      if (apiModel) {
        // API에서 조회됨 - 메타데이터 갱신 (가격 변경 없음)
        await updateModelFound(existing.id, apiModel, tx);
        modelsUpdated++;
        apiModelMap.delete(existing.model_name);
      } else {
        // API에서 미조회됨
        const deprecated = await updateModelMissing(existing.id, existing.api_miss_count || 0, tx);
        if (deprecated) {
          modelsDeprecated++;
        }
      }
    }

    // 신규 모델 추가 (가격 없이, needs_pricing=1)
    for (const [, model] of apiModelMap) {
      const added = await addNewModel(aiService, model, tx);
      if (added) {
        modelsAdded++;
      }
    }
  });

  return {
    modelsFound: apiModels.length,
    modelsAdded,
    modelsUpdated,
    modelsDeprecated,
    priceUpdates: 0
  };
}


/**
 * 최근 동기화 로그 조회
 * @param {number} limit - 조회 건수
 * @returns {Array} 동기화 로그
 */
async function getRecentSyncLogs(limit = 20) {
  return await db.all(`
    SELECT sync_date, ai_service, api_status, models_found,
           models_added, models_updated, models_deprecated,
           error_message, response_time_ms, created_at
    FROM model_sync_logs
    ORDER BY created_at DESC
    LIMIT ?
  `, [limit]);
}

/**
 * 오래된 동기화 로그 삭제
 * @param {number} retentionDays - 보관 일수 (기본 7일)
 * @returns {Object} 삭제 결과 { deletedCount, cutoffDate }
 */
async function deleteOldSyncLogs(retentionDays = 7) {
  // 삭제 기준일 계산 (현재 날짜 - 보관일수)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식

  try {
    // 삭제 대상 건수 먼저 확인
    const countResult = await db.get(`
      SELECT COUNT(*) as count FROM model_sync_logs
      WHERE sync_date < ?
    `, [cutoffDateStr]);
    const { count } = countResult;

    if (count === 0) {
      errorLogger.debug(`[Model-Sync-Logs] 삭제할 로그 없음 (기준일: ${cutoffDateStr})`, { source: 'ModelSyncService' });
      return { deletedCount: 0, cutoffDate: cutoffDateStr };
    }

    // 삭제 실행
    const result = await db.run(`
      DELETE FROM model_sync_logs
      WHERE sync_date < ?
    `, [cutoffDateStr]);

    errorLogger.info(`[Model-Sync-Logs] 오래된 로그 삭제 완료: ${result.changes}건 (기준일: ${cutoffDateStr}, 보관일수: ${retentionDays}일)`, { source: 'ModelSyncService' });

    return { deletedCount: result.changes, cutoffDate: cutoffDateStr };

  } catch (error) {
    errorLogger.error('[Model-Sync-Logs] 로그 삭제 오류', error, { source: 'ModelSyncService' });
    return { deletedCount: 0, cutoffDate: cutoffDateStr, error: error.message };
  }
}

/**
 * 개별 동기화 로그 삭제
 * @param {number} logId - 로그 ID
 * @param {string} environment - 환경 (local/development/production)
 * @returns {Object} 삭제 결과 { success, deletedCount }
 */
async function deleteSyncLog(logId, environment = 'local') {
  try {
    // 환경 필터링 적용 (해당 환경의 로그만 삭제 가능)
    const result = await db.run(`
      DELETE FROM model_sync_logs
      WHERE id = ? AND (environment = ? OR (environment IS NULL AND ? = 'local'))
    `, [logId, environment, environment]);

    if (result.changes > 0) {
      errorLogger.info(`[Model-Sync-Logs] 로그 삭제 완료: ID ${logId} (환경: ${environment})`, { source: 'ModelSyncService' });
      return { success: true, deletedCount: result.changes };
    } else {
      errorLogger.debug(`[Model-Sync-Logs] 삭제할 로그 없음: ID ${logId} (환경: ${environment})`, { source: 'ModelSyncService' });
      return { success: false, deletedCount: 0, error: '해당 환경에서 로그를 찾을 수 없습니다.' };
    }

  } catch (error) {
    errorLogger.error('[Model-Sync-Logs] 로그 삭제 오류', error, { source: 'ModelSyncService' });
    return { success: false, deletedCount: 0, error: error.message };
  }
}

/**
 * 모든 동기화 로그 삭제
 * @returns {Object} 삭제 결과 { success, deletedCount }
 */
async function deleteAllSyncLogs() {
  try {
    // 삭제 전 건수 확인
    const countResult = await db.get(`SELECT COUNT(*) as count FROM model_sync_logs`);
    const { count } = countResult;

    if (count === 0) {
      errorLogger.debug(`[Model-Sync-Logs] 삭제할 로그 없음`, { source: 'ModelSyncService' });
      return { success: true, deletedCount: 0 };
    }

    // 전체 삭제
    const result = await db.run(`DELETE FROM model_sync_logs`);

    errorLogger.info(`[Model-Sync-Logs] 전체 로그 삭제 완료: ${result.changes}건`, { source: 'ModelSyncService' });
    return { success: true, deletedCount: result.changes };

  } catch (error) {
    errorLogger.error('[Model-Sync-Logs] 전체 로그 삭제 오류', error, { source: 'ModelSyncService' });
    return { success: false, deletedCount: 0, error: error.message };
  }
}

module.exports = {
  saveSyncLog,
  getExistingModels,
  addNewModel,
  updateModelFound,
  updateModelMissing,
  syncModels,
  getRecentSyncLogs,
  deleteOldSyncLogs,
  deleteSyncLog,
  deleteAllSyncLogs
};

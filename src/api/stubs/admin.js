'use strict';

/**
 * 관리자 AI 모델 관리 API
 * 원본: src/api/admin/_legacy.js (ai-models 영역)
 *
 * DB 연동: ai_model_pricing, ai_model_settings, ai_service_settings
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const logger = require('../../utils/logger');
const ErrorLog = require('../../db/models/ErrorLog');
const errorLogger = require('../../services/errorLogger');

// 유효 환경 목록
const VALID_ENVIRONMENTS = ['local', 'development', 'production'];

/**
 * 서버 환경 결정 (로컬 고정, Cloud Run 감지)
 */
function determineEnvironment() {
  if (process.env.K_SERVICE) return 'production';
  const env = (process.env.APP_ENV || process.env.NODE_ENV || 'local').toLowerCase();
  if (env === 'production' || env === 'prod') return 'production';
  if (env === 'development' || env === 'dev') return 'development';
  return 'local';
}

/**
 * AIModelSettings 지연 로드 (DB 연결 후 로드 보장)
 */
let _AIModelSettings = null;
let _AIServiceSettings = null;

function getModels() {
  if (!_AIModelSettings) {
    const mod = require('../../db/models/AIModelSettings');
    _AIModelSettings = mod.AIModelSettings;
    _AIServiceSettings = mod.AIServiceSettings;
  }
  return { AIModelSettings: _AIModelSettings, AIServiceSettings: _AIServiceSettings };
}

/**
 * 모델명 정규화 (배치 동기화와 동일한 로직)
 */
function normalizeModelName(modelName) {
  return modelName.replace(/-\d{4}(-\d{2})?(-\d{2})?$/, '');
}

// ==========================================
// GET /api/admin/ai-models
// AI 서비스 및 모델 설정 조회 (DB 연동)
// ==========================================
router.get('/ai-models', async (req, res) => {
  try {
    const serverEnvironment = determineEnvironment();
    const environment = req.query.env || serverEnvironment;

    if (!VALID_ENVIRONMENTS.includes(environment)) {
      return res.status(400).json({
        success: false,
        message: `유효하지 않은 환경입니다. (${VALID_ENVIRONMENTS.join(', ')} 중 선택)`
      });
    }

    const { AIServiceSettings, AIModelSettings } = getModels();

    const services = await AIServiceSettings.getAll(environment);
    const models = await AIModelSettings.getAll(true, environment);

    // ai_model_pricing에서 가격 정보 조회
    let pricingData = [];
    try {
      pricingData = await db.all(`
        SELECT ai_service, model_name, api_model_id, is_active, cost_per_1m_input, cost_per_1m_output, cost_per_image,
               cost_per_1m_cached_input, input_token_limit, display_name,
               billing_type, cost_per_1m_image_input, cost_per_1m_image_output, cost_per_second
        FROM ai_model_pricing
      `);
    } catch (pricingErr) {
      console.error('[AI-Models] pricing query failed:', pricingErr.message);
    }

    // 비활성 모델 Set과 가격 정보 Map 생성
    const inactiveSet = new Set();
    const pricingMap = new Map();
    for (const p of pricingData) {
      const key = `${p.ai_service}:${p.model_name}`;
      if (p.is_active === 0) {
        inactiveSet.add(key);
      }
      pricingMap.set(key, {
        costPer1mInput: p.cost_per_1m_input,
        costPer1mOutput: p.cost_per_1m_output,
        costPerImage: p.cost_per_image,
        costPer1mCachedInput: p.cost_per_1m_cached_input,
        billingType: p.billing_type || 'token',
        costPer1mImageInput: p.cost_per_1m_image_input || 0,
        costPer1mImageOutput: p.cost_per_1m_image_output || 0,
        costPerSecond: p.cost_per_second || 0
      });
      // api_model_id도 키로 추가
      if (p.api_model_id && p.api_model_id !== p.model_name) {
        const apiKey = `${p.ai_service}:${p.api_model_id}`;
        if (!pricingMap.has(apiKey)) {
          pricingMap.set(apiKey, {
            costPer1mInput: p.cost_per_1m_input,
            costPer1mOutput: p.cost_per_1m_output,
            costPerImage: p.cost_per_image,
            costPer1mCachedInput: p.cost_per_1m_cached_input,
            billingType: p.billing_type || 'token',
            costPer1mImageInput: p.cost_per_1m_image_input || 0,
            costPer1mImageOutput: p.cost_per_1m_image_output || 0,
            costPerSecond: p.cost_per_second || 0
          });
        }
      }
    }

    // 가격 정보 조회 함수 (정규화된 이름으로 fallback 매칭)
    const getPricing = (service, modelName) => {
      const exactKey = `${service}:${modelName}`;
      if (pricingMap.has(exactKey)) return pricingMap.get(exactKey);
      const normalizedKey = `${service}:${normalizeModelName(modelName)}`;
      if (pricingMap.has(normalizedKey)) return pricingMap.get(normalizedKey);
      // 부분 일치
      for (const [key, pricing] of pricingMap) {
        if (key.startsWith(`${service}:`)) {
          const dbModelName = key.split(':')[1];
          if (modelName.startsWith(dbModelName)) return pricing;
        }
      }
      return null;
    };

    // 비활성 모델 필터링 및 가격 정보 추가
    const filteredModels = {};
    for (const [service, modelList] of Object.entries(models)) {
      filteredModels[service] = modelList
        .filter(m => !inactiveSet.has(`${service}:${m.model}`) && !inactiveSet.has(`${service}:${normalizeModelName(m.model)}`))
        .map(m => {
          const pricing = getPricing(service, m.model);
          return {
            ...m,
            costPer1mInput: pricing?.costPer1mInput ?? null,
            costPer1mOutput: pricing?.costPer1mOutput ?? null,
            costPerImage: pricing?.costPerImage ?? null,
            costPer1mCachedInput: pricing?.costPer1mCachedInput ?? null,
            billingType: pricing?.billingType ?? 'token',
            costPer1mImageInput: pricing?.costPer1mImageInput ?? 0,
            costPer1mImageOutput: pricing?.costPer1mImageOutput ?? 0,
            costPerSecond: pricing?.costPerSecond ?? 0
          };
        });
    }

    // pricing에 있지만 settings에 없는 모델을 비활성(unchecked)으로 추가
    for (const p of pricingData) {
      if (p.is_active === 0) continue;
      const service = p.ai_service;
      const modelName = p.model_name;
      if (!filteredModels[service]) filteredModels[service] = [];
      const exists = filteredModels[service].some(m => m.model === modelName);
      if (exists) continue;

      filteredModels[service].push({
        model: modelName,
        enabled: false,
        maxTokens: p.input_token_limit || 4096,
        description: p.display_name || '',
        sortOrder: 0,
        costPer1mInput: p.cost_per_1m_input,
        costPer1mOutput: p.cost_per_1m_output,
        costPerImage: p.cost_per_image,
        costPer1mCachedInput: p.cost_per_1m_cached_input,
        billingType: p.billing_type || 'token',
        costPer1mImageInput: p.cost_per_1m_image_input || 0,
        costPer1mImageOutput: p.cost_per_1m_image_output || 0,
        costPerSecond: p.cost_per_second || 0
      });
    }

    // 모델명 DESC 정렬
    for (const [, modelList] of Object.entries(filteredModels)) {
      modelList.sort((a, b) => b.model.localeCompare(a.model));
    }

    res.json({
      success: true,
      data: {
        currentEnvironment: environment,
        serverEnvironment: serverEnvironment,
        environments: VALID_ENVIRONMENTS,
        services,
        models: filteredModels
      }
    });

  } catch (error) {
    console.error('AI 모델 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 모델 설정 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// ==========================================
// POST /api/admin/ai-models
// AI 서비스 및 모델 설정 저장 (DB 연동)
// ==========================================
router.post('/ai-models', async (req, res) => {
  try {
    const { environment = 'local', services, models, sortOrders, pricing } = req.body;

    if (!VALID_ENVIRONMENTS.includes(environment)) {
      return res.status(400).json({
        success: false,
        message: `유효하지 않은 환경입니다. (${VALID_ENVIRONMENTS.join(', ')} 중 선택)`
      });
    }

    if (!services && !models && !pricing) {
      return res.status(400).json({
        success: false,
        message: 'services, models 또는 pricing 데이터가 필요합니다.'
      });
    }

    const { AIServiceSettings, AIModelSettings } = getModels();
    let updatedServices = 0;
    let updatedModels = 0;
    let updatedPricing = 0;

    // 서비스 설정 저장
    if (services && typeof services === 'object') {
      const enabledCount = Object.values(services).filter(v =>
        v === true || (typeof v === 'object' && v?.enabled === true)
      ).length;
      if (enabledCount === 0) {
        return res.status(400).json({
          success: false,
          message: '최소 1개의 서비스는 활성화되어야 합니다.'
        });
      }
      updatedServices = await AIServiceSettings.saveAll(services, environment);
    }

    // 모델 설정 저장
    if (models && typeof models === 'object') {
      // 가격 미설정 모델 경고
      try {
        const pricingRows = await db.all(`
          SELECT ai_service, model_name, cost_per_1m_input, cost_per_1m_output
          FROM ai_model_pricing
        `);
        const noPricingSet = new Set();
        for (const p of pricingRows) {
          if (!(p.cost_per_1m_input > 0) && !(p.cost_per_1m_output > 0)) {
            noPricingSet.add(`${p.ai_service}:${p.model_name}`);
          }
        }
        const noPricingModels = [];
        for (const [svc, svcModels] of Object.entries(models)) {
          for (const [mdl, enabled] of Object.entries(svcModels)) {
            if (enabled && noPricingSet.has(`${svc}:${mdl}`)) {
              noPricingModels.push(`${svc}/${mdl}`);
            }
          }
        }
        if (noPricingModels.length > 0) {
          console.warn(`[AI-Models] 가격 미설정 모델 활성화 경고: ${noPricingModels.join(', ')}`);
        }
      } catch (pricingErr) {
        console.error('[AI-Models] 가격 검증 실패:', pricingErr.message);
      }

      // 최소 1개 모델 활성화 검증
      let totalEnabled = 0;
      for (const serviceModels of Object.values(models)) {
        if (typeof serviceModels === 'object') {
          totalEnabled += Object.values(serviceModels).filter(v => v === true).length;
        }
      }
      if (totalEnabled === 0 && !services) {
        return res.status(400).json({
          success: false,
          message: '최소 1개의 모델은 활성화되어야 합니다.'
        });
      }

      // 정렬 순서 정규화
      if (sortOrders && typeof sortOrders === 'object') {
        const validation = AIModelSettings.validateSortOrders(sortOrders);
        if (!validation.valid) {
          for (const dup of validation.duplicates) {
            const serviceOrders = sortOrders[dup.service];
            if (serviceOrders) {
              const modelsToSort = Object.keys(serviceOrders);
              modelsToSort.sort((a, b) => (serviceOrders[a] || 0) - (serviceOrders[b] || 0));
              modelsToSort.forEach((model, idx) => {
                serviceOrders[model] = idx + 1;
              });
            }
          }
        }

        for (const [service, serviceModels] of Object.entries(models)) {
          if (!sortOrders[service]) continue;
          const enabledWithOrder = [];
          for (const [model, enabled] of Object.entries(serviceModels)) {
            if (enabled && (sortOrders[service][model] ?? 0) > 0) {
              enabledWithOrder.push({ model, sortOrder: sortOrders[service][model] });
            }
          }
          enabledWithOrder.sort((a, b) => a.sortOrder - b.sortOrder);
          enabledWithOrder.forEach((item, idx) => {
            sortOrders[service][item.model] = idx + 1;
          });
          for (const [model, enabled] of Object.entries(serviceModels)) {
            if (!enabled) {
              sortOrders[service][model] = 0;
            }
          }
        }
      }

      updatedModels = await AIModelSettings.saveAll(models, sortOrders, environment);
    }

    // 가격 정보 저장
    if (pricing && typeof pricing === 'object') {
      for (const [service, serviceModels] of Object.entries(pricing)) {
        for (const [modelName, prices] of Object.entries(serviceModels)) {
          const input = parseFloat(prices.input) || 0;
          const output = parseFloat(prices.output) || 0;
          const cachedInput = parseFloat(prices.cachedInput) || 0;
          const imageInput = parseFloat(prices.imageInput) || 0;
          const imageOutput = parseFloat(prices.imageOutput) || 0;
          const perSecond = parseFloat(prices.perSecond) || 0;
          const billingType = prices.billingType || 'token';
          await db.run(
            `UPDATE ai_model_pricing
             SET cost_per_1m_input = $1,
                 cost_per_1m_output = $2,
                 cost_per_1m_cached_input = $3,
                 cost_per_1m_image_input = $4,
                 cost_per_1m_image_output = $5,
                 cost_per_second = $6,
                 billing_type = $7,
                 updated_at = NOW()
             WHERE ai_service = $8 AND model_name = $9`,
            [input, output, cachedInput, imageInput, imageOutput, perSecond, billingType, service, modelName]
          );
          updatedPricing++;
        }
      }
      console.log(`[AI-Models] 가격 업데이트: ${updatedPricing}개 모델`);
    }

    console.log(`AI 모델 설정 저장 [${environment}]: 서비스 ${updatedServices}개, 모델 ${updatedModels}개, 가격 ${updatedPricing}개`);

    res.json({
      success: true,
      message: `AI 모델 설정이 저장되었습니다. (환경: ${environment})`,
      environment,
      updated: {
        services: updatedServices,
        models: updatedModels,
        pricing: updatedPricing
      }
    });

  } catch (error) {
    console.error('AI 모델 설정 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 모델 설정 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// ==========================================
// POST /api/admin/ai-models/sync
// AI 모델 설정을 다음 환경으로 동기화
// ==========================================
router.post('/ai-models/sync', async (req, res) => {
  try {
    const { sourceEnvironment, targetEnvironment } = req.body;
    const serverEnvironment = determineEnvironment();

    if (serverEnvironment === 'production') {
      return res.status(403).json({
        success: false,
        message: '운영 환경에서는 동기화할 수 없습니다.'
      });
    }

    if (sourceEnvironment !== serverEnvironment) {
      return res.status(400).json({
        success: false,
        message: `현재 서버(${serverEnvironment})에서만 동기화할 수 있습니다.`
      });
    }

    const { AIServiceSettings, AIModelSettings } = getModels();

    // 소스 환경에서 설정 조회
    const sourceServices = await AIServiceSettings.getAll(sourceEnvironment);
    const sourceModels = await AIModelSettings.getAll(true, sourceEnvironment);

    // 대상 환경에 설정 복사
    let syncedServices = 0;
    let syncedModels = 0;

    // 서비스 설정 복사
    const servicesObj = {};
    for (const [service, info] of Object.entries(sourceServices)) {
      servicesObj[service] = info.enabled;
    }
    syncedServices = await AIServiceSettings.saveAll(servicesObj, targetEnvironment);

    // 모델 설정 복사
    const modelsObj = {};
    const sortOrdersObj = {};
    for (const [service, modelList] of Object.entries(sourceModels)) {
      modelsObj[service] = {};
      sortOrdersObj[service] = {};
      for (const m of modelList) {
        modelsObj[service][m.model] = m.enabled;
        sortOrdersObj[service][m.model] = m.sortOrder || 0;
      }
    }
    syncedModels = await AIModelSettings.saveAll(modelsObj, sortOrdersObj, targetEnvironment);

    console.log(`[AI-Model-Sync] 완료: ${sourceEnvironment} → ${targetEnvironment} (서비스 ${syncedServices}개, 모델 ${syncedModels}개)`);

    res.json({
      success: true,
      message: `${sourceEnvironment} → ${targetEnvironment} 환경으로 설정이 복사되었습니다. (서비스 ${syncedServices}개, 모델 ${syncedModels}개)`
    });

  } catch (error) {
    console.error('AI 모델 동기화 오류:', error);
    res.status(500).json({
      success: false,
      message: 'AI 모델 동기화 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// ==========================================
// Local AI URL 관리
// ==========================================

/**
 * GET /api/admin/local-ai-url - Local AI URL 조회
 */
router.get('/local-ai-url', (req, res) => {
  res.json({
    success: true,
    data: {
      url: process.env.LOCAL_AI_URL || 'http://127.0.0.1:1234/v1/chat/completions'
    }
  });
});

/**
 * POST /api/admin/local-ai-url - Local AI URL 저장
 */
router.post('/local-ai-url', (req, res) => {
  logger.info('Local AI URL 저장');
  res.json({
    success: true,
    message: 'Local AI URL이 저장되었습니다.'
  });
});

/**
 * GET /api/admin/batch-logs/:type - 배치 실행 로그 (하위 호환용)
 * model-sync/logs와 동일 데이터를 batch_type 필터로 반환
 */
router.get('/batch-logs/:type', async (req, res) => {
  try {
    const batchType = (req.params.type || 'model_sync').replace(/-/g, '_');
    const { limit = 50, page = 1 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const parsedPage = Math.max(parseInt(page) || 1, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM model_sync_logs WHERE batch_type = $1 OR (batch_type IS NULL AND $1 = 'model_sync')`,
      [batchType]
    );
    const total = parseInt(countResult?.total || 0);

    const logs = await db.all(`
      SELECT id, COALESCE(batch_type, 'model_sync') as batch_type, sync_date, ai_service, api_status,
             models_found, models_added, models_updated, models_deprecated,
             error_message, response_time_ms, extra, created_at
      FROM model_sync_logs
      WHERE batch_type = $1 OR (batch_type IS NULL AND $1 = 'model_sync')
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [batchType, parsedLimit, offset]);

    res.json({
      success: true,
      data: { logs, total, page: parsedPage, limit: parsedLimit }
    });
  } catch (error) {
    console.error('배치 로그 조회 오류:', error.message);
    res.json({
      success: true,
      data: { logs: [], total: 0, page: 1, limit: 50 }
    });
  }
});

// ==========================================
// 에러 로그 검색/관리 API
// 원본: src/api/admin/_legacy.js (logs 영역)
// ==========================================

/**
 * GET /api/admin/logs/search
 * 에러 로그 검색 (필터 적용)
 *
 * 쿼리 파라미터:
 * - level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
 * - level_num: 로그 레벨 번호 이상 (0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR, 4=CRITICAL)
 * - source: 소스 필터 (정확히 일치)
 * - message: 메시지 검색 (부분 일치)
 * - from: 시작 날짜 (ISO 8601)
 * - to: 종료 날짜 (ISO 8601)
 * - resolved: 해결 상태 필터 (true/false)
 * - limit: 조회 개수 (기본값: 50, 최대: 500)
 * - offset: 시작 위치 (기본값: 0)
 */
router.get('/logs/search', async (req, res) => {
  try {
    const {
      level,
      level_num,
      source,
      message,
      from,
      to,
      resolved,
      limit = 50,
      offset = 0
    } = req.query;

    // 파라미터 검증
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // 필터 객체 구성
    const filters = {};

    if (level) {
      const validLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
      if (validLevels.includes(level.toUpperCase())) {
        filters.level = level.toUpperCase();
      }
    }

    if (level_num !== undefined) {
      const parsedLevelNum = parseInt(level_num);
      if (!isNaN(parsedLevelNum) && parsedLevelNum >= 0 && parsedLevelNum <= 3) {
        filters.level_num = parsedLevelNum;
      }
    }

    if (source) {
      filters.source = source;
    }

    if (from) {
      filters.start_date = from;
    }

    if (to) {
      filters.end_date = to;
    }

    if (resolved !== undefined) {
      filters.is_resolved = resolved === 'true' || resolved === true;
    }

    // 로그 검색 (message 필터링을 위해 여유있게 조회)
    let logs = await ErrorLog.search(filters, parsedLimit * 2, parsedOffset);

    // message 필터링 (부분 일치)
    if (message) {
      const searchTerm = message.toLowerCase();
      logs = logs.filter(log =>
        log.message && log.message.toLowerCase().includes(searchTerm)
      );
    }

    // 요청한 limit만큼만 반환
    logs = logs.slice(0, parsedLimit);

    // 전체 개수 조회 (페이지네이션용)
    const total = await ErrorLog.count(filters, message || null);

    res.json({
      success: true,
      data: {
        logs: logs,
        total: total,
        limit: parsedLimit,
        offset: parsedOffset
      }
    });

  } catch (error) {
    errorLogger.error('관리자 로그 검색 실패', error, {
      source: 'api.admin.logsSearch',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { level: req.query?.level, source: req.query?.source }
    });
    console.error('로그 검색 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그 검색 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/logs/stats
 * 로그 통계 조회
 *
 * 쿼리 파라미터:
 * - days: 조회 기간 (기본값: 7)
 */
router.get('/logs/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // 파라미터 검증 (1~365일)
    const parsedDays = Math.min(Math.max(parseInt(days) || 7, 1), 365);

    // 통계 조회
    const stats = await ErrorLog.getStats(parsedDays);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    errorLogger.error('관리자 로그 통계 조회 실패', error, {
      source: 'api.admin.logsStats',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { days: req.query?.days }
    });
    console.error('로그 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/logs/:errorId
 * 로그 상세 조회
 */
router.get('/logs/:errorId', async (req, res) => {
  try {
    const { errorId } = req.params;

    if (!errorId) {
      return res.status(400).json({
        success: false,
        message: 'errorId가 필요합니다.'
      });
    }

    const log = await ErrorLog.findById(errorId);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: '해당 로그를 찾을 수 없습니다.'
      });
    }

    // extra 필드 JSON 파싱
    if (log.extra) {
      try {
        log.extra = JSON.parse(log.extra);
      } catch (e) {
        // JSON 파싱 실패 시 원본 유지
      }
    }

    res.json({
      success: true,
      data: log
    });

  } catch (error) {
    errorLogger.error('관리자 로그 상세 조회 실패', error, {
      source: 'api.admin.logsDetail',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { errorId: req.params?.errorId }
    });
    console.error('로그 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/logs/delete
 * 로그 삭제 (필터 조건에 맞는 로그 삭제, 필터 없으면 전체 삭제)
 *
 * 쿼리 파라미터:
 * - level: 로그 레벨 (CRITICAL, ERROR, WARNING, INFO)
 * - from: 시작 날짜 (YYYY-MM-DD)
 * - to: 종료 날짜 (YYYY-MM-DD)
 * - source: 소스 필터
 * - message: 메시지 검색어
 * - resolved: 해결 상태 (true/false)
 */
router.delete('/logs/delete', async (req, res) => {
  try {
    const { level, from, to, source, message, resolved } = req.query;

    // WHERE 조건 구성
    let conditions = [];
    let params = [];

    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }

    if (from) {
      conditions.push('date(created_at) >= date(?)');
      params.push(from);
    }

    if (to) {
      conditions.push('date(created_at) <= date(?)');
      params.push(to);
    }

    if (source) {
      conditions.push('source LIKE ?');
      params.push(`%${source}%`);
    }

    if (message) {
      conditions.push('message LIKE ?');
      params.push(`%${message}%`);
    }

    if (resolved !== undefined && resolved !== '') {
      conditions.push('is_resolved = ?');
      params.push(resolved === 'true' ? 1 : 0);
    }

    // SQL 쿼리 구성
    let sql = 'DELETE FROM error_logs';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // 삭제 실행
    const result = await db.run(sql, params);

    const deletedCount = result?.changes || 0;

    console.log(`[Admin] 로그 삭제 완료: ${deletedCount}건 삭제됨`);

    res.json({
      success: true,
      deletedCount: deletedCount,
      message: `${deletedCount}건의 로그가 삭제되었습니다.`
    });

  } catch (error) {
    errorLogger.error('관리자 로그 삭제 실패', error, {
      source: 'api.admin.logsDelete',
      userId: req.session?.userId,
      requestPath: req.originalUrl
    });
    console.error('로그 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * PATCH /api/admin/logs/:errorId/resolve
 * 로그 해결 상태 변경
 *
 * 요청 본문:
 * - resolved: 해결 여부 (true/false)
 */
router.patch('/logs/:errorId/resolve', async (req, res) => {
  try {
    const { errorId } = req.params;
    const { resolved } = req.body;

    if (!errorId) {
      return res.status(400).json({
        success: false,
        message: 'errorId가 필요합니다.'
      });
    }

    if (resolved === undefined) {
      return res.status(400).json({
        success: false,
        message: 'resolved 값이 필요합니다.'
      });
    }

    // 로그 존재 확인
    const log = await ErrorLog.findById(errorId);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '해당 로그를 찾을 수 없습니다.'
      });
    }

    // 해결 상태 변경
    const changes = await ErrorLog.setResolved(errorId, resolved);

    if (changes > 0) {
      console.log(`로그 상태 변경: ${errorId} → ${resolved ? '해결됨' : '미해결'}`);

      res.json({
        success: true,
        message: '로그 상태가 업데이트되었습니다.',
        data: {
          errorId: errorId,
          resolved: resolved
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: '로그 상태 변경에 실패했습니다.'
      });
    }

  } catch (error) {
    errorLogger.error('관리자 로그 상태 변경 실패', error, {
      source: 'api.admin.logsResolve',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { errorId: req.params?.errorId, resolved: req.body?.resolved }
    });
    console.error('로그 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그 상태 변경 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// ==========================================
// 기능 설정 API (Feature Settings)
// 원본: src/api/admin/_legacy.js (feature-settings 영역)
// ==========================================

/**
 * FeatureSettings 지연 로드 (DB 연결 후 로드 보장)
 */
let _FeatureSettings = null;

function getFeatureSettings() {
  if (!_FeatureSettings) {
    _FeatureSettings = require('../../db/models/FeatureSettings');
  }
  return _FeatureSettings;
}

/**
 * GET /api/admin/feature-settings
 * 기능 설정 조회
 *
 * Query Parameters:
 * - env: 환경 (local/development/production), 생략 시 모든 환경 조회
 *
 * Response:
 * - data: 설정 데이터
 * - serverEnv: 현재 서버 환경 (local/development/production)
 */
router.get('/feature-settings', async (req, res) => {
  try {
    const environment = req.query.env;
    const serverEnv = determineEnvironment();
    const FeatureSettings = getFeatureSettings();

    if (environment) {
      // 특정 환경만 조회
      if (!VALID_ENVIRONMENTS.includes(environment)) {
        return res.status(400).json({
          success: false,
          message: `유효하지 않은 환경입니다. (${VALID_ENVIRONMENTS.join(', ')} 중 선택)`
        });
      }
      const settings = await FeatureSettings.getAll(environment);
      res.json({
        success: true,
        data: {
          environment,
          settings
        },
        serverEnv
      });
    } else {
      // 모든 환경 조회
      const allSettings = await FeatureSettings.getAllEnvironments();
      res.json({
        success: true,
        data: allSettings,
        serverEnv
      });
    }

  } catch (error) {
    console.error('[Feature-Settings] 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '기능 설정 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/feature-settings
 * 기능 설정 저장
 *
 * 요청 본문:
 * - environment: 환경 (필수)
 * - settings: { enablePpt: boolean, enablePdf: boolean }
 * 또는
 * - allSettings: { local: {...}, development: {...}, production: {...} }
 */
router.post('/feature-settings', async (req, res) => {
  try {
    const { environment, settings, allSettings } = req.body;
    const FeatureSettings = getFeatureSettings();

    if (allSettings) {
      // 모든 환경 한 번에 저장
      const updated = await FeatureSettings.saveAll(allSettings);
      console.log(`기능 설정 저장 [전체]: ${updated}개 항목`);
      res.json({
        success: true,
        message: '모든 환경의 기능 설정이 저장되었습니다.',
        updated
      });
    } else if (environment && settings) {
      // 특정 환경만 저장
      if (!VALID_ENVIRONMENTS.includes(environment)) {
        return res.status(400).json({
          success: false,
          message: `유효하지 않은 환경입니다. (${VALID_ENVIRONMENTS.join(', ')} 중 선택)`
        });
      }
      const updated = await FeatureSettings.save(environment, settings);
      console.log(`기능 설정 저장 [${environment}]: ${updated}개 항목`);
      res.json({
        success: true,
        message: `${environment} 환경의 기능 설정이 저장되었습니다.`,
        environment,
        updated
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'environment와 settings, 또는 allSettings가 필요합니다.'
      });
    }

  } catch (error) {
    console.error('[Feature-Settings] 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '기능 설정 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/feature-settings
 * 기능 설정 초기화 (기본값 복원)
 *
 * Query Parameters:
 * - env: 환경 (생략 시 모든 환경 초기화)
 */
router.delete('/feature-settings', async (req, res) => {
  try {
    const environment = req.query.env || null;
    const FeatureSettings = getFeatureSettings();

    if (environment && !VALID_ENVIRONMENTS.includes(environment)) {
      return res.status(400).json({
        success: false,
        message: `유효하지 않은 환경입니다. (${VALID_ENVIRONMENTS.join(', ')} 중 선택)`
      });
    }

    await FeatureSettings.reset(environment);

    const envMessage = environment
      ? `${environment} 환경의 기능 설정이`
      : '모든 환경의 기능 설정이';

    console.log(`기능 설정 초기화 완료${environment ? ` [${environment}]` : ' [전체]'}`);

    res.json({
      success: true,
      message: `${envMessage} 기본값으로 복원되었습니다.`,
      environment: environment || 'all'
    });

  } catch (error) {
    console.error('[Feature-Settings] 초기화 오류:', error);
    res.status(500).json({
      success: false,
      message: '기능 설정 초기화 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;

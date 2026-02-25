'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * GET /api/credits/models - AI 모델 목록 (DB 동적 로드)
 * 2026-02-25: 하드코딩 제거, AIModelSettings DB 기반으로 전환
 */
router.get('/models', async (req, res) => {
  try {
    const { AIModelSettings, AIServiceSettings, MODEL_MAX_TOKENS, getServiceFromModel, generateDisplayName }
      = require('../../db/models/AIModelSettings');

    const environment = process.env.APP_ENV || 'local';

    const [allModels, services] = await Promise.all([
      AIModelSettings.getAll(false, environment),
      AIServiceSettings.getAll(environment)
    ]);

    // 활성화된 서비스 필터링
    const enabledServices = Object.entries(services)
      .filter(([, info]) => info.enabled)
      .map(([name]) => name);

    // 프론트엔드 기대 형식으로 변환
    const models = {};
    let totalCount = 0;

    for (const service of enabledServices) {
      const serviceModels = allModels[service];
      if (!serviceModels || serviceModels.length === 0) continue;

      models[service] = serviceModels
        .filter(m => m.enabled)
        .map((m, idx) => ({
          model: m.model,
          displayName: generateDisplayName(m.model),
          costInput: 0,
          costOutput: 0,
          creditsInput: 1,
          creditsOutput: 2,
          isDefault: idx === 0
        }));

      totalCount += models[service].length;
    }

    // DB 비어있는 경우 MODEL_MAX_TOKENS fallback
    if (totalCount === 0) {
      logger.warn('모델 목록 비어있음 - MODEL_MAX_TOKENS fallback 사용');
      for (const modelName of Object.keys(MODEL_MAX_TOKENS)) {
        const svc = getServiceFromModel(modelName);
        if (!models[svc]) models[svc] = [];
        models[svc].push({
          model: modelName,
          displayName: generateDisplayName(modelName),
          costInput: 0,
          costOutput: 0,
          creditsInput: 1,
          creditsOutput: 2,
          isDefault: models[svc].length === 0
        });
        totalCount++;
      }
    }

    logger.info(`모델 목록 응답: ${totalCount}개 모델, ${Object.keys(models).length}개 서비스`);

    res.json({
      success: true,
      data: {
        models,
        enabledServices: Object.keys(models),
        count: totalCount,
        environment
      }
    });
  } catch (error) {
    logger.error('모델 목록 조회 실패:', error.message);
    // DB 오류 시 최소 fallback
    res.json({
      success: true,
      data: {
        models: {
          gpt: [{ model: 'gpt-4o-mini', displayName: 'GPT-4o Mini', costInput: 0.15, costOutput: 0.6, creditsInput: 1, creditsOutput: 2, isDefault: true }]
        },
        enabledServices: ['gpt'],
        count: 1,
        environment: 'local'
      }
    });
  }
});

/**
 * GET /api/credits/balance - 크레딧 잔액 (스텁)
 */
router.get('/balance', (req, res) => {
  res.json({
    success: true,
    data: { balance: 99999, currency: 'credits' }
  });
});

module.exports = router;

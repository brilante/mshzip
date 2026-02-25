'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * MODEL_DESCRIPTIONS 태그 기반으로 input/output 타입 추론
 * @param {string} modelName - 모델명
 * @param {string} description - MODEL_DESCRIPTIONS 설명
 * @returns {{ input: string[], output: string[] }}
 */
function inferCapabilities(modelName, description) {
  const desc = (description || '').toLowerCase();

  const caps = {
    input: ['text'],
    output: ['text']
  };

  // 이미지 생성 모델
  if (desc.includes('[이미지생성]') || modelName.includes('image') || modelName.startsWith('dall-e') || modelName.startsWith('imagen')) {
    caps.input = ['text', 'image'];
    caps.output = ['text', 'image'];
    return caps;
  }

  // 멀티모달/비전 모델
  if (desc.includes('[멀티모달]') || desc.includes('[비전]')) {
    caps.input = ['text', 'image'];
  }

  // 오디오 모델
  if (desc.includes('[오디오]') || modelName.includes('tts') || modelName.includes('audio')) {
    if (!caps.input.includes('audio')) caps.input.push('audio');
    if (!caps.output.includes('audio')) caps.output.push('audio');
  }

  // 임베딩 모델
  if (desc.includes('[임베딩]') || modelName.includes('embedding')) {
    caps.input = ['text'];
    caps.output = ['vector'];
  }

  return caps;
}

/**
 * GET /api/ai/capabilities - AI 기능 목록 (DB 동적 로드)
 * 2026-02-25: 하드코딩 제거, DB + inferCapabilities 기반으로 전환
 */
router.get('/capabilities', async (req, res) => {
  try {
    const { AIModelSettings, AIServiceSettings, MODEL_MAX_TOKENS, MODEL_DESCRIPTIONS, getServiceFromModel }
      = require('../../db/models/AIModelSettings');

    const environment = process.env.APP_ENV || 'local';

    const [allModels, services] = await Promise.all([
      AIModelSettings.getAll(false, environment),
      AIServiceSettings.getAll(environment)
    ]);

    const enabledServices = Object.entries(services)
      .filter(([, info]) => info.enabled)
      .map(([name]) => name);

    const data = {};
    const pricing = {};

    for (const service of enabledServices) {
      const serviceModels = allModels[service];
      if (!serviceModels || serviceModels.length === 0) continue;

      data[service] = {};
      pricing[service] = {};

      for (const m of serviceModels.filter(m => m.enabled)) {
        const desc = m.description || MODEL_DESCRIPTIONS[m.model] || '';
        const caps = inferCapabilities(m.model, desc);

        data[service][m.model] = {
          input: caps.input,
          output: caps.output,
          inputIcons: caps.input.join(','),
          outputIcons: caps.output.join(','),
          maxTokens: MODEL_MAX_TOKENS[m.model] || m.maxTokens || 4096,
          description: desc
        };

        pricing[service][m.model] = {
          inputCost: 0,
          outputCost: 0,
          cachedCost: 0
        };
      }
    }

    // DB 비어있는 경우 fallback
    if (Object.keys(data).length === 0) {
      logger.warn('capabilities 비어있음 - MODEL_MAX_TOKENS fallback');
      for (const [modelName, maxTokens] of Object.entries(MODEL_MAX_TOKENS)) {
        const svc = getServiceFromModel(modelName);
        if (!data[svc]) { data[svc] = {}; pricing[svc] = {}; }
        const desc = MODEL_DESCRIPTIONS[modelName] || '';
        const caps = inferCapabilities(modelName, desc);
        data[svc][modelName] = {
          input: caps.input, output: caps.output,
          inputIcons: caps.input.join(','), outputIcons: caps.output.join(','),
          maxTokens, description: desc
        };
        pricing[svc][modelName] = { inputCost: 0, outputCost: 0, cachedCost: 0 };
      }
    }

    const modelCount = Object.values(data).reduce((sum, svc) => sum + Object.keys(svc).length, 0);
    logger.info(`AI capabilities 응답: ${modelCount}개 모델`);

    res.json({ success: true, data, pricing });
  } catch (error) {
    logger.error('AI capabilities 조회 실패:', error.message);
    res.json({
      success: true,
      data: { gpt: { 'gpt-4o-mini': { input: ['text', 'image'], output: ['text'], inputIcons: 'text,image', outputIcons: 'text', maxTokens: 128000, description: '빠르고 효율적인 GPT 모델' } } },
      pricing: { gpt: { 'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6, cachedCost: 0.075 } } }
    });
  }
});

/**
 * GET /api/ai/recommendations - AI 모델 추천 정보 (스텁)
 */
router.get('/recommendations', (req, res) => {
  logger.info('AI 추천 정보 요청 (스텁)');
  res.json({
    success: true,
    data: {
      recommendations: {
        openai: {
          best_performance: { model: 'gpt-4o', display_name: 'GPT-4o', reason: '최신 플래그십 멀티모달 모델' },
          best_value: { model: 'gpt-4o-mini', display_name: 'GPT-4o Mini', reason: '뛰어난 가성비' }
        },
        xai: {
          best_performance: { model: 'grok-3', display_name: 'Grok-3', reason: '최신 플래그십 모델' },
          best_value: { model: 'grok-2', display_name: 'Grok-2', reason: '범용 모델' }
        },
        anthropic: {
          best_performance: { model: 'claude-sonnet-4-5', display_name: 'Claude Sonnet 4.5', reason: '균형 잡힌 고성능 모델' },
          best_value: { model: 'claude-haiku-4-5', display_name: 'Claude Haiku 4.5', reason: '빠르고 효율적인 경량 모델' }
        },
        google: {
          best_performance: { model: 'gemini-2.5-pro', display_name: 'Gemini 2.5 Pro', reason: '최고 성능 멀티모달 모델' },
          best_value: { model: 'gemini-2.0-flash', display_name: 'Gemini 2.0 Flash', reason: '뛰어난 가성비' }
        }
      },
      generated_at: new Date().toISOString(),
      excluded_services: []
    }
  });
});

module.exports = router;

'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * MODEL_DESCRIPTIONS 태그 + 모델 패밀리 기반으로 input/output 타입 추론
 * 2026-02-26: 태그 전용 → 태그+모델명 하이브리드 방식으로 개선
 * @param {string} modelName - 모델명
 * @param {string} description - MODEL_DESCRIPTIONS 설명
 * @returns {{ input: string[], output: string[] }}
 */
function inferCapabilities(modelName, description) {
  const desc = (description || '').toLowerCase();
  const m = modelName.toLowerCase();

  const caps = {
    input: ['text'],
    output: ['text']
  };

  // === Early Return 구간 (특수 모델) ===

  // 임베딩 모델
  if (desc.includes('[임베딩]') || m.includes('embedding')) {
    return { input: ['text'], output: ['vector'] };
  }

  // OpenAI TTS 모델 (text→audio)
  if (m.startsWith('gpt-') && m.includes('-tts')) {
    return { input: ['text'], output: ['audio'] };
  }

  // 음성→텍스트(STT) 모델 (audio→text)
  if (m.includes('transcribe') || m.includes('diarize')) {
    return { input: ['audio'], output: ['text'] };
  }

  // 이미지 생성 모델
  if (desc.includes('[이미지생성]') || m.includes('image') || m.startsWith('dall-e') || m.startsWith('imagen')) {
    return { input: ['text', 'image'], output: ['text', 'image'] };
  }

  // 비디오 생성 모델
  if (desc.includes('[비디오생성]') || m === 'grok-imagine-video') {
    return { input: ['text', 'image'], output: ['video'] };
  }

  // === 태그 기반 멀티모달 감지 ===

  if (desc.includes('[멀티모달]') || desc.includes('[비전]')) {
    caps.input = ['text', 'image'];
  }

  // === 모델 패밀리 기반 이미지 입력 보정 ===

  // Claude 3+ 전체 (비전 기본 지원)
  if (m.startsWith('claude-') && !m.includes('claude-2') && !caps.input.includes('image')) {
    caps.input.push('image');
  }
  // GPT-4 Turbo (비전 지원)
  if (m.startsWith('gpt-4-turbo') && !caps.input.includes('image')) {
    caps.input.push('image');
  }
  // GPT-4.1/4o/5 시리즈 (비전 지원)
  if ((m.startsWith('gpt-4.1') || m.startsWith('gpt-4o') || m.startsWith('gpt-5')) && !caps.input.includes('image')) {
    caps.input.push('image');
  }
  // o-시리즈 추론 모델 (o1/o3/o4 비전 지원)
  if ((m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4')) && !caps.input.includes('image')) {
    caps.input.push('image');
  }
  // Grok 4+ (비전 지원)
  if (m.startsWith('grok-4') && !caps.input.includes('image')) {
    caps.input.push('image');
  }
  // Computer Use 모델 (스크린샷 입력)
  if (m.includes('computer-use') && !caps.input.includes('image')) {
    caps.input.push('image');
  }

  // === Gemini 2.0+ 네이티브 멀티모달 ===
  if (m.startsWith('gemini-') && !m.includes('-image')) {
    const versionMatch = m.match(/gemini-(\d+)/);
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1]);
      if (majorVersion >= 2) {
        // 모든 Gemini 2.0+ → 이미지 입력 지원
        if (!caps.input.includes('image')) caps.input.push('image');
        // -lite, -tts 제외하고 오디오/비디오 입력도 지원
        if (!m.includes('-lite') && !m.includes('-tts')) {
          if (!caps.input.includes('audio')) caps.input.push('audio');
          if (!caps.input.includes('video')) caps.input.push('video');
        }
      }
    }
  }

  // === 오디오 모델 (Gemini TTS 등, OpenAI TTS는 상단에서 처리) ===
  if (desc.includes('[오디오]') || (m.includes('tts') && !m.startsWith('gpt-')) || m.includes('audio')) {
    if (!caps.input.includes('audio')) caps.input.push('audio');
    if (!caps.output.includes('audio')) caps.output.push('audio');
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
    const db = require('../../db');

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

    // DB에서 가격 정보 조회
    let pricingRows = [];
    try {
      pricingRows = await db.all(`
        SELECT ai_service, model_name,
               cost_per_1m_input, cost_per_1m_output, cost_per_1m_cached_input,
               billing_type, cost_per_1m_image_input, cost_per_1m_image_output, cost_per_second
        FROM ai_model_pricing
        WHERE is_active = 1
        ORDER BY ai_service, model_name
      `);
    } catch (e) {
      logger.warn('ai_model_pricing 테이블 조회 실패:', e.message);
    }

    // 가격 데이터 맵 구성
    const pricingMap = {};
    for (const row of pricingRows) {
      if (!pricingMap[row.ai_service]) pricingMap[row.ai_service] = {};
      pricingMap[row.ai_service][row.model_name] = {
        inputCost: row.cost_per_1m_input || 0,
        outputCost: row.cost_per_1m_output || 0,
        cachedCost: row.cost_per_1m_cached_input || 0,
        billingType: row.billing_type || 'token',
        imageInputCost: row.cost_per_1m_image_input || 0,
        imageOutputCost: row.cost_per_1m_image_output || 0,
        perSecondCost: row.cost_per_second || 0
      };
    }

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

        // DB 가격 데이터 사용, 없으면 0
        const dbPricing = pricingMap[service] && pricingMap[service][m.model];
        pricing[service][m.model] = dbPricing || {
          inputCost: 0,
          outputCost: 0,
          cachedCost: 0,
          billingType: 'token',
          imageInputCost: 0,
          imageOutputCost: 0,
          perSecondCost: 0
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
        const dbPricing = pricingMap[svc] && pricingMap[svc][modelName];
        pricing[svc][modelName] = dbPricing || { inputCost: 0, outputCost: 0, cachedCost: 0 };
      }
    }

    const modelCount = Object.values(data).reduce((sum, svc) => sum + Object.keys(svc).length, 0);
    logger.info(`AI capabilities 응답: ${modelCount}개 모델 (가격 데이터: ${pricingRows.length}건)`);

    res.json({ success: true, data, pricing });
  } catch (error) {
    logger.error('AI capabilities 조회 실패:', error.message);
    res.json({
      success: true,
      data: { gpt: { 'gpt-4o-mini': { input: ['text', 'image'], output: ['text'], inputIcons: 'text,image', outputIcons: 'text', maxTokens: 128000, description: '빠르고 효율적인 GPT 모델' } } },
      pricing: { gpt: { 'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6, cachedCost: 0.075, billingType: 'token', imageInputCost: 0, imageOutputCost: 0, perSecondCost: 0 } } }
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

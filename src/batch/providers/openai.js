/**
 * OpenAI 모델 목록 API 호출 모듈
 * GET https://api.openai.com/v1/models
 *
 * 가격 정보 출처: https://openai.com/api/pricing/
 * 마지막 업데이트: 2026-01-06
 *
 * Fallback: MODEL_PRICING에 없는 모델은 aimodel/gpt-pricing.json에서 로드
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Fallback 가격 파일 경로
const FALLBACK_PRICING_PATH = path.join(__dirname, '..', '..', '..', 'aimodel', 'gpt-pricing.json');

// Fallback 가격 정보 캐시
let fallbackPricingCache = null;
let fallbackPricingLoaded = false;

const OPENAI_API_URL = 'https://api.openai.com/v1/models';
const TIMEOUT_MS = 30000;

// 포함할 모델 패턴
const INCLUDE_PATTERNS = [
  /^gpt-/,
  /^o1/,
  /^o3/,
  /^o4/
];

// 제외할 모델 패턴
const EXCLUDE_PATTERNS = [
  /-embedding/i,
  /^whisper/i,
  /^tts/i,
  /^dall-e/i,
  /-realtime/i,
  /-audio/i
];

/**
 * 모델별 가격 정보 (USD per 1M tokens)
 * 정규화된 모델명 기준
 */
const MODEL_PRICING = {
  // GPT-5 시리즈 (cachedInput: cached input per 1M tokens)
  'gpt-5': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5-mini': { input: 0.25, cachedInput: 0.125, output: 2.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5-nano': { input: 0.05, cachedInput: 0.025, output: 0.4, inputLimit: 400000, outputLimit: 16384 },
  'gpt-5-pro': { input: 15.0, cachedInput: 7.5, output: 120.0, inputLimit: 400000, outputLimit: 65536 },
  'gpt-5-codex': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5-chat-latest': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5-search-api': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5.1': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5.1-chat-latest': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5.1-codex': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5.1-codex-mini': { input: 0.25, cachedInput: 0.125, output: 2.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5.1-codex-max': { input: 15.0, cachedInput: 7.5, output: 120.0, inputLimit: 400000, outputLimit: 65536 },
  'gpt-5.2': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },
  'gpt-5.2-pro': { input: 15.0, cachedInput: 7.5, output: 120.0, inputLimit: 400000, outputLimit: 65536 },
  'gpt-5.2-chat-latest': { input: 1.25, cachedInput: 0.625, output: 10.0, inputLimit: 400000, outputLimit: 32768 },

  // GPT-4.1 시리즈
  'gpt-4.1': { input: 2.0, cachedInput: 0.5, output: 8.0, inputLimit: 1047000, outputLimit: 32768 },
  'gpt-4.1-mini': { input: 0.4, cachedInput: 0.1, output: 1.6, inputLimit: 1047000, outputLimit: 32768 },
  'gpt-4.1-nano': { input: 0.1, cachedInput: 0.025, output: 0.4, inputLimit: 1047000, outputLimit: 16384 },

  // GPT-4o 시리즈
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10.0, inputLimit: 128000, outputLimit: 16384 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6, inputLimit: 128000, outputLimit: 16384 },
  'gpt-4o-search-preview': { input: 2.5, cachedInput: 1.25, output: 10.0, inputLimit: 128000, outputLimit: 16384 },
  'gpt-4o-mini-search-preview': { input: 0.15, cachedInput: 0.075, output: 0.6, inputLimit: 128000, outputLimit: 16384 },
  'gpt-4o-transcribe': { input: 2.5, cachedInput: 1.25, output: 10.0, inputLimit: 128000, outputLimit: 16384 },
  'gpt-4o-mini-transcribe': { input: 0.15, cachedInput: 0.075, output: 0.6, inputLimit: 128000, outputLimit: 16384 },
  'gpt-4o-transcribe-diarize': { input: 2.5, cachedInput: 1.25, output: 10.0, inputLimit: 128000, outputLimit: 16384 },
  'gpt-4o-mini-tts': { input: 0.15, cachedInput: 0.075, output: 0.6, inputLimit: 128000, outputLimit: 16384 },
  'chatgpt-4o-latest': { input: 2.5, cachedInput: 1.25, output: 10.0, inputLimit: 128000, outputLimit: 16384 },

  // 에이전트/특수 모델
  'computer-use-preview': { input: 3.0, cachedInput: 1.5, output: 15.0, inputLimit: 128000, outputLimit: 16384 },

  // GPT-4 시리즈 (레거시)
  'gpt-4-turbo': { input: 10.0, cachedInput: 5.0, output: 30.0, inputLimit: 128000, outputLimit: 4096 },
  'gpt-4-turbo-preview': { input: 10.0, cachedInput: 5.0, output: 30.0, inputLimit: 128000, outputLimit: 4096 },
  'gpt-4': { input: 30.0, cachedInput: 15.0, output: 60.0, inputLimit: 8192, outputLimit: 4096 },
  'gpt-4-0125-preview': { input: 10.0, cachedInput: 5.0, output: 30.0, inputLimit: 128000, outputLimit: 4096 },
  'gpt-4-1106-preview': { input: 10.0, cachedInput: 5.0, output: 30.0, inputLimit: 128000, outputLimit: 4096 },

  // GPT-3.5 시리즈 (레거시)
  'gpt-3.5-turbo': { input: 0.5, cachedInput: 0.25, output: 1.5, inputLimit: 16385, outputLimit: 4096 },
  'gpt-3.5-turbo-16k': { input: 3.0, cachedInput: 1.5, output: 4.0, inputLimit: 16385, outputLimit: 4096 },
  'gpt-3.5-turbo-instruct': { input: 1.5, cachedInput: 0.75, output: 2.0, inputLimit: 4096, outputLimit: 4096 },

  // GPT Image 시리즈 (이미지 생성 모델 - 이미지당 가격)
  // pricePerImage: USD per image (1024x1024 기준)
  'gpt-image-1': { input: 0.0, cachedInput: 0.0, output: 0.0, inputLimit: 4096, outputLimit: 1024, pricePerImage: 0.040 },
  'gpt-image-1-mini': { input: 0.0, cachedInput: 0.0, output: 0.0, inputLimit: 4096, outputLimit: 1024, pricePerImage: 0.020 },
  'gpt-image-1.5': { input: 0.0, cachedInput: 0.0, output: 0.0, inputLimit: 4096, outputLimit: 1024, pricePerImage: 0.080 },

  // o1 시리즈 (Reasoning)
  'o1': { input: 15.0, cachedInput: 7.5, output: 60.0, inputLimit: 200000, outputLimit: 100000 },
  'o1-mini': { input: 1.1, cachedInput: 0.55, output: 4.4, inputLimit: 128000, outputLimit: 65536 },
  'o1-pro': { input: 150.0, cachedInput: 75.0, output: 600.0, inputLimit: 200000, outputLimit: 100000 },
  'o1-preview': { input: 15.0, cachedInput: 7.5, output: 60.0, inputLimit: 128000, outputLimit: 32768 },

  // o3 시리즈
  'o3': { input: 2.0, cachedInput: 1.0, output: 8.0, inputLimit: 200000, outputLimit: 100000 },
  'o3-mini': { input: 1.1, cachedInput: 0.55, output: 4.4, inputLimit: 200000, outputLimit: 100000 },
  'o3-mini-high': { input: 1.1, cachedInput: 0.55, output: 4.4, inputLimit: 200000, outputLimit: 100000 },
  'o3-pro': { input: 20.0, cachedInput: 10.0, output: 80.0, inputLimit: 200000, outputLimit: 100000 },
  'o3-deep-research': { input: 10.0, cachedInput: 5.0, output: 40.0, inputLimit: 200000, outputLimit: 100000 },

  // o4 시리즈
  'o4-mini': { input: 1.1, cachedInput: 0.55, output: 4.4, inputLimit: 200000, outputLimit: 100000 },
  'o4-mini-high': { input: 1.1, cachedInput: 0.55, output: 4.4, inputLimit: 200000, outputLimit: 100000 },
  'o4-mini-deep-research': { input: 2.0, cachedInput: 1.0, output: 8.0, inputLimit: 200000, outputLimit: 100000 }
};

/**
 * Fallback 가격 정보 로드
 * @returns {Object|null} Fallback 가격 정보
 */
function loadFallbackPricing() {
  if (fallbackPricingLoaded) {
    return fallbackPricingCache;
  }

  try {
    if (fs.existsSync(FALLBACK_PRICING_PATH)) {
      const content = fs.readFileSync(FALLBACK_PRICING_PATH, 'utf8');
      const data = JSON.parse(content);
      fallbackPricingCache = data.models || {};
      console.log(`[OpenAI-Pricing] Fallback 가격 파일 로드 성공: ${Object.keys(fallbackPricingCache).length}개 모델`);
    } else {
      console.warn(`[OpenAI-Pricing] Fallback 가격 파일 없음: ${FALLBACK_PRICING_PATH}`);
      fallbackPricingCache = null;
    }
  } catch (e) {
    console.error(`[OpenAI-Pricing] Fallback 가격 파일 로드 실패: ${e.message}`);
    fallbackPricingCache = null;
  }

  fallbackPricingLoaded = true;
  return fallbackPricingCache;
}

/**
 * 모델명의 핵심 토큰 추출 (순서 무관 비교용)
 * gpt-4-turbo -> ['gpt', '4', 'turbo']
 * @param {string} modelName - 모델명
 * @returns {Set<string>} 토큰 집합
 */
function extractModelTokens(modelName) {
  return new Set(modelName.toLowerCase().split('-').filter(t => t.length > 0));
}

/**
 * 두 모델명이 동일한지 확인 (순서 무관)
 * @param {string} name1 - 모델명 1
 * @param {string} name2 - 모델명 2
 * @returns {boolean} 동일 여부
 */
function isModelNameEquivalent(name1, name2) {
  const tokens1 = extractModelTokens(name1);
  const tokens2 = extractModelTokens(name2);

  if (tokens1.size !== tokens2.size) return false;

  for (const token of tokens1) {
    if (!tokens2.has(token)) return false;
  }
  return true;
}

/**
 * Fallback에서 가격 정보 조회
 * @param {string} modelName - 정규화된 모델명
 * @returns {Object|null} 가격 정보 또는 null
 */
function getFallbackPricing(modelName) {
  const fallback = loadFallbackPricing();
  if (!fallback) return null;

  // 1단계: 정확히 일치하는 경우
  if (fallback[modelName]) {
    const p = fallback[modelName];
    return {
      input: p.input,
      output: p.output,
      inputLimit: p.inputLimit,
      outputLimit: p.outputLimit
    };
  }

  // 2단계: 순서가 다른 동일 모델 검색
  for (const [key, p] of Object.entries(fallback)) {
    if (isModelNameEquivalent(modelName, key)) {
      console.log(`[OpenAI-Pricing] 동일 모델 매칭: ${modelName} ↔ ${key}`);
      return {
        input: p.input,
        output: p.output,
        inputLimit: p.inputLimit,
        outputLimit: p.outputLimit
      };
    }
  }

  // 3단계: 부분 일치 시도 (예: gpt-4o-2024-08-06 -> gpt-4o)
  for (const [key, p] of Object.entries(fallback)) {
    if (modelName.startsWith(key)) {
      return {
        input: p.input,
        output: p.output,
        inputLimit: p.inputLimit,
        outputLimit: p.outputLimit
      };
    }
  }

  return null;
}

/**
 * 가격이 유효한지 확인 (input 또는 output이 0보다 커야 함)
 * @param {Object} pricing - 가격 정보
 * @returns {boolean} 유효 여부
 */
function isValidPricing(pricing) {
  return pricing && (pricing.input > 0 || pricing.output > 0);
}

/**
 * 모델의 가격 정보 조회
 * 1. MODEL_PRICING에서 조회 (가격이 0이면 fallback 검사)
 * 2. 없으면 Fallback 파일에서 조회
 * @param {string} modelName - 정규화된 모델명
 * @returns {Object|null} 가격 정보 또는 null
 */
function getPricing(modelName) {
  let pricing = null;

  // 1단계: MODEL_PRICING에서 정확히 일치하는 경우
  if (MODEL_PRICING[modelName]) {
    pricing = MODEL_PRICING[modelName];
    if (isValidPricing(pricing)) {
      return pricing;
    }
  }

  // 2단계: MODEL_PRICING에서 부분 일치 시도 (예: gpt-4o-2024-08-06 -> gpt-4o)
  for (const [key, pricingEntry] of Object.entries(MODEL_PRICING)) {
    if (modelName.startsWith(key)) {
      if (isValidPricing(pricingEntry)) {
        return pricingEntry;
      }
      pricing = pricingEntry; // 가격이 0이라도 기본값으로 저장
      break;
    }
  }

  // 3단계: Fallback 파일에서 조회 (가격이 0이거나 없는 경우)
  const fallbackPrice = getFallbackPricing(modelName);
  if (isValidPricing(fallbackPrice)) {
    console.log(`[OpenAI-Pricing] Fallback에서 가격 조회: ${modelName}`);
    return fallbackPrice;
  }

  // MODEL_PRICING에서 가져온 기본값 반환 (토큰 리밋 정보라도 유지)
  return pricing;
}

/**
 * OpenAI 모델 목록 조회
 * @returns {Promise<{success: boolean, models: Array, error?: string, responseTime: number}>}
 */
async function fetchModels() {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      models: [],
      error: 'OPENAI_API_KEY not configured',
      responseTime: 0
    };
  }

  return new Promise((resolve) => {
    const url = new URL(OPENAI_API_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: TIMEOUT_MS
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        if (res.statusCode === 401) {
          resolve({
            success: false,
            models: [],
            error: 'Unauthorized - Invalid API key',
            responseTime
          });
          return;
        }

        if (res.statusCode === 429) {
          resolve({
            success: false,
            models: [],
            error: 'Rate limited',
            responseTime
          });
          return;
        }

        if (res.statusCode !== 200) {
          resolve({
            success: false,
            models: [],
            error: `HTTP ${res.statusCode}`,
            responseTime
          });
          return;
        }

        try {
          const json = JSON.parse(data);
          const models = filterModels(json.data || []);
          resolve({
            success: true,
            models,
            responseTime
          });
        } catch (e) {
          resolve({
            success: false,
            models: [],
            error: `Parse error: ${e.message}`,
            responseTime
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        success: false,
        models: [],
        error: `Network error: ${e.message}`,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        models: [],
        error: 'Request timeout',
        responseTime: TIMEOUT_MS
      });
    });

    req.end();
  });
}

/**
 * 모델 필터링
 * @param {Array} rawModels - API 응답의 모델 목록
 * @returns {Array} 필터링된 모델 목록 (가격 정보 포함)
 */
function filterModels(rawModels) {
  return rawModels
    .filter((model) => {
      const id = model.id;

      // 포함 패턴 확인
      const included = INCLUDE_PATTERNS.some((pattern) => pattern.test(id));
      if (!included) return false;

      // 제외 패턴 확인
      const excluded = EXCLUDE_PATTERNS.some((pattern) => pattern.test(id));
      if (excluded) return false;

      return true;
    })
    .map((model) => {
      const normalizedName = normalizeModelName(model.id);
      const pricing = getPricing(normalizedName);

      return {
        apiModelId: model.id,
        modelName: normalizedName,
        displayName: formatDisplayName(model.id),
        ownedBy: model.owned_by,
        createdAt: model.created ? new Date(model.created * 1000).toISOString() : null,
        inputTokenLimit: pricing ? pricing.inputLimit : null,
        outputTokenLimit: pricing ? pricing.outputLimit : null
      };
    });
}

/**
 * 모델 이름 정규화
 * @param {string} apiId - API 반환 모델 ID
 * @returns {string} 정규화된 모델 이름
 */
function normalizeModelName(apiId) {
  // 날짜 접미사 제거: gpt-4-0613 -> gpt-4
  return apiId.replace(/-\d{4}(-\d{2})?(-\d{2})?$/, '');
}

/**
 * 표시 이름 생성
 * @param {string} apiId - API 반환 모델 ID
 * @returns {string} 표시 이름
 */
function formatDisplayName(apiId) {
  const normalized = normalizeModelName(apiId);

  // 특수 케이스
  const displayMap = {
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5-nano': 'GPT-5 Nano',
    'gpt-4.1': 'GPT-4.1',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
    'gpt-4.1-nano': 'GPT-4.1 Nano',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'o1': 'O1',
    'o1-mini': 'O1 Mini',
    'o1-pro': 'O1 Pro',
    'o3': 'O3',
    'o3-mini': 'O3 Mini',
    'o4-mini': 'O4 Mini'
  };

  if (displayMap[normalized]) {
    return displayMap[normalized];
  }

  // 일반 변환: gpt-4-turbo -> GPT-4 Turbo
  return normalized
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/Gpt/g, 'GPT');
}

/**
 * Fallback 캐시 초기화 (파일 갱신 후 재로드용)
 */
function reloadFallbackPricing() {
  fallbackPricingLoaded = false;
  fallbackPricingCache = null;
  return loadFallbackPricing();
}

module.exports = {
  fetchModels,
  filterModels,
  normalizeModelName,
  getPricing,
  loadFallbackPricing,
  reloadFallbackPricing,
  MODEL_PRICING,
  FALLBACK_PRICING_PATH,
  SERVICE_NAME: 'gpt'
};

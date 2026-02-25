/**
 * xAI Grok 모델 목록 API 호출 모듈
 * GET https://api.x.ai/v1/models (OpenAI 호환)
 *
 * 가격 정보 출처: https://x.ai/api
 * 마지막 업데이트: 2026-01-07
 *
 * Fallback: MODEL_PRICING에 없는 모델은 aimodel/xai-pricing.json에서 로드
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Fallback 가격 파일 경로
const FALLBACK_PRICING_PATH = path.join(__dirname, '..', '..', '..', 'aimodel', 'xai-pricing.json');

// Fallback 가격 정보 캐시
let fallbackPricingCache = null;
let fallbackPricingLoaded = false;

const XAI_API_URL = 'https://api.x.ai/v1/models';
const TIMEOUT_MS = 30000;

// 포함할 모델 패턴
const INCLUDE_PATTERNS = [
  /^grok-/
];

// 제외할 모델 패턴
const EXCLUDE_PATTERNS = [
  /embedding/i,
  /-image/i
];

/**
 * 모델별 가격 정보 (USD per 1M tokens)
 * 정규화된 모델명 기준
 */
const MODEL_PRICING = {
  // Grok 4 시리즈 (cachedInput: cached input per 1M tokens, 25% of input)
  'grok-4': { input: 3.0, cachedInput: 0.75, output: 15.0, inputLimit: 256000, outputLimit: 32768 },
  'grok-4-fast': { input: 0.2, cachedInput: 0.05, output: 0.5, inputLimit: 2000000, outputLimit: 100000 },
  'grok-4-fast-reasoning': { input: 0.2, cachedInput: 0.05, output: 0.5, inputLimit: 2000000, outputLimit: 100000 },
  'grok-4-fast-non-reasoning': { input: 0.2, cachedInput: 0.05, output: 0.5, inputLimit: 2000000, outputLimit: 100000 },
  'grok-4-1-fast': { input: 0.2, cachedInput: 0.05, output: 0.5, inputLimit: 2000000, outputLimit: 100000 },
  'grok-4-1-fast-reasoning': { input: 0.2, cachedInput: 0.05, output: 0.5, inputLimit: 2000000, outputLimit: 100000 },
  'grok-4-1-fast-non-reasoning': { input: 0.2, cachedInput: 0.05, output: 0.5, inputLimit: 2000000, outputLimit: 100000 },

  // Grok 3 시리즈
  'grok-3': { input: 3.0, cachedInput: 0.75, output: 15.0, inputLimit: 131072, outputLimit: 16384 },
  'grok-3-mini': { input: 0.3, cachedInput: 0.075, output: 0.5, inputLimit: 131072, outputLimit: 16384 },

  // Grok 2 시리즈
  'grok-2': { input: 2.0, cachedInput: 0.5, output: 10.0, inputLimit: 131072, outputLimit: 8192 },
  'grok-2-vision': { input: 2.0, cachedInput: 0.5, output: 10.0, inputLimit: 32768, outputLimit: 8192 },
  'grok-2-latest': { input: 2.0, cachedInput: 0.5, output: 10.0, inputLimit: 131072, outputLimit: 8192 },
  'grok-2-1212': { input: 2.0, cachedInput: 0.5, output: 10.0, inputLimit: 131072, outputLimit: 8192 },
  'grok-2-vision-1212': { input: 2.0, cachedInput: 0.5, output: 10.0, inputLimit: 32768, outputLimit: 8192 },
  'grok-vision-beta': { input: 2.0, cachedInput: 0.5, output: 10.0, inputLimit: 8192, outputLimit: 4096 },

  // Grok Code 시리즈
  'grok-code-fast': { input: 0.2, cachedInput: 0.05, output: 1.5, inputLimit: 131072, outputLimit: 16384 },
  'grok-code-fast-1': { input: 0.2, cachedInput: 0.05, output: 1.5, inputLimit: 131072, outputLimit: 16384 },

  // Grok 이미지/임베딩 시리즈
  'grok-2-image-1212': { input: 0.0, cachedInput: 0.0, output: 0.0, inputLimit: 4096, outputLimit: 1024 },
  'grok-embedding-small': { input: 0.0, cachedInput: 0.0, output: 0.0, inputLimit: 8192, outputLimit: 0 }
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
      console.log(`[xAI-Pricing] Fallback 가격 파일 로드 성공: ${Object.keys(fallbackPricingCache).length}개 모델`);
    } else {
      console.log('[xAI-Pricing] Fallback 가격 파일 없음:', FALLBACK_PRICING_PATH);
      fallbackPricingCache = null;
    }
  } catch (e) {
    console.error(`[xAI-Pricing] Fallback 가격 파일 로드 실패: ${e.message}`);
    fallbackPricingCache = null;
  }

  fallbackPricingLoaded = true;
  return fallbackPricingCache;
}

/**
 * 모델명의 핵심 토큰 추출 (순서 무관 비교용)
 * grok-4-fast -> ['grok', '4', 'fast']
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
 * Fallback에서 모델 가격 조회
 * @param {string} modelName - 정규화된 모델명
 * @returns {Object|null} 가격 정보 또는 null
 */
function getFallbackPricing(modelName) {
  const fallbackPricing = loadFallbackPricing();
  if (!fallbackPricing) return null;

  // 1단계: 정확히 일치
  if (fallbackPricing[modelName]) {
    return fallbackPricing[modelName];
  }

  // 2단계: 순서가 다른 동일 모델 검색
  for (const [key, pricing] of Object.entries(fallbackPricing)) {
    if (isModelNameEquivalent(modelName, key)) {
      console.log(`[xAI-Pricing] 동일 모델 매칭: ${modelName} ↔ ${key}`);
      return pricing;
    }
  }

  // 3단계: 부분 일치 시도
  for (const [key, pricing] of Object.entries(fallbackPricing)) {
    if (modelName.startsWith(key)) {
      return pricing;
    }
  }

  return null;
}

/**
 * Fallback 가격 캐시 리로드
 */
function reloadFallbackPricing() {
  fallbackPricingLoaded = false;
  fallbackPricingCache = null;
  return loadFallbackPricing();
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
 * 모델의 가격 정보 조회 (3단계)
 * 1. MODEL_PRICING에서 정확히 일치 (가격이 0이면 fallback 검사)
 * 2. MODEL_PRICING에서 부분 일치
 * 3. Fallback 파일에서 조회
 * @param {string} modelName - 정규화된 모델명
 * @returns {Object|null} 가격 정보 또는 null
 */
function getPricing(modelName) {
  let pricing = null;

  // 1단계: MODEL_PRICING에서 정확히 일치
  if (MODEL_PRICING[modelName]) {
    pricing = MODEL_PRICING[modelName];
    if (isValidPricing(pricing)) {
      return pricing;
    }
  }

  // 2단계: MODEL_PRICING에서 부분 일치 시도 (예: grok-4-0709 -> grok-4)
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
    console.log(`[xAI-Pricing] Fallback에서 가격 조회: ${modelName}`);
    return fallbackPrice;
  }

  // MODEL_PRICING에서 가져온 기본값 반환 (토큰 리밋 정보라도 유지)
  return pricing;
}

/**
 * xAI Grok 모델 목록 조회
 * @returns {Promise<{success: boolean, models: Array, error?: string, responseTime: number}>}
 */
async function fetchModels() {
  const startTime = Date.now();
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      models: [],
      error: 'XAI_API_KEY not configured',
      responseTime: 0
    };
  }

  return new Promise((resolve) => {
    const url = new URL(XAI_API_URL);

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
  // 날짜 접미사 제거
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
    'grok-4': 'Grok 4',
    'grok-4-fast': 'Grok 4 Fast',
    'grok-4-1-fast': 'Grok 4.1 Fast',
    'grok-2': 'Grok 2',
    'grok-2-vision': 'Grok 2 Vision',
    'grok-code-fast': 'Grok Code Fast'
  };

  if (displayMap[normalized]) {
    return displayMap[normalized];
  }

  // 일반 변환
  return normalized
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/Grok/g, 'Grok');
}

module.exports = {
  fetchModels,
  filterModels,
  normalizeModelName,
  getPricing,
  MODEL_PRICING,
  SERVICE_NAME: 'grok',
  // Fallback 관련
  reloadFallbackPricing,
  getFallbackPricing
};

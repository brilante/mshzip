/**
 * Anthropic Claude 모델 목록 API 호출 모듈
 * GET https://api.anthropic.com/v1/models
 *
 * 가격 정보 출처: https://www.anthropic.com/pricing
 * 마지막 업데이트: 2026-01-07
 *
 * Fallback: MODEL_PRICING에 없는 모델은 aimodel/anthropic-pricing.json에서 로드
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Fallback 가격 파일 경로
const FALLBACK_PRICING_PATH = path.join(__dirname, '..', '..', '..', 'aimodel', 'anthropic-pricing.json');

// Fallback 가격 정보 캐시
let fallbackPricingCache = null;
let fallbackPricingLoaded = false;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/models';
const ANTHROPIC_VERSION = '2023-06-01';
const TIMEOUT_MS = 30000;

// 포함할 모델 패턴
const INCLUDE_PATTERNS = [
  /^claude-/
];

// 제외할 모델 패턴
const EXCLUDE_PATTERNS = [
  /-instant/i
];

/**
 * 모델별 가격 정보 (USD per 1M tokens)
 * 정규화된 모델명 기준
 */
const MODEL_PRICING = {
  // Claude 4.6 시리즈 (최신) (cachedInput: cache_read 10%, cacheWrite: cache_creation 125%)
  'claude-opus-4-6': { input: 5.0, cachedInput: 0.5, cacheWrite: 6.25, output: 25.0, inputLimit: 200000, outputLimit: 32768 },

  // Claude 4.5 시리즈
  'claude-opus-4-5': { input: 5.0, cachedInput: 0.5, cacheWrite: 6.25, output: 25.0, inputLimit: 200000, outputLimit: 32768 },
  'claude-sonnet-4-5': { input: 3.0, cachedInput: 0.3, cacheWrite: 3.75, output: 15.0, inputLimit: 200000, outputLimit: 64000 },
  'claude-haiku-4-5': { input: 1.0, cachedInput: 0.1, cacheWrite: 1.25, output: 5.0, inputLimit: 200000, outputLimit: 32768 },

  // Claude 4.1 시리즈
  'claude-opus-4-1': { input: 15.0, cachedInput: 1.5, cacheWrite: 18.75, output: 75.0, inputLimit: 200000, outputLimit: 32768 },

  // Claude 4 시리즈
  'claude-opus-4': { input: 15.0, cachedInput: 1.5, cacheWrite: 18.75, output: 75.0, inputLimit: 200000, outputLimit: 32768 },
  'claude-sonnet-4': { input: 3.0, cachedInput: 0.3, cacheWrite: 3.75, output: 15.0, inputLimit: 200000, outputLimit: 64000 },

  // Claude 3.7 시리즈
  'claude-sonnet-3-7': { input: 3.0, cachedInput: 0.3, cacheWrite: 3.75, output: 15.0, inputLimit: 200000, outputLimit: 64000 },
  'claude-3-7-sonnet': { input: 3.0, cachedInput: 0.3, cacheWrite: 3.75, output: 15.0, inputLimit: 200000, outputLimit: 64000 },

  // Claude 3.5 시리즈
  'claude-3-5-sonnet': { input: 3.0, cachedInput: 0.3, cacheWrite: 3.75, output: 15.0, inputLimit: 200000, outputLimit: 8192 },
  'claude-3-5-haiku': { input: 0.8, cachedInput: 0.08, cacheWrite: 1.0, output: 4.0, inputLimit: 200000, outputLimit: 8192 },
  'claude-haiku-3-5': { input: 0.8, cachedInput: 0.08, cacheWrite: 1.0, output: 4.0, inputLimit: 200000, outputLimit: 8192 },

  // Claude 3 시리즈 (레거시)
  'claude-3-opus': { input: 15.0, cachedInput: 1.5, cacheWrite: 18.75, output: 75.0, inputLimit: 200000, outputLimit: 4096 },
  'claude-3-sonnet': { input: 3.0, cachedInput: 0.3, cacheWrite: 3.75, output: 15.0, inputLimit: 200000, outputLimit: 4096 },
  'claude-3-haiku': { input: 0.25, cachedInput: 0.025, cacheWrite: 0.3125, output: 1.25, inputLimit: 200000, outputLimit: 4096 },
  'claude-haiku-3': { input: 0.25, cachedInput: 0.025, cacheWrite: 0.3125, output: 1.25, inputLimit: 200000, outputLimit: 4096 }
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
      console.log(`[Anthropic-Pricing] Fallback 가격 파일 로드 성공: ${Object.keys(fallbackPricingCache).length}개 모델`);
    } else {
      console.log('[Anthropic-Pricing] Fallback 가격 파일 없음:', FALLBACK_PRICING_PATH);
      fallbackPricingCache = null;
    }
  } catch (e) {
    console.error(`[Anthropic-Pricing] Fallback 가격 파일 로드 실패: ${e.message}`);
    fallbackPricingCache = null;
  }

  fallbackPricingLoaded = true;
  return fallbackPricingCache;
}

/**
 * 모델명의 핵심 토큰 추출 (순서 무관 비교용)
 * claude-3-opus -> ['claude', '3', 'opus']
 * claude-opus-3 -> ['claude', 'opus', '3']
 * @param {string} modelName - 모델명
 * @returns {Set<string>} 토큰 집합
 */
function extractModelTokens(modelName) {
  return new Set(modelName.toLowerCase().split('-').filter(t => t.length > 0));
}

/**
 * 두 모델명이 동일한지 확인 (순서 무관)
 * claude-3-opus와 claude-opus-3는 동일
 * @param {string} name1 - 모델명 1
 * @param {string} name2 - 모델명 2
 * @returns {boolean} 동일 여부
 */
function isModelNameEquivalent(name1, name2) {
  const tokens1 = extractModelTokens(name1);
  const tokens2 = extractModelTokens(name2);

  // 토큰 개수가 다르면 다른 모델
  if (tokens1.size !== tokens2.size) return false;

  // 모든 토큰이 일치하는지 확인
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

  // 2단계: 순서가 다른 동일 모델 검색 (claude-3-opus ↔ claude-opus-3)
  for (const [key, pricing] of Object.entries(fallbackPricing)) {
    if (isModelNameEquivalent(modelName, key)) {
      console.log(`[Anthropic-Pricing] 동일 모델 매칭: ${modelName} ↔ ${key}`);
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

  // 2단계: MODEL_PRICING에서 부분 일치 시도 (예: claude-sonnet-4-20250514 -> claude-sonnet-4)
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
    console.log(`[Anthropic-Pricing] Fallback에서 가격 조회: ${modelName}`);
    return fallbackPrice;
  }

  // MODEL_PRICING에서 가져온 기본값 반환 (토큰 리밋 정보라도 유지)
  return pricing;
}

/**
 * Anthropic 모델 목록 조회 (페이지네이션 지원)
 * @returns {Promise<{success: boolean, models: Array, error?: string, responseTime: number}>}
 */
async function fetchModels() {
  const startTime = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      models: [],
      error: 'ANTHROPIC_API_KEY not configured',
      responseTime: 0
    };
  }

  const allModels = [];
  let hasMore = true;
  let afterId = null;

  while (hasMore) {
    const result = await fetchPage(apiKey, afterId);

    if (!result.success) {
      return {
        success: false,
        models: [],
        error: result.error,
        responseTime: Date.now() - startTime
      };
    }

    allModels.push(...result.models);
    hasMore = result.hasMore;
    afterId = result.lastId;

    // 무한 루프 방지
    if (allModels.length > 100) break;
  }

  return {
    success: true,
    models: filterModels(allModels),
    responseTime: Date.now() - startTime
  };
}

/**
 * 한 페이지 조회
 * @param {string} apiKey - API 키
 * @param {string|null} afterId - 페이지네이션 커서
 * @returns {Promise<Object>}
 */
function fetchPage(apiKey, afterId) {
  return new Promise((resolve) => {
    const url = new URL(ANTHROPIC_API_URL);
    if (afterId) {
      url.searchParams.set('after_id', afterId);
    }
    url.searchParams.set('limit', '50');

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
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
        if (res.statusCode === 401) {
          resolve({ success: false, error: 'Unauthorized - Invalid API key' });
          return;
        }

        if (res.statusCode === 429) {
          resolve({ success: false, error: 'Rate limited' });
          return;
        }

        if (res.statusCode !== 200) {
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
          return;
        }

        try {
          const json = JSON.parse(data);
          const models = json.data || [];
          const lastId = models.length > 0 ? models[models.length - 1].id : null;

          resolve({
            success: true,
            models,
            hasMore: json.has_more || false,
            lastId
          });
        } catch (e) {
          resolve({ success: false, error: `Parse error: ${e.message}` });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, error: `Network error: ${e.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
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
        displayName: model.display_name || formatDisplayName(model.id),
        createdAt: model.created_at,
        inputTokenLimit: pricing ? pricing.inputLimit : null,
        outputTokenLimit: pricing ? pricing.outputLimit : null
      };
    });
}

/**
 * 모델 이름 정규화 (날짜 접미사 제거)
 * claude-sonnet-4-20250514 -> claude-sonnet-4
 * claude-opus-4-5-20251101 -> claude-opus-4-5
 * @param {string} apiId - API 반환 모델 ID
 * @returns {string} 정규화된 모델 이름
 */
function normalizeModelName(apiId) {
  // 날짜 접미사 제거: -YYYYMMDD
  return apiId.replace(/-\d{8}$/, '');
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
    'claude-opus-4-6': 'Claude Opus 4.6',
    'claude-opus-4-5': 'Claude Opus 4.5',
    'claude-opus-4-1': 'Claude Opus 4.1',
    'claude-opus-4': 'Claude Opus 4',
    'claude-sonnet-4-5': 'Claude Sonnet 4.5',
    'claude-sonnet-4': 'Claude Sonnet 4',
    'claude-haiku-4-5': 'Claude Haiku 4.5',
    'claude-haiku-3-5': 'Claude Haiku 3.5',
    'claude-haiku-3': 'Claude Haiku 3'
  };

  if (displayMap[normalized]) {
    return displayMap[normalized];
  }

  // 일반 변환
  return normalized
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  fetchModels,
  filterModels,
  normalizeModelName,
  SERVICE_NAME: 'claude'
};
